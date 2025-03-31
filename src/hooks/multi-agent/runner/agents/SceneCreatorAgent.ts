
import { AgentResult, RunnerContext, AgentType, AgentOptions } from "../types";
import { BaseAgentImpl } from "./BaseAgentImpl";
import { Attachment } from "@/types/message";

export class SceneCreatorAgent extends BaseAgentImpl {
  constructor(options: AgentOptions) {
    super({
      name: options.name || "Scene Creator Agent",
      instructions: options.instructions || "You are an AI agent specialized in creating visual scenes.",
      context: options.context,
      traceId: options.traceId,
      ...options
    });
  }

  getType(): AgentType {
    return "scene";
  }

  async process(input: string, context: RunnerContext): Promise<AgentResult> {
    try {
      // Record the start of the agent execution
      this.recordTraceEvent({
        agent_type: this.getType(),
        input_length: input.length,
        action: "agent_start"
      });
      
      // Handle attachments if they exist in metadata
      const attachments = this.context.metadata?.attachments || [];

      // Apply input guardrails
      await this.applyInputGuardrails(input);

      // Get project context if available
      const projectId = this.context.metadata?.projectId || this.context.projectId;
      let projectScenes = [];
      let enhancedInput = input;

      // Get the current user
      const { data: { user } } = await this.context.supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Call the Supabase function with the appropriate parameters
      const { data, error } = await this.context.supabase.functions.invoke('multi-agent-chat', {
        body: {
          input: enhancedInput,
          attachments,
          agentType: "scene",
          userId: user.id,
          usePerformanceModel: this.context.usePerformanceModel,
          enableDirectToolExecution: this.context.enableDirectToolExecution,
          contextData: {
            hasAttachments: attachments && attachments.length > 0,
            attachmentTypes: attachments.map((att: Attachment) => att.type.startsWith('image') ? 'image' : 'file'),
            projectId
          },
          metadata: {
            conversationId: this.context.groupId,
            projectId
          },
          runId: this.context.runId,
          groupId: this.context.groupId
        }
      });

      if (error) {
        throw new Error(`Scene creator agent error: ${error.message}`);
      }

      // Record the completion of the agent execution
      this.recordTraceEvent({
        agent_type: this.getType(),
        response_length: data?.completion?.length || 0,
        action: "agent_complete"
      });

      // Return the final response
      return {
        response: data?.completion || "I processed your request but couldn't generate a scene response.",
        nextAgent: data?.handoffRequest?.targetAgent as AgentType || null,
        handoffReason: data?.handoffRequest?.reason || null,
        additionalContext: data?.handoffRequest?.additionalContext || null,
        structured_output: data?.structured_output || null
      };
    } catch (error) {
      console.error(`Error in ${this.getType()} agent:`, error);
      
      // Record the error
      this.recordTraceEvent({
        agent_type: this.getType(),
        error_message: error instanceof Error ? error.message : "Unknown error",
        action: "agent_error"
      });
      
      throw error;
    }
  }
  
  protected getDefaultInstructions(): string {
    return `You are a Scene Creator Assistant specifically focused on creating and improving video scene descriptions, image prompts, and voice over text. You excel at:

1. Creating detailed scene descriptions that paint a visual picture
2. Crafting precise image prompts for AI image generation
3. Writing natural-sounding voice over text that complements visuals
4. Helping structure scenes in a logical sequence

When a user asks about a specific scene, provide its details. When asked to create or edit content, focus on being descriptive and visual.

You can view and edit these types of content for each scene:
- Script: The dialogue and action descriptions
- Description: A detailed description of what should appear visually in the scene
- Image Prompt: The prompt used to generate the scene's image
- Voice Over Text: The narration that will be spoken over the scene

Always try to maintain consistency across all these elements when editing one of them.`;
  }
}
