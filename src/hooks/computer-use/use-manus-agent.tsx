
import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useManusAdapter, ManusAction, actionToJson } from "./manus-adapter";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

export type ManusEnvironment = "browser" | "desktop" | "custom";

export interface ManusSession {
  id: string;
  task: string;
  environment: ManusEnvironment;
  currentUrl?: string;
  status: "active" | "completed" | "failed";
}

export interface ManusActionHistory {
  id: string;
  action: ManusAction;
  reasoning: string;
  timestamp: Date;
  screenshot?: string;
  status: "pending" | "executed" | "failed";
}

export const useManusAgent = () => {
  const [taskDescription, setTaskDescription] = useState<string>("");
  const [environment, setEnvironment] = useState<ManusEnvironment>("browser");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string | null>("https://www.google.com");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [currentActions, setCurrentActions] = useState<ManusAction[]>([]);
  const [actionHistory, setActionHistory] = useState<ManusActionHistory[]>([]);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [reasoning, setReasoning] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  
  const { sendToManus, formatAction, actionToJson, normalizeUrl } = useManusAdapter();
  
  // Get user credits
  const { data: userCredits, refetch: refetchCredits } = useQuery({
    queryKey: ["userCredits"],
    queryFn: async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data, error } = await supabase
          .from("user_credits")
          .select("credits_remaining")
          .eq("user_id", user.id)
          .single();

        if (error) throw error;
        return data;
      } catch (error) {
        console.error("Error fetching user credits:", error);
        return { credits_remaining: 0 };
      }
    },
  });
  
  // Capture screenshot of the browser view
  const captureScreenshot = useCallback(async () => {
    if (typeof document === 'undefined') return null;
    
    try {
      const html2canvas = (await import('html2canvas')).default;
      
      const element = document.querySelector('.browser-view-container');
      
      if (!element) {
        console.error('Could not find browser view container for screenshot');
        return null;
      }
      
      console.log('Capturing screenshot...');
      
      const canvas = await html2canvas(element as HTMLElement, {
        useCORS: true,
        allowTaint: true,
        logging: false,
        scale: 1.5,
        backgroundColor: '#FFFFFF',
      });
      
      const dataUrl = canvas.toDataURL('image/png');
      console.log('Screenshot captured successfully');
      setScreenshot(dataUrl);
      return dataUrl;
    } catch (error) {
      console.error('Error capturing screenshot:', error);
      const fallback = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      setScreenshot(fallback);
      return fallback;
    }
  }, []);
  
  // Fetch action history from the database
  const fetchActionHistory = useCallback(async () => {
    if (!sessionId) return;
    
    try {
      const { data, error } = await supabase
        .from("manus_action_history")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      
      // Transform data to match our ManusActionHistory type
      const formattedHistory: ManusActionHistory[] = data ? data.map(item => ({
        id: item.id,
        action: item.action as ManusAction,
        reasoning: item.reasoning,
        timestamp: new Date(item.created_at),
        screenshot: item.screenshot,
        status: item.status as "pending" | "executed" | "failed"
      })) : [];
      
      setActionHistory(formattedHistory);
    } catch (error) {
      console.error("Error fetching action history:", error);
      toast.error("Failed to load action history");
    }
  }, [sessionId]);
  
  // Start a new session
  const startSession = useCallback(async () => {
    if (!taskDescription.trim()) {
      toast.error("Please enter a task description");
      return;
    }
    
    if (!userCredits || userCredits.credits_remaining < 1) {
      toast.error("You need at least 1 credit to use the Manus Agent");
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    
    try {
      const { data: { user }, error: authCheckError } = await supabase.auth.getUser();
      if (authCheckError || !user) {
        setError("You need to be signed in to use the Manus Agent");
        toast.error("Authentication required. Please sign in to continue.");
        return;
      }
      
      // Capture initial screenshot for browser environment
      let initialScreenshot = null;
      if (environment === "browser") {
        initialScreenshot = await captureScreenshot();
      }
      
      // Create session in database
      const { data: sessionData, error: sessionError } = await supabase
        .from("manus_sessions")
        .insert({
          user_id: user.id,
          task: taskDescription,
          environment: environment,
          current_url: currentUrl ? normalizeUrl(currentUrl) : null,
          status: "active"
        })
        .select()
        .single();
      
      if (sessionError) {
        throw new Error(sessionError.message);
      }
      
      // Send initial request to Manus API
      const manusResponse = await sendToManus({
        task: taskDescription,
        environment: environment,
        screenshot: initialScreenshot || undefined,
        current_url: currentUrl ? normalizeUrl(currentUrl) : undefined
      });
      
      if (!manusResponse) {
        throw new Error("Failed to get response from Manus API");
      }
      
      // Store the session ID and set the current actions
      setSessionId(sessionData.id);
      setCurrentActions(manusResponse.actions || []);
      setReasoning(manusResponse.reasoning || "");
      
      // Save actions to the database
      if (manusResponse.actions && manusResponse.actions.length > 0) {
        for (const action of manusResponse.actions) {
          await supabase
            .from("manus_action_history")
            .insert({
              session_id: sessionData.id,
              action: actionToJson(action),
              reasoning: manusResponse.reasoning,
              status: "pending",
              screenshot: initialScreenshot
            });
        }
      }
      
      await fetchActionHistory();
      refetchCredits();
      
      toast.success("Session started successfully");
    } catch (error) {
      console.error("Error starting session:", error);
      setError(error instanceof Error ? error.message : "Failed to start session");
      toast.error(error instanceof Error ? error.message : "Failed to start session");
    } finally {
      setIsProcessing(false);
    }
  }, [
    taskDescription, 
    environment, 
    currentUrl, 
    userCredits, 
    captureScreenshot, 
    sendToManus, 
    fetchActionHistory, 
    refetchCredits,
    actionToJson,
    normalizeUrl
  ]);
  
  // Execute the next action
  const executeAction = useCallback(async () => {
    if (!sessionId || currentActions.length === 0) {
      toast.error("No actions to execute");
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Get the first action from the queue
      const actionToExecute = currentActions[0];
      
      // Handle navigate actions separately (they're handled by the UI directly)
      if (actionToExecute.type === "navigate" && actionToExecute.url) {
        console.log("Navigation action will be handled by the UI:", actionToExecute.url);
        // The navigation itself happens in the UI component
        setCurrentUrl(normalizeUrl(actionToExecute.url));
      }
      
      // Capture current screenshot after navigation
      const currentScreenshot = await captureScreenshot();
      
      // Update action status in database
      const { data: actionData, error: actionError } = await supabase
        .from("manus_action_history")
        .update({
          status: "executed",
          executed_at: new Date().toISOString(),
          screenshot: currentScreenshot
        })
        .eq("session_id", sessionId)
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(1)
        .select();
      
      if (actionError) {
        throw new Error(actionError.message);
      }
      
      // Remove the executed action from the queue
      const remainingActions = currentActions.slice(1);
      setCurrentActions(remainingActions);
      
      // If there are no more actions, get the next set from Manus
      if (remainingActions.length === 0) {
        // Get current URL (which might have changed due to the action)
        const updatedUrl = currentUrl;
        
        // Send request to Manus API for next actions
        const manusResponse = await sendToManus({
          task: taskDescription,
          environment: environment,
          screenshot: currentScreenshot || undefined,
          current_url: updatedUrl ? normalizeUrl(updatedUrl) : undefined,
          previous_actions: [actionToExecute]
        });
        
        if (!manusResponse) {
          throw new Error("Failed to get response from Manus API");
        }
        
        // Set the new actions and reasoning
        setCurrentActions(manusResponse.actions || []);
        setReasoning(manusResponse.reasoning || "");
        
        // Save new actions to the database
        if (manusResponse.actions && manusResponse.actions.length > 0) {
          for (const action of manusResponse.actions) {
            await supabase
              .from("manus_action_history")
              .insert({
                session_id: sessionId,
                action: actionToJson(action),
                reasoning: manusResponse.reasoning,
                status: "pending"
              });
          }
        } else {
          // If no more actions, mark the session as completed
          await supabase
            .from("manus_sessions")
            .update({
              status: "completed",
              completed_at: new Date().toISOString()
            })
            .eq("id", sessionId);
          
          toast.success("Task completed successfully");
        }
      }
      
      // Refresh action history
      await fetchActionHistory();
    } catch (error) {
      console.error("Error executing action:", error);
      setError(error instanceof Error ? error.message : "Failed to execute action");
      toast.error(error instanceof Error ? error.message : "Failed to execute action");
    } finally {
      setIsProcessing(false);
    }
  }, [
    sessionId, 
    currentActions, 
    taskDescription, 
    environment, 
    currentUrl, 
    captureScreenshot, 
    sendToManus, 
    fetchActionHistory,
    actionToJson,
    normalizeUrl
  ]);
  
  // Clear the current session
  const clearSession = useCallback(() => {
    setSessionId(null);
    setCurrentActions([]);
    setActionHistory([]);
    setReasoning("");
    setScreenshot(null);
    setError(null);
    setCurrentUrl("https://www.google.com");
    toast.info("Session ended");
  }, []);
  
  // Load session and action history on component mount
  useEffect(() => {
    if (sessionId) {
      fetchActionHistory();
    }
  }, [sessionId, fetchActionHistory]);
  
  return {
    taskDescription,
    setTaskDescription,
    environment,
    setEnvironment,
    sessionId,
    isProcessing,
    currentActions,
    startSession,
    executeAction,
    clearSession,
    currentUrl,
    setCurrentUrl,
    actionHistory,
    userCredits,
    screenshot,
    setScreenshot,
    captureScreenshot,
    reasoning,
    error,
    formatAction
  };
};
