
import { supabase } from "@/integrations/supabase/client";
import { Message, Attachment } from "@/types/message";
import { AgentType } from "./runner/types";

interface ChatRequest {
  input: string;
  agentType: AgentType;
  conversationHistory: Message[];
  usePerformanceModel?: boolean;
  attachments?: Attachment[];
  isHandoffContinuation?: boolean;
  previousAgentType?: AgentType;
  handoffReason?: string;
  projectId?: string;
  contextData?: Record<string, any>;
  runId?: string;
  groupId?: string;
}

export interface ChatResponse {
  role: string;
  content: string;
  agentType: AgentType;
  handoffRequest?: {
    targetAgent: string;
    reason: string;
    additionalContext?: Record<string, any>;
  };
  structured_output?: any;
  conversationId?: string;
  sessionId?: string;
}

export const sendChatMessage = async (request: ChatRequest): Promise<ChatResponse> => {
  try {
    console.log("Sending chat request to multi-agent-chat function:", {
      agentType: request.agentType,
      inputLength: request.input.length,
      historyLength: request.conversationHistory.length,
      attachmentsCount: request.attachments?.length || 0
    });

    const { data, error } = await supabase.functions.invoke("multi-agent-chat", {
      body: request
    });

    if (error) {
      console.error("Error calling multi-agent-chat function:", error);
      throw new Error(`Error calling chat function: ${error.message}`);
    }

    console.log("Received response from multi-agent-chat function:", {
      agentType: data.agentType,
      contentLength: data.content.length,
      hasHandoff: !!data.handoffRequest
    });

    return data as ChatResponse;
  } catch (error) {
    console.error("Exception in sendChatMessage:", error);
    throw error;
  }
}
