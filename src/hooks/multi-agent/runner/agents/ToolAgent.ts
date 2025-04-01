
import { Attachment } from "@/types/message";
import { AgentResult, AgentOptions, AgentType } from "../types";
import { BaseAgentImpl } from "./BaseAgentImpl";

export class ToolAgent extends BaseAgentImpl {
  constructor(options: AgentOptions) {
    super({
      context: options.context,
      traceId: options.traceId
    });
  }

  async run(input: string, attachments: Attachment[]): Promise<AgentResult> {
    try {
      this.recordTraceEvent("tool_agent_run", `Processing input: ${input.substring(0, 50)}...`);
      
      // Get the current user
      const { data: { user } } = await this.context.supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }
      
      // Get conversation history from context if available
      const conversationHistory = this.context.metadata?.conversationHistory || [];
      
      this.recordTraceEvent("tool_agent_invoke", 
        `Invoking Tool Agent with ${conversationHistory.length} historical messages`
      );
      
      // Call the Supabase function with the appropriate parameters
      const { data, error } = await this.context.supabase.functions.invoke('multi-agent-chat', {
        body: {
          input,
          attachments,
          agentType: "tool",
          userId: user.id,
          usePerformanceModel: this.context.usePerformanceModel,
          enableDirectToolExecution: true, // Always enable for tool agent
          tracingDisabled: this.context.tracingDisabled,
          contextData: {
            hasAttachments: attachments && attachments.length > 0,
            attachmentTypes: attachments.map(att => att.type.startsWith('image') ? 'image' : 'file'),
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
        throw new Error(`Tool agent error: ${error.message}`);
      }
      
      this.recordTraceEvent("tool_agent_response", 
        `Received response: ${data?.completion?.substring(0, 50)}...`
      );
      
      return {
        output: data?.completion || "I processed your request but couldn't generate a tool agent response.",
        nextAgent: null,
        handoffReason: null,
        structured_output: data?.structured_output,
        additionalContext: null
      };
    } catch (error) {
      this.recordTraceEvent("tool_agent_error", `Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error("ToolAgent run error:", error);
      throw error;
    }
  }
  
  getType(): AgentType {
    return "tool";
  }
}
