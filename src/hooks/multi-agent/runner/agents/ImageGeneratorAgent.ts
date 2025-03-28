
import { Attachment } from "@/types/message";
import { AgentConfig, ToolContext } from "../../types";
import { AgentResult, AgentOptions } from "../types";
import { BaseAgentImpl } from "./BaseAgentImpl";

export class ImageGeneratorAgent extends BaseAgentImpl {
  constructor(options: AgentOptions) {
    super(options);
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
            isHandoffContinuation: this.context.metadata?.isHandoffContinuation || false,
            previousAgentType: this.context.metadata?.previousAgentType || 'main',
            handoffReason: this.context.metadata?.handoffReason || '',
            instructions: instructions
          },
          conversationHistory: conversationHistory, // Pass conversation history
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
        throw new Error(`Image generator agent error: ${error.message}`);
      }
      
      console.log("ImageGeneratorAgent response:", data);
      
      // Handle handoff if present
      let nextAgent = null;
      if (data?.handoffRequest) {
        console.log(`ImageGeneratorAgent handoff requested to: ${data.handoffRequest.targetAgent}`);
        nextAgent = data.handoffRequest.targetAgent;
      }
      
      return {
        response: data?.completion || "I processed your request but couldn't generate an image prompt.",
        nextAgent: nextAgent,
        structured_output: data?.structured_output || null
      };
    } catch (error) {
      console.error("ImageGeneratorAgent run error:", error);
      throw error;
    }
  }
}
