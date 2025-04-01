
import { Message } from "@/types/message";
import { AgentType } from "./runner/types";

interface SendChatMessageParams {
  input: string;
  agentType: AgentType;
  conversationHistory: Message[];
  usePerformanceModel: boolean;
  attachments?: any[];
  runId: string;
  groupId: string;
  projectId?: string;
  contextData?: Record<string, any>;
}

interface ChatMessageResponse {
  content: string;
  agentType: AgentType;
  handoffRequest?: {
    targetAgent: AgentType;
    reason: string;
    additionalContext?: Record<string, any>;
  };
  metadata?: Record<string, any>;
}

export async function sendChatMessage(params: SendChatMessageParams): Promise<ChatMessageResponse> {
  try {
    const response = await fetch("/api/multi-agent-chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(params)
    });
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error in sendChatMessage:", error);
    throw error;
  }
}

// Additional API client functions can be added here
