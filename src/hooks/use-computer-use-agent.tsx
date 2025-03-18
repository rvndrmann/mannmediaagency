
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
      const response = await supabase.functions.invoke("computer-use-agent", {
        body: {
          taskDescription,
          environment,
          screenshot: screenshot || undefined
        }
      });
      
      if (response.error) {
        throw new Error(response.error.message || "Failed to start session");
      }
      
      const { sessionId, output } = response.data;
      setSessionId(sessionId);
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
  }, [taskDescription, environment, screenshot, userCredits, refetchCredits, fetchActionHistory]);
  
  const executeAction = useCallback(async () => {
    if (!sessionId || !currentCallId) {
      toast.error("No active action to execute");
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Normally here you would execute the action in a browser environment
      // and capture a screenshot. For now, we'll simulate this with a placeholder
      const simulatedScreenshot = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
      
      const response = await supabase.functions.invoke("computer-use-agent", {
        body: {
          sessionId,
          callId: currentCallId,
          screenshot: simulatedScreenshot,
          acknowledgedSafetyChecks: pendingSafetyChecks.length > 0 ? pendingSafetyChecks : undefined,
          currentUrl: currentUrl || undefined
        }
      });
      
      if (response.error) {
        throw new Error(response.error.message || "Failed to execute action");
      }
      
      const { output } = response.data;
      setCurrentOutput(output);
      
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
  }, [sessionId, currentCallId, pendingSafetyChecks, currentUrl, fetchActionHistory]);
  
  const clearSession = useCallback(() => {
    setSessionId(null);
    setCurrentOutput([]);
    setCurrentCallId(null);
    setPendingSafetyChecks([]);
    setCurrentUrl(null);
    setActionHistory([]);
    setScreenshot(null);
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
    setScreenshot
  };
};
