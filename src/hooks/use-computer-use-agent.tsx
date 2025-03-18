
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
    // This is a placeholder for actual screenshot capture functionality
    // In a real implementation, you would use APIs like MediaDevices.getDisplayMedia()
    // or browser extensions to capture the actual screen
    
    console.log("Capturing simulated screenshot");
    return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
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
    
    try {
      // Capture initial screenshot if browser environment
      let initialScreenshot = null;
      if (environment === "browser") {
        initialScreenshot = await captureScreenshot();
        setScreenshot(initialScreenshot);
      }
      
      const response = await supabase.functions.invoke("computer-use-agent", {
        body: {
          taskDescription,
          environment,
          screenshot: initialScreenshot
        }
      });
      
      if (response.error) {
        throw new Error(response.error.message || "Failed to start session");
      }
      
      const { sessionId, responseId, output } = response.data;
      setSessionId(sessionId);
      setPreviousResponseId(responseId);
      setCurrentOutput(output);
      
      // Get call_id and pending_safety_checks
      const computerCall = output.find(item => item.type === "computer_call");
      if (computerCall) {
        setCurrentCallId(computerCall.call_id);
        setPendingSafetyChecks(computerCall.pending_safety_checks || []);
      }
      
      // Decrease credits
      refetchCredits();
      
      fetchActionHistory();
    } catch (error) {
      console.error("Error starting session:", error);
      toast.error(error instanceof Error ? error.message : "Failed to start session");
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
    
    try {
      // Capture current screenshot
      const currentScreenshot = await captureScreenshot();
      setScreenshot(currentScreenshot);
      
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
        throw new Error(response.error.message || "Failed to execute action");
      }
      
      const { output, responseId } = response.data;
      setCurrentOutput(output);
      setPreviousResponseId(responseId);
      
      // Get call_id and pending_safety_checks
      const computerCall = output.find(item => item.type === "computer_call");
      if (computerCall) {
        setCurrentCallId(computerCall.call_id);
        setPendingSafetyChecks(computerCall.pending_safety_checks || []);
      } else {
        // If no more computer calls, we're done
        setCurrentCallId(null);
        setPendingSafetyChecks([]);
      }
      
      fetchActionHistory();
    } catch (error) {
      console.error("Error executing action:", error);
      toast.error(error instanceof Error ? error.message : "Failed to execute action");
    } finally {
      setIsProcessing(false);
    }
  }, [sessionId, currentCallId, previousResponseId, pendingSafetyChecks, currentUrl, fetchActionHistory, captureScreenshot]);
  
  const clearSession = useCallback(() => {
    setSessionId(null);
    setCurrentOutput([]);
    setCurrentCallId(null);
    setPendingSafetyChecks([]);
    setCurrentUrl(null);
    setActionHistory([]);
    setScreenshot(null);
    setPreviousResponseId(null);
  }, []);
  
  const acknowledgeAllSafetyChecks = useCallback(() => {
    // This would be called when the user confirms all safety checks
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
    captureScreenshot
  };
};
