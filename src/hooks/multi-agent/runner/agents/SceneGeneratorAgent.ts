
import { Attachment } from "@/types/message";
import { AgentResult, AgentOptions, AgentType, RunnerContext } from "../types";
import { BaseAgentImpl } from "./BaseAgentImpl";

export class SceneGeneratorAgent extends BaseAgentImpl {
  constructor(options: AgentOptions) {
    super({
      name: options.name || "Scene Generator Agent",
      instructions: options.instructions || "You are an AI agent specialized in generating scene content.",
      context: options.context,
      traceId: options.traceId,
      ...options
    });
  }

  getType(): AgentType {
    return "scene-generator";
  }

  async process(input: string, context: RunnerContext): Promise<AgentResult> {
    try {
      console.log("Running SceneGeneratorAgent with input:", input);
      
      // Get the current user
      const { data: { user } } = await this.context.supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }
      
      // Get dynamic instructions if needed
      const instructions = this.getInstructions();
      
      // Handle attachments if they exist in metadata
      const attachments = this.context.metadata?.attachments || [];
      
      // Record trace event for scene generator agent start
      this.recordTraceEvent("scene_generator_agent_start", {
        input_length: input.length,
        has_attachments: attachments && attachments.length > 0
      });
      
      // Call the Supabase function for the scene generator agent
      const { data, error } = await this.context.supabase.functions.invoke('multi-agent-chat', {
        body: {
          input,
          attachments,
          agentType: "scene",
          userId: user.id,
          usePerformanceModel: this.context.usePerformanceModel,
          enableDirectToolExecution: this.context.enableDirectToolExecution,
          contextData: {
            hasAttachments: attachments && attachments.length > 0,
            attachmentTypes: attachments.map((att: Attachment) => att.type.startsWith('image') ? 'image' : 'file'),
            instructions: instructions
          },
          runId: this.context.runId,
          groupId: this.context.groupId
        }
      });
      
      if (error) {
        console.error("Scene generator agent error:", error);
        this.recordTraceEvent("scene_generator_agent_error", {
          error: error.message || "Unknown error"
        });
        throw new Error(`Scene generator agent error: ${error.message}`);
      }
      
      // Extract command suggestion if present
      const commandSuggestion = data?.commandSuggestion || null;
      
      // Record completion event
      this.recordTraceEvent("scene_generator_agent_complete", {
        response_length: data?.completion?.length || 0,
        has_command_suggestion: !!commandSuggestion
      });
      
      return {
        response: data?.completion || "I processed your request but couldn't generate a response.",
        output: data?.completion || "I processed your request but couldn't generate a response.",
        nextAgent: null,
        handoffReason: null,
        commandSuggestion: commandSuggestion,
        structured_output: data?.structured_output || null
      };
    } catch (error) {
      console.error("SceneGeneratorAgent run error:", error);
      this.recordTraceEvent("scene_generator_agent_error", {
        error: error instanceof Error ? error.message : "Unknown error"
      });
      throw error;
    }
  }
}
