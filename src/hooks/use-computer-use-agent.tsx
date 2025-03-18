import { useState, useCallback, useEffect } from "react";
import { useManusAdapter, ManusAction, actionToJson, jsonToAction } from "@/hooks/computer-use/manus-adapter";
import { ComputerUseOutput, SafetyCheck, ComputerAction } from "@/types/computer-use";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Environment = "browser" | "mac" | "windows" | "ubuntu";

export const useComputerUseAgent = () => {
  const [taskDescription, setTaskDescription] = useState<string>("");
  const [environment, setEnvironment] = useState<Environment>("browser");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [currentOutput, setCurrentOutput] = useState<ComputerUseOutput>([]);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [currentCallId, setCurrentCallId] = useState<string | null>(null);
  const [pendingSafetyChecks, setPendingSafetyChecks] = useState<SafetyCheck[]>([]);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [actionHistory, setActionHistory] = useState<any[]>([]);
  const [previousActions, setPreviousActions] = useState<ManusAction[]>([]);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [authError, setAuthError] = useState<string | null>(null);
  
  const { sendToManus, actionToJson, jsonToAction } = useManusAdapter();
  
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
  
  const fetchActionHistory = useCallback(async () => {
    if (!sessionId) return;
    
    try {
      const { data, error } = await supabase
        .from("computer_automation_actions")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      
      const transformedData = data?.map(item => ({
        ...item,
        action_details: jsonToAction(item.action_details) || {} 
      }));
      
      setActionHistory(transformedData || []);
    } catch (error) {
      console.error("Error fetching action history:", error);
      toast.error("Failed to load action history");
    }
  }, [sessionId, jsonToAction]);
  
  useEffect(() => {
    if (sessionId) {
      fetchActionHistory();
    }
  }, [sessionId, fetchActionHistory]);
  
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
  
  const convertManusResponseToOutput = useCallback((response: any, actionId?: string): ComputerUseOutput => {
    const output: ComputerUseOutput = [];
    
    if (response.reasoning) {
      output.push({
        type: "reasoning",
        id: actionId || crypto.randomUUID(),
        summary: [{
          type: "summary_text",
          text: response.reasoning
        }]
      });
    }
    
    if (response.actions && response.actions.length > 0) {
      const action = response.actions[0];
      
      const computerAction: ComputerAction = {
        type: action.type,
      };
      
      if (action.x !== undefined) computerAction.x = action.x;
      if (action.y !== undefined) computerAction.y = action.y;
      if (action.button !== undefined) computerAction.button = action.button;
      if (action.text !== undefined) computerAction.text = action.text;
      if (action.keys !== undefined) computerAction.keys = action.keys;
      if (action.url !== undefined) computerAction.url = action.url;
      
      output.push({
        type: "computer_call",
        id: actionId || crypto.randomUUID(),
        call_id: actionId || crypto.randomUUID(),
        action: computerAction,
        pending_safety_checks: [],
        status: "ready"
      });
    }
    
    return output;
  }, []);
  
  const startSession = useCallback(async () => {
    if (!taskDescription.trim()) {
      toast.error("Please enter a task description");
      return;
    }
    
    if (!userCredits || userCredits.credits_remaining < 1) {
      toast.error("You need at least 1 credit to use the Computer Agent");
      return;
    }
    
    setIsProcessing(true);
    setAuthError(null);
    setPreviousActions([]);
    
    try {
      const { data: { user }, error: authCheckError } = await supabase.auth.getUser();
      if (authCheckError || !user) {
        setAuthError("You need to be signed in to use the Computer Agent");
        toast.error("Authentication required. Please sign in to continue.");
        return;
      }
      
      let initialScreenshot = null;
      if (environment === "browser") {
        initialScreenshot = await captureScreenshot();
      }
      
      const { data: sessionData, error: sessionError } = await supabase
        .from("computer_automation_sessions")
        .insert({
          user_id: user.id,
          task_description: taskDescription,
          environment: environment,
          status: "active"
        })
        .select()
        .single();
      
      if (sessionError) {
        throw new Error(sessionError.message);
      }
      
      const manusResponse = await sendToManus({
        task: taskDescription,
        environment: environment,
        screenshot: initialScreenshot || undefined,
        current_url: currentUrl || undefined
      });
      
      if (!manusResponse) {
        throw new Error("Failed to get response from Manus API");
      }
      
      setSessionId(sessionData.id);
      const output = convertManusResponseToOutput(manusResponse);
      setCurrentOutput(output);
      
      const computerCall = output.find(item => item.type === "computer_call");
      if (computerCall && computerCall.type === "computer_call") {
        setCurrentCallId(computerCall.call_id);
        setPendingSafetyChecks(computerCall.pending_safety_checks || []);
      }
      
      if (manusResponse.actions && manusResponse.actions.length > 0) {
        const action = manusResponse.actions[0];
        
        await supabase
          .from("computer_automation_actions")
          .insert({
            session_id: sessionData.id,
            action_type: action.type,
            action_details: actionToJson(action),
            reasoning: manusResponse.reasoning,
            status: "pending",
            screenshot_url: initialScreenshot
          });
        
        setPreviousActions([action]);
      }
      
      refetchCredits();
      fetchActionHistory();
      
      toast.success("Session started successfully");
    } catch (error) {
      console.error("Error starting session:", error);
      toast.error(error instanceof Error ? error.message : "Failed to start session");
      
      setSessionId(null);
      setCurrentOutput([]);
      setCurrentCallId(null);
      setPendingSafetyChecks([]);
      setPreviousActions([]);
    } finally {
      setIsProcessing(false);
    }
  }, [
    taskDescription, 
    environment, 
    userCredits, 
    currentUrl, 
    captureScreenshot, 
    sendToManus, 
    convertManusResponseToOutput, 
    refetchCredits, 
    fetchActionHistory,
    actionToJson
  ]);
  
  const executeAction = useCallback(async () => {
    if (!sessionId || !currentCallId) {
      toast.error("No active action to execute");
      return;
    }
    
    setIsProcessing(true);
    setAuthError(null);
    
    try {
      const { data: { user }, error: authCheckError } = await supabase.auth.getUser();
      if (authCheckError || !user) {
        setAuthError("You need to be signed in to use the Computer Agent");
        toast.error("Authentication required. Please sign in to continue.");
        return;
      }
      
      const currentScreenshot = await captureScreenshot();
      
      const { data: actionData, error: actionError } = await supabase
        .from("computer_automation_actions")
        .update({
          status: "executed",
          executed_at: new Date().toISOString(),
          screenshot_url: currentScreenshot
        })
        .eq("session_id", sessionId)
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(1)
        .select();
      
      if (actionError) {
        throw new Error(actionError.message);
      }
      
      if (actionData && actionData.length > 0) {
        const executedAction = currentOutput.find(item => 
          item.type === "computer_call" && item.call_id === currentCallId
        );
        
        if (executedAction && executedAction.type === "computer_call") {
          const actionToAdd: ManusAction = {
            type: executedAction.action.type,
          };
          
          if (executedAction.action.x !== undefined) actionToAdd.x = executedAction.action.x;
          if (executedAction.action.y !== undefined) actionToAdd.y = executedAction.action.y;
          if (executedAction.action.text !== undefined) actionToAdd.text = executedAction.action.text;
          if (executedAction.action.keys !== undefined) actionToAdd.keys = executedAction.action.keys;
          if (executedAction.action.url !== undefined) actionToAdd.url = executedAction.action.url;
          
          setPreviousActions(prev => [...prev, actionToAdd]);
        }
      }
      
      const currentAction = currentOutput.find(item => 
        item.type === "computer_call" && item.call_id === currentCallId
      );
      
      if (currentAction && currentAction.type === "computer_call" && 
          currentAction.action.type === "navigate" && currentAction.action.url) {
        setCurrentUrl(currentAction.action.url);
      }
      
      const manusResponse = await sendToManus({
        task: taskDescription,
        environment: environment,
        screenshot: currentScreenshot || undefined,
        current_url: currentUrl || undefined,
        previous_actions: previousActions
      });
      
      if (!manusResponse) {
        throw new Error("Failed to get response from Manus API");
      }
      
      const newActionId = crypto.randomUUID();
      const output = convertManusResponseToOutput(manusResponse, newActionId);
      setCurrentOutput(output);
      
      const computerCall = output.find(item => item.type === "computer_call");
      if (computerCall && computerCall.type === "computer_call") {
        setCurrentCallId(computerCall.call_id);
        setPendingSafetyChecks(computerCall.pending_safety_checks || []);
        
        if (manusResponse.actions && manusResponse.actions.length > 0) {
          const action = manusResponse.actions[0];
          
          await supabase
            .from("computer_automation_actions")
            .insert({
              session_id: sessionId,
              action_type: action.type,
              action_details: actionToJson(action),
              reasoning: manusResponse.reasoning,
              status: "pending",
            });
        }
      } else {
        await supabase
          .from("computer_automation_sessions")
          .update({
            status: "completed",
            completed_at: new Date().toISOString()
          })
          .eq("id", sessionId);
        
        setCurrentCallId(null);
        setPendingSafetyChecks([]);
        toast.success("Task completed successfully");
      }
      
      fetchActionHistory();
      setRetryCount(0);
    } catch (error) {
      console.error("Error executing action:", error);
      toast.error(error instanceof Error ? error.message : "Failed to execute action");
      
      if (retryCount < 3) {
        setRetryCount(prev => prev + 1);
        toast.info(`Retrying action... (Attempt ${retryCount + 1}/3)`);
        setTimeout(() => {
          executeAction();
        }, 2000);
        return;
      }
    } finally {
      setIsProcessing(false);
    }
  }, [
    sessionId, 
    currentCallId, 
    taskDescription, 
    environment, 
    currentUrl, 
    previousActions,
    captureScreenshot, 
    sendToManus, 
    convertManusResponseToOutput, 
    fetchActionHistory,
    currentOutput,
    retryCount,
    actionToJson
  ]);
  
  const clearSession = useCallback(() => {
    setSessionId(null);
    setCurrentOutput([]);
    setCurrentCallId(null);
    setPendingSafetyChecks([]);
    setCurrentUrl(null);
    setActionHistory([]);
    setScreenshot(null);
    setPreviousActions([]);
    setRetryCount(0);
    setAuthError(null);
    toast.info("Session ended");
  }, []);
  
  const acknowledgeAllSafetyChecks = useCallback(() => {
    toast.success("Safety checks acknowledged");
    executeAction();
  }, [executeAction]);
  
  return {
    taskDescription,
    setTaskDescription,
    environment,
    setEnvironment,
    sessionId,
    isProcessing,
    currentOutput,
    startSession,
    executeAction,
    clearSession,
    pendingSafetyChecks,
    acknowledgeAllSafetyChecks,
    currentUrl,
    setCurrentUrl,
    actionHistory,
    userCredits,
    setScreenshot,
    captureScreenshot,
    screenshot,
    authError
  };
};
