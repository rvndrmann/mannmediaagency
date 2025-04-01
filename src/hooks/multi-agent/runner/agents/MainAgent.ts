
import { Attachment } from "@/types/message";
import { AgentResult, AgentType, RunnerContext, AgentOptions } from "../types";
import { BaseAgentImpl } from "./BaseAgentImpl";

export class MainAgent extends BaseAgentImpl {
  constructor(options: AgentOptions) {
    super({
      name: options.name || "Main Agent",
      instructions: options.instructions || "You are a helpful assistant that can answer questions about anything.",
      context: options.context,
      traceId: options.traceId
    });
  }

  getType(): AgentType {
    return "main";
  }

  async process(input: string, context: RunnerContext): Promise<AgentResult> {
    try {
      this.recordTraceEvent("main_agent_run", { message: `Processing input: ${input.substring(0, 50)}...` });
      
      // Get the current user
      const { data: { user } } = await this.context.supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }
      
      // Get dynamic instructions if needed
      const instructions = this.getInstructions();
      
      // Get conversation history from context if available
      const conversationHistory = this.context.metadata?.conversationHistory || [];
      
      this.recordTraceEvent("main_agent_invoke", { message: `Invoking Main Agent with ${conversationHistory.length} historical messages` });
      
      // Handle attachments if they exist in metadata
      const attachments = this.context.metadata?.attachments || [];
      
      // Call the Supabase function with the appropriate parameters
      const { data, error } = await this.context.supabase.functions.invoke('multi-agent-chat', {
        body: {
          input,
          attachments,
          agentType: "main",
          userId: user.id,
          usePerformanceModel: this.context.usePerformanceModel,
          enableDirectToolExecution: this.context.enableDirectToolExecution,
          tracingEnabled: !this.context.tracingEnabled,
          contextData: {
            hasAttachments: attachments && attachments.length > 0,
            attachmentTypes: attachments.map((att: Attachment) => att.type.startsWith('image') ? 'image' : 'file'),
            instructions,
          },
          conversationHistory,
          metadata: {
            conversationId: this.context.groupId,
            projectId: this.context.metadata?.projectId,
          },
          runId: this.context.runId,
          groupId: this.context.groupId
        }
      });
      
      if (error) {
        throw new Error(`Main agent error: ${error.message}`);
      }
      
      this.recordTraceEvent("main_agent_response", { message: `Received response: ${data?.completion?.substring(0, 50)}...` });
      
      // Extract handoff information if present
      let nextAgent: AgentType | null = null;
      let handoffReason = null;
      let additionalContext = null;
      
      if (data?.handoffRequest) {
        this.recordTraceEvent("main_agent_handoff", { message: `Handoff requested to ${data.handoffRequest.targetAgent}` });
        
        nextAgent = data.handoffRequest.targetAgent as AgentType;
        handoffReason = data.handoffRequest.reason;
        additionalContext = data.handoffRequest.additionalContext;
      }
      
      return {
        response: data?.completion || "I processed your request but couldn't generate a response.",
        output: data?.completion || "I processed your request but couldn't generate a response.",
        nextAgent,
        handoffReason,
        structured_output: data?.structured_output,
        additionalContext
      };
    } catch (error) {
      this.recordTraceEvent("main_agent_error", { message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` });
      console.error("MainAgent run error:", error);
      throw error;
    }
  }
}
