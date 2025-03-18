
import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ComputerUseOutput, SafetyCheck } from "@/types/computer-use";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

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
  const [previousResponseId, setPreviousResponseId] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [authError, setAuthError] = useState<string | null>(null);
  
  // Fetch user credits
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
  
  // Fetch action history for current session
  const fetchActionHistory = useCallback(async () => {
    if (!sessionId) return;
    
    try {
      const { data, error } = await supabase
        .from("computer_automation_actions")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      setActionHistory(data || []);
    } catch (error) {
      console.error("Error fetching action history:", error);
      toast.error("Failed to load action history");
    }
  }, [sessionId]);
  
  useEffect(() => {
    if (sessionId) {
      fetchActionHistory();
    }
  }, [sessionId, fetchActionHistory]);
  
  const captureScreenshot = useCallback(async () => {
    if (typeof document === 'undefined') return null;
    
    try {
      // Import html2canvas dynamically
      const html2canvas = (await import('html2canvas')).default;
      
      // Find the element to capture
      const element = document.querySelector('.browser-view-container');
      
      if (!element) {
        console.error('Could not find browser view container for screenshot');
        return null;
      }
      
      console.log('Capturing screenshot...');
      
      // Capture the screenshot
      const canvas = await html2canvas(element as HTMLElement, {
        useCORS: true,
        allowTaint: true,
        logging: false,
        scale: 1.5, // Increased scale for better quality
        backgroundColor: '#FFFFFF',
      });
      
      // Convert to base64
      const dataUrl = canvas.toDataURL('image/png');
      console.log('Screenshot captured successfully');
      setScreenshot(dataUrl);
      return dataUrl;
    } catch (error) {
      console.error('Error capturing screenshot:', error);
      // Return a placeholder/blank image as fallback
      const fallback = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      setScreenshot(fallback);
      return fallback;
    }
  }, []);
  
  const startSession = useCallback(async () => {
    if (!taskDescription.trim()) {
      toast.error("Please enter a task description");
      return;
    }
    
    // Check credits
    if (!userCredits || userCredits.credits_remaining < 1) {
      toast.error("You need at least 1 credit to use the Computer Agent");
      return;
    }
    
    setIsProcessing(true);
    setAuthError(null);
    
    try {
      // Check authentication first
      const { data: { user }, error: authCheckError } = await supabase.auth.getUser();
      if (authCheckError || !user) {
        setAuthError("You need to be signed in to use the Computer Agent");
        toast.error("Authentication required. Please sign in to continue.");
        return;
      }
      
      // Capture initial screenshot if browser environment
      let initialScreenshot = null;
      if (environment === "browser") {
        initialScreenshot = await captureScreenshot();
      }
      
      console.log("Sending initial request to Computer Use Agent");
      const response = await supabase.functions.invoke("computer-use-agent", {
        body: {
          taskDescription,
          environment,
          screenshot: initialScreenshot
        }
      });
      
      if (response.error) {
        // Check if it's an authentication error
        const isAuthError = response.error.message?.includes("Authentication") || 
                           response.error.message?.includes("auth") || 
                           response.error.message?.toLowerCase().includes("sign in") ||
                           response.error.name === "AuthApiError" ||
                           response.error.name === "AuthError";
                           
        if (isAuthError) {
          setAuthError("Authentication failed. Please sign in again.");
          toast.error("Authentication failed. Please sign in again.");
          return;
        }
        throw new Error(response.error.message || "Failed to start session");
      }
      
      const { sessionId, responseId, output } = response.data;
      console.log("Session started:", sessionId, "Response ID:", responseId);
      
      setSessionId(sessionId);
      setPreviousResponseId(responseId);
      setCurrentOutput(output);
      setRetryCount(0);
      
      // Get call_id and pending_safety_checks
      const computerCall = output.find(item => item.type === "computer_call");
      if (computerCall) {
        setCurrentCallId(computerCall.call_id);
        setPendingSafetyChecks(computerCall.pending_safety_checks || []);
      }
      
      refetchCredits();
      fetchActionHistory();
      
      toast.success("Session started successfully");
    } catch (error) {
      console.error("Error starting session:", error);
      toast.error(error instanceof Error ? error.message : "Failed to start session");
      
      // Reset state on error
      setSessionId(null);
      setPreviousResponseId(null);
      setCurrentOutput([]);
      setCurrentCallId(null);
      setPendingSafetyChecks([]);
    } finally {
      setIsProcessing(false);
    }
  }, [taskDescription, environment, userCredits, refetchCredits, fetchActionHistory, captureScreenshot]);
  
  const executeAction = useCallback(async () => {
    if (!sessionId || !currentCallId || !previousResponseId) {
      toast.error("No active action to execute");
      return;
    }
    
    setIsProcessing(true);
    setAuthError(null);
    
    try {
      // Check authentication first
      const { data: { user }, error: authCheckError } = await supabase.auth.getUser();
      if (authCheckError || !user) {
        setAuthError("You need to be signed in to use the Computer Agent");
        toast.error("Authentication required. Please sign in to continue.");
        return;
      }
      
      // Capture current screenshot
      const currentScreenshot = await captureScreenshot();
      
      console.log("Executing action:", currentCallId);
      console.log("Using previous response ID:", previousResponseId);
      
      // Send the screenshot back to OpenAI via our edge function
      const response = await supabase.functions.invoke("computer-use-agent", {
        body: {
          sessionId,
          callId: currentCallId,
          screenshot: currentScreenshot,
          previousResponseId,
          acknowledgedSafetyChecks: pendingSafetyChecks.length > 0 ? pendingSafetyChecks : undefined,
          currentUrl: currentUrl || undefined
        }
      });
      
      if (response.error) {
        // Check if it's an authentication error
        const isAuthError = response.error.message?.includes("Authentication") || 
                           response.error.message?.includes("auth") || 
                           response.error.message?.toLowerCase().includes("sign in") ||
                           response.error.name === "AuthApiError" ||
                           response.error.name === "AuthError";
                           
        if (isAuthError) {
          setAuthError("Authentication failed. Please sign in again.");
          toast.error("Authentication failed. Please sign in again.");
          return;
        }
        throw new Error(response.error.message || "Failed to execute action");
      }
      
      const { output, responseId } = response.data;
      console.log("Action executed, new response ID:", responseId);
      
      setCurrentOutput(output);
      setPreviousResponseId(responseId);
      setRetryCount(0);
      
      // Get call_id and pending_safety_checks from the next action
      const computerCall = output.find(item => item.type === "computer_call");
      if (computerCall) {
        setCurrentCallId(computerCall.call_id);
        setPendingSafetyChecks(computerCall.pending_safety_checks || []);
      } else {
        // If no more computer calls, we're done
        setCurrentCallId(null);
        setPendingSafetyChecks([]);
        toast.success("Task completed successfully");
      }
      
      fetchActionHistory();
    } catch (error) {
      console.error("Error executing action:", error);
      toast.error(error instanceof Error ? error.message : "Failed to execute action");
      
      // If we have retries left, try again after a delay
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
    previousResponseId, 
    pendingSafetyChecks, 
    currentUrl, 
    fetchActionHistory, 
    captureScreenshot,
    retryCount
  ]);
  
  const clearSession = useCallback(() => {
    setSessionId(null);
    setCurrentOutput([]);
    setCurrentCallId(null);
    setPendingSafetyChecks([]);
    setCurrentUrl(null);
    setActionHistory([]);
    setScreenshot(null);
    setPreviousResponseId(null);
    setRetryCount(0);
    setAuthError(null);
    toast.info("Session ended");
  }, []);
  
  const acknowledgeAllSafetyChecks = useCallback(() => {
    // This would be called when the user confirms all safety checks
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
