
import { Attachment } from "@/types/message";
import { AgentConfig, ToolContext } from "../../types";
import { AgentResult, AgentOptions } from "../types";
import { BaseAgentImpl } from "./BaseAgentImpl";

export class SceneGeneratorAgent extends BaseAgentImpl {
  constructor(options: AgentOptions) {
    super(options);
  }

  async run(input: string, attachments: Attachment[]): Promise<AgentResult> {
    try {
      console.log("Running SceneGeneratorAgent with input:", input, "attachments:", attachments);
      
      // Get the current user
      const { data: { user } } = await this.context.supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }
      
      // Get dynamic instructions if needed
      const instructions = await this.getInstructions(this.context);
      
      // Get conversation history from context if available
      const conversationHistory = this.context.metadata?.conversationHistory || [];
      
      // Call the Supabase function
      const { data, error } = await this.context.supabase.functions.invoke('multi-agent-chat', {
        body: {
          input,
          attachments,
          agentType: "scene",
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
            previousAgentType: 'scene'
          },
          runId: this.context.runId,
          groupId: this.context.groupId
        }
      });
      
      if (error) {
        throw new Error(`Scene generator agent error: ${error.message}`);
      }
      
      // Handle handoff if present
      let nextAgent = null;
      if (data?.handoffRequest) {
        nextAgent = data.handoffRequest.targetAgent;
      }
      
      return {
        response: data?.completion || "I processed your request but couldn't generate a scene description.",
        nextAgent: nextAgent,
        structured_output: data?.structured_output || null
      };
    } catch (error) {
      console.error("SceneGeneratorAgent run error:", error);
      throw error;
    }
  }
}
