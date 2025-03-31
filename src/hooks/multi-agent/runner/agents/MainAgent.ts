
import { Attachment } from "@/types/message";
import { AgentResult, AgentOptions, AgentType } from "../types";
import { BaseAgentImpl } from "./BaseAgentImpl";

export class MainAgent extends BaseAgentImpl {
  constructor(options: AgentOptions) {
    super({
      context: options.context,
      traceId: options.traceId
    });
  }

  async run(input: string, attachments: Attachment[]): Promise<AgentResult> {
    try {
      this.recordTraceEvent("main_agent_run", `Processing input: ${input.substring(0, 50)}...`);
      
      // Get the current user
      const { data: { user } } = await this.context.supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }
      
      // Get dynamic instructions if needed
      const instructions = await this.getInstructions(this.context);
      
      // Get conversation history from context if available
      const conversationHistory = this.context.metadata?.conversationHistory || [];
      
      this.recordTraceEvent("main_agent_invoke", 
        `Invoking Main Agent with ${conversationHistory.length} historical messages`
      );
      
      // Call the Supabase function with the appropriate parameters
      const { data, error } = await this.context.supabase.functions.invoke('multi-agent-chat', {
        body: {
          input,
          attachments,
          agentType: "main",
          userId: user.id,
          usePerformanceModel: this.context.usePerformanceModel,
          enableDirectToolExecution: this.context.enableDirectToolExecution,
          tracingDisabled: this.context.tracingDisabled,
          contextData: {
            hasAttachments: attachments && attachments.length > 0,
            attachmentTypes: attachments.map(att => att.type.startsWith('image') ? 'image' : 'file'),
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
      
      this.recordTraceEvent("main_agent_response", 
        `Received response: ${data?.completion?.substring(0, 50)}...`
      );
      
      // Extract handoff information if present
      let nextAgent = null;
      let handoffReason = null;
      let additionalContext = null;
      
      if (data?.handoffRequest) {
        this.recordTraceEvent("main_agent_handoff", 
          `Handoff requested to ${data.handoffRequest.targetAgent}`
        );
        
        nextAgent = data.handoffRequest.targetAgent;
        handoffReason = data.handoffRequest.reason;
        additionalContext = data.handoffRequest.additionalContext;
      }
      
      return {
        output: data?.completion || "I processed your request but couldn't generate a response.",
        nextAgent,
        handoffReason,
        structured_output: data?.structured_output,
        additionalContext
      };
    } catch (error) {
      this.recordTraceEvent("main_agent_error", `Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error("MainAgent run error:", error);
      throw error;
    }
  }
  
  getType(): AgentType {
    return "main";
  }
}
