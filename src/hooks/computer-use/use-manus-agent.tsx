import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useManusAdapter, ManusAction, actionToJson, jsonToAction } from "./manus-adapter";
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
  const [retryCount, setRetryCount] = useState<number>(0);
  const [isEmbeddingBlocked, setIsEmbeddingBlocked] = useState<boolean>(false);
  
  const { 
    sendToManus, 
    formatAction, 
    actionToJson, 
    jsonToAction, 
    normalizeUrl, 
    isSupportedForIframe,
    isLikelyToBlockIframe 
  } = useManusAdapter();
  
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
  
  const captureScreenshot = useCallback(async () => {
    if (typeof document === 'undefined') return null;
    
    try {
      console.log('Starting screenshot capture...');
      const html2canvas = (await import('html2canvas')).default;
      
      // Find the browser view container
      const element = document.querySelector('.browser-view-container');
      
      if (!element) {
        console.error('Could not find browser view container for screenshot');
        
        // Try to find iframe directly as fallback
        const iframe = document.querySelector('iframe[title="Browser View"]');
        if (iframe) {
          console.log('Found iframe directly, using it for screenshot');
          const canvas = await html2canvas(iframe as HTMLElement, {
            useCORS: true,
            allowTaint: true,
            logging: true,
            scale: 1.5,
            backgroundColor: '#FFFFFF',
          });
          
          const dataUrl = canvas.toDataURL('image/png');
          console.log('Screenshot captured from iframe directly');
          setScreenshot(dataUrl);
          return dataUrl;
        }
        
        // If still no element found, return a simple fallback
        const fallback = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
        setScreenshot(fallback);
        return fallback;
      }
      
      console.log('Browser view container found, dimensions:', element.clientWidth, 'x', element.clientHeight);
      
      // Wait a moment to ensure content is loaded
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Take screenshot with improved settings
      const canvas = await html2canvas(element as HTMLElement, {
        useCORS: true,
        allowTaint: true,
        logging: false,
        scale: 1.5,
        backgroundColor: '#FFFFFF',
        ignoreElements: (element) => {
          // Ignore error messages and overlays that might be showing
          return element.classList.contains('absolute') && 
                 (element.textContent?.includes('Error') || 
                  element.textContent?.includes('Failed to load'));
        }
      });
      
      const dataUrl = canvas.toDataURL('image/png');
      console.log('Screenshot captured successfully, size:', dataUrl.length);
      setScreenshot(dataUrl);
      return dataUrl;
    } catch (error) {
      console.error('Error capturing screenshot:', error);
      const fallback = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      setScreenshot(fallback);
      return fallback;
    }
  }, [setScreenshot]);
  
  const fetchActionHistory = useCallback(async () => {
    if (!sessionId) return;
    
    try {
      const { data, error } = await supabase
        .from("manus_action_history")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      
      const formattedHistory: ManusActionHistory[] = data ? data.map(item => {
        const actionData = jsonToAction(item.action);
        
        if (!actionData) {
          console.error("Invalid action data in history:", item.action);
          return null;
        }
        
        return {
          id: item.id,
          action: actionData,
          reasoning: item.reasoning,
          timestamp: new Date(item.created_at),
          screenshot: item.screenshot,
          status: item.status as "pending" | "executed" | "failed"
        };
      }).filter(Boolean) as ManusActionHistory[] : [];
      
      setActionHistory(formattedHistory);
    } catch (error) {
      console.error("Error fetching action history:", error);
      toast.error("Failed to load action history");
    }
  }, [sessionId, jsonToAction]);
  
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
    setRetryCount(0);
    
    try {
      const { data: { user }, error: authCheckError } = await supabase.auth.getUser();
      if (authCheckError || !user) {
        setError("You need to be signed in to use the Manus Agent");
        toast.error("Authentication required. Please sign in to continue.");
        return;
      }
      
      let initialScreenshot = null;
      if (environment === "browser") {
        initialScreenshot = await captureScreenshot();
        // If screenshot fails, retry once
        if (!initialScreenshot || initialScreenshot.length < 1000) {
          console.log("Initial screenshot failed or too small, retrying...");
          await new Promise(resolve => setTimeout(resolve, 1000));
          initialScreenshot = await captureScreenshot();
        }
      }
      
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
      
      // Check if the URL is known to be iframe-friendly or likely to block
      const urlSupportsIframe = currentUrl ? isSupportedForIframe(currentUrl) : true;
      const urlLikelyToBlock = currentUrl ? isLikelyToBlockIframe(currentUrl) : false;
      
      const manusResponse = await sendToManus({
        task: taskDescription,
        environment: environment,
        screenshot: initialScreenshot || undefined,
        current_url: currentUrl ? normalizeUrl(currentUrl) : undefined,
        iframe_blocked: isEmbeddingBlocked || urlLikelyToBlock || !urlSupportsIframe
      });
      
      if (!manusResponse) {
        throw new Error("Failed to get response from Manus API");
      }
      
      setSessionId(sessionData.id);
      
      // If we know iframe embedding is blocked, consider converting navigate actions to openNewTab
      let adaptedActions = manusResponse.actions || [];
      if ((isEmbeddingBlocked || urlLikelyToBlock) && adaptedActions.length > 0) {
        adaptedActions = adaptedActions.map(action => {
          if (action.type === "navigate" && action.url) {
            return {
              ...action,
              type: "openNewTab"
            };
          }
          return action;
        });
      }
      
      setCurrentActions(adaptedActions);
      setReasoning(manusResponse.reasoning || "");
      
      if (adaptedActions.length > 0) {
        for (const action of adaptedActions) {
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
      } else {
        // If no actions were returned, log this as a completed action with reasoning
        await supabase
          .from("manus_action_history")
          .insert({
            session_id: sessionData.id,
            action: actionToJson({ type: "analysis" }),
            reasoning: manusResponse.reasoning,
            status: "executed",
            screenshot: initialScreenshot
          });
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
    normalizeUrl,
    isEmbeddingBlocked,
    isSupportedForIframe,
    isLikelyToBlockIframe
  ]);
  
  const executeAction = useCallback(async () => {
    if (!sessionId || currentActions.length === 0) {
      toast.error("No actions to execute");
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const actionToExecute = currentActions[0];
      
      // Handle navigate and openNewTab actions directly in UI layer
      if ((actionToExecute.type === "navigate" || actionToExecute.type === "openNewTab") && actionToExecute.url) {
        console.log(`${actionToExecute.type} action will be handled by the UI:`, actionToExecute.url);
        const normalizedUrl = normalizeUrl(actionToExecute.url);
        
        if (actionToExecute.type === "navigate") {
          // Check if URL is likely to block iframe embedding
          const likelyToBlock = isLikelyToBlockIframe(normalizedUrl);
          if (likelyToBlock && !isEmbeddingBlocked) {
            console.log(`URL ${normalizedUrl} is likely to block iframe embedding, setting flag`);
            setIsEmbeddingBlocked(true);
          }
          
          setCurrentUrl(normalizedUrl);
        }
        // The UI component will use this URL to update the iframe or open in new tab
      }
      
      // Wait a moment to ensure UI updates have been applied
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const currentScreenshot = await captureScreenshot();
      
      // If screenshot fails, retry once with delay
      if (!currentScreenshot || currentScreenshot.length < 1000) {
        console.log("Screenshot failed or too small, retrying after delay...");
        await new Promise(resolve => setTimeout(resolve, 2000));
        const retryScreenshot = await captureScreenshot();
        if (retryScreenshot && retryScreenshot.length > 1000) {
          console.log("Retry screenshot successful");
        }
      }
      
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
      
      const remainingActions = currentActions.slice(1);
      setCurrentActions(remainingActions);
      
      if (remainingActions.length === 0) {
        const updatedUrl = currentUrl;
        
        // Wait a moment to ensure navigation has completed
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Take a fresh screenshot after navigation
        const navigationScreenshot = await captureScreenshot();
        
        // Check URL iframe compatibility for next actions
        const urlSupportsIframe = updatedUrl ? isSupportedForIframe(updatedUrl) : true;
        const urlLikelyToBlock = updatedUrl ? isLikelyToBlockIframe(updatedUrl) : false;
        
        const manusResponse = await sendToManus({
          task: taskDescription,
          environment: environment,
          screenshot: navigationScreenshot || currentScreenshot || undefined,
          current_url: updatedUrl ? normalizeUrl(updatedUrl) : undefined,
          previous_actions: [actionToExecute],
          iframe_blocked: isEmbeddingBlocked || urlLikelyToBlock || !urlSupportsIframe
        });
        
        if (!manusResponse) {
          throw new Error("Failed to get response from Manus API");
        }
        
        // If we know iframe embedding is blocked, consider converting navigate actions to openNewTab
        let adaptedActions = manusResponse.actions || [];
        if ((isEmbeddingBlocked || urlLikelyToBlock) && adaptedActions.length > 0) {
          adaptedActions = adaptedActions.map(action => {
            if (action.type === "navigate" && action.url) {
              return {
                ...action,
                type: "openNewTab"
              };
            }
            return action;
          });
        }
        
        setCurrentActions(adaptedActions);
        setReasoning(manusResponse.reasoning || "");
        
        if (adaptedActions.length > 0) {
          for (const action of adaptedActions) {
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
      
      await fetchActionHistory();
      setRetryCount(0);
    } catch (error) {
      console.error("Error executing action:", error);
      setError(error instanceof Error ? error.message : "Failed to execute action");
      toast.error(error instanceof Error ? error.message : "Failed to execute action");
      
      // Implement retry mechanism for failed actions
      if (retryCount < 2) {
        setRetryCount(prev => prev + 1);
        toast.info(`Action failed. Retrying (${retryCount + 1}/3)...`);
        
        // Wait before retrying
        setTimeout(() => {
          executeAction();
        }, 3000);
        return;
      } else {
        // Mark the action as failed after max retries
        if (sessionId) {
          await supabase
            .from("manus_action_history")
            .update({
              status: "failed",
              executed_at: new Date().toISOString()
            })
            .eq("session_id", sessionId)
            .eq("status", "pending")
            .order("created_at", { ascending: true })
            .limit(1);
            
          // Reset retry count and move to next action
          setRetryCount(0);
          setCurrentActions(currentActions.slice(1));
          await fetchActionHistory();
        }
      }
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
    normalizeUrl,
    retryCount,
    isEmbeddingBlocked,
    isSupportedForIframe,
    isLikelyToBlockIframe
  ]);
  
  const clearSession = useCallback(() => {
    setSessionId(null);
    setCurrentActions([]);
    setActionHistory([]);
    setReasoning("");
    setScreenshot(null);
    setError(null);
    setCurrentUrl("https://www.google.com");
    setRetryCount(0);
    setIsEmbeddingBlocked(false);
    toast.info("Session ended");
  }, []);
  
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
    formatAction,
    isEmbeddingBlocked,
    setIsEmbeddingBlocked,
    isLikelyToBlockIframe
  };
};
