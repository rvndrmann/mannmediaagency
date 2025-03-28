
import { Attachment } from "@/types/message";
import { AgentConfig, ToolContext } from "../../types";
import { AgentResult, AgentOptions } from "../types";
import { BaseAgentImpl } from "./BaseAgentImpl";

export class ImageGeneratorAgent extends BaseAgentImpl {
  constructor(options: AgentOptions) {
    super(options);
  }

  getType() {
    return "image";
  }

  async run(input: string, attachments: Attachment[]): Promise<AgentResult> {
    try {
      console.log("Running ImageGeneratorAgent with input:", input, "attachments:", attachments);
      
      // Get the current user
      const { data: { user } } = await this.context.supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }
      
      // Get dynamic instructions if needed
      const instructions = await this.getInstructions(this.context);
      
      // Get conversation history from context if available
      const conversationHistory = this.context.metadata?.conversationHistory || [];
      
      console.log(`ImageGeneratorAgent processing with ${conversationHistory.length} historical messages`);
      
      // Check if this is a handoff continuation
      const isHandoffContinuation = this.context.metadata?.isHandoffContinuation || false;
      const previousAgentType = this.context.metadata?.previousAgentType || 'main';
      const handoffReason = this.context.metadata?.handoffReason || '';
      
      console.log(`Handoff context: continuation=${isHandoffContinuation}, from=${previousAgentType}, reason=${handoffReason}`);
      
      // Record trace event for image generator agent start
      this.recordTraceEvent("image_agent_start", {
        input_length: input.length,
        has_attachments: attachments && attachments.length > 0,
        is_handoff_continuation: isHandoffContinuation,
        from_agent: previousAgentType,
        history_length: conversationHistory.length
      });
      
      // Call the Supabase function
      const { data, error } = await this.context.supabase.functions.invoke('multi-agent-chat', {
        body: {
          input,
          attachments,
          agentType: "image",
          userId: user.id,
          usePerformanceModel: this.context.usePerformanceModel,
          enableDirectToolExecution: this.context.enableDirectToolExecution,
          tracingDisabled: this.context.tracingDisabled,
          contextData: {
            hasAttachments: attachments && attachments.length > 0,
            attachmentTypes: attachments.map(att => att.type.startsWith('image') ? 'image' : 'file'),
            isHandoffContinuation: isHandoffContinuation,
            previousAgentType: previousAgentType,
            handoffReason: handoffReason,
            instructions: instructions
          },
          conversationHistory: conversationHistory,
          metadata: {
            ...this.context.metadata,
            previousAgentType: 'image',
            conversationId: this.context.groupId
          },
          runId: this.context.runId,
          groupId: this.context.groupId
        }
      });
      
      if (error) {
        this.recordTraceEvent("image_agent_error", {
          error: error.message || "Unknown error"
        });
        throw new Error(`Image generator agent error: ${error.message}`);
      }
      
      console.log("ImageGeneratorAgent response:", data);
      
      // Handle handoff if present
      let nextAgent = null;
      if (data?.handoffRequest) {
        console.log(`ImageGeneratorAgent handoff requested to: ${data.handoffRequest.targetAgent}`);
        nextAgent = data.handoffRequest.targetAgent;
        this.recordTraceEvent("image_agent_handoff", {
          target_agent: nextAgent,
          reason: data.handoffRequest.reason
        });
      }
      
      // Record completion event
      this.recordTraceEvent("image_agent_complete", {
        response_length: data?.completion?.length || 0,
        has_handoff: !!nextAgent,
        has_image_prompts: data?.completion?.includes("prompt:") || false
      });
      
      return {
        response: data?.completion || "I processed your request but couldn't generate an image prompt.",
        nextAgent: nextAgent,
        structured_output: data?.structured_output || null
      };
    } catch (error) {
      console.error("ImageGeneratorAgent run error:", error);
      this.recordTraceEvent("image_agent_error", {
        error: error instanceof Error ? error.message : "Unknown error"
      });
      throw error;
    }
  }
}
