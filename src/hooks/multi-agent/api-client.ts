
import { supabase } from "@/integrations/supabase/client";
import { Message, Attachment } from "@/types/message";
import { AgentType } from "@/hooks/use-multi-agent-chat";

interface AgentRequestOptions {
  usePerformanceModel?: boolean;
  hasAttachments?: boolean;
  attachmentTypes?: string[];
  isCustomAgent?: boolean;
  isHandoffContinuation?: boolean;
  enableDirectToolExecution?: boolean;
  availableTools?: any[];
  traceId?: string;
  userId?: string;
}

export class MultiAgentApiClient {
  /**
   * Calls the multi-agent-chat edge function with the provided messages and options
   */
  static async callAgent(
    messages: Message[],
    agentType: AgentType,
    options: AgentRequestOptions = {}
  ): Promise<{ 
    completion: string;
    handoffRequest?: { targetAgent: string; reason: string };
    modelUsed: string;
  }> {
    try {
      // First get user ID to pass to the function
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Create context data for the edge function
      const contextData = {
        hasAttachments: options.hasAttachments || false,
        attachmentTypes: options.attachmentTypes || [],
        isCustomAgent: options.isCustomAgent || false,
        isHandoffContinuation: options.isHandoffContinuation || false,
        usePerformanceModel: options.usePerformanceModel || false,
        enableDirectToolExecution: options.enableDirectToolExecution || false,
        availableTools: options.availableTools || [],
        traceId: options.traceId,
        userId: options.userId || user.id
      };

      console.log("Calling multi-agent-chat function with:", { 
        agentType, 
        messagesCount: messages.length,
        contextData
      });

      // Process messages for edge function consumption
      const processedMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        name: msg.agentType ? `previous_agent_${msg.agentType}` : undefined,
      }));

      // Call the edge function
      const { data, error } = await supabase.functions.invoke("multi-agent-chat", {
        body: {
          messages: processedMessages,
          agentType,
          userId: user.id,
          contextData
        }
      });

      if (error) {
        console.error("Error calling multi-agent-chat function:", error);
        throw new Error(`API error: ${error.message}`);
      }

      return {
        completion: data.completion,
        handoffRequest: data.handoffRequest,
        modelUsed: data.modelUsed
      };
    } catch (error) {
      console.error("Failed to call agent API:", error);
      throw error;
    }
  }

  /**
   * Format attachments in messages to be compatible with vision models
   */
  static formatAttachments(messages: Message[]): Message[] {
    return messages.map(msg => {
      if (!msg.attachments || msg.attachments.length === 0) {
        return msg;
      }

      // Format attachments for the message content
      let newContent = msg.content;
      
      // Add attachment references to the message
      msg.attachments.forEach(attachment => {
        if (attachment.type === "image") {
          newContent += `\n[Attached image: ${attachment.name}, URL: ${attachment.url}]`;
        } else {
          newContent += `\n[Attached file: ${attachment.name}, URL: ${attachment.url}]`;
        }
      });
      
      return {
        ...msg,
        content: newContent,
      };
    });
  }

  /**
   * Get attachment types present in a message
   */
  static getAttachmentTypes(messages: Message[]): string[] {
    const types = new Set<string>();
    
    messages.forEach(msg => {
      if (msg.attachments) {
        msg.attachments.forEach(attachment => {
          types.add(attachment.type);
        });
      }
    });
    
    return Array.from(types);
  }
}
