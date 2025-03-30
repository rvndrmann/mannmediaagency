
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type AgentSdkType = "assistant" | "script" | "image" | "scene";

interface AgentSdkResponse {
  success: boolean;
  response?: string;
  data?: any;
  error?: string;
  agentType?: string;
}

interface AgentSdkOptions {
  projectId?: string;
  sessionId?: string;
  context?: Record<string, any>;
}

export function useAgentSdk(options: AgentSdkOptions = {}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResponse, setLastResponse] = useState<AgentSdkResponse | null>(null);
  
  const callAgent = useCallback(async (
    input: string, 
    agentType: AgentSdkType = "assistant"
  ): Promise<AgentSdkResponse> => {
    if (!input.trim()) {
      return { success: false, error: "Input is required" };
    }
    
    setIsProcessing(true);
    
    try {
      console.log("Calling agent-sdk with:", {
        input,
        agentType,
        projectId: options.projectId,
        sessionId: options.sessionId,
        context: options.context
      });
      
      const { data, error } = await supabase.functions.invoke('agent-sdk', {
        body: {
          input,
          agentType,
          projectId: options.projectId,
          sessionId: options.sessionId,
          context: options.context || {},
        }
      });
      
      if (error) {
        console.error("Error calling agent-sdk:", error);
        const response = {
          success: false,
          error: `Failed to call agent: ${error.message}`
        };
        setLastResponse(response);
        return response;
      }
      
      console.log("Agent SDK response:", data);
      setLastResponse(data);
      return data;
    } catch (error) {
      console.error("Error in useAgentSdk:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const response = {
        success: false,
        error: `Agent SDK error: ${errorMessage}`
      };
      setLastResponse(response);
      return response;
    } finally {
      setIsProcessing(false);
    }
  }, [options.projectId, options.sessionId, options.context]);
  
  return {
    callAgent,
    isProcessing,
    lastResponse
  };
}
