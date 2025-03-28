
import { Attachment } from "@/types/message";
import { ToolContext } from "../../types";
import { BaseAgent, AgentResult } from "../types";

export class SceneGeneratorAgent implements BaseAgent {
  private context: ToolContext;

  constructor(context: ToolContext) {
    this.context = context;
  }

  async run(input: string, attachments: Attachment[]): Promise<AgentResult> {
    try {
      // Get the current user
      const { data: { user } } = await this.context.supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }
      
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
            isHandoffContinuation: false
          },
          metadata: this.context.metadata,
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
        nextAgent: nextAgent
      };
    } catch (error) {
      console.error("SceneGeneratorAgent run error:", error);
      throw error;
    }
  }
}
