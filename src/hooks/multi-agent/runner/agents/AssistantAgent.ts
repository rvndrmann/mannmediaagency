
import { AgentOptions, AgentType, RunnerContext, AgentResult } from "../types";
import { BaseAgentImpl } from "../types";
import { Attachment } from "@/types/message";
import { ToolContext } from "../../types";
import { parseJsonToolCall, parseToolCall } from "../../tool-parser";
import { executeCommand } from "../../tool-executor";

export class AssistantAgent extends BaseAgentImpl {
  constructor(options: AgentOptions) {
    super(options);
  }
  
  getType(): AgentType {
    return "assistant";
  }
  
  async process(input: string, context: RunnerContext): Promise<AgentResult> {
    try {
      // Record trace event
      this.recordTraceEvent("agent_start", `Processing input: ${input.substring(0, 50)}...`);
      
      // Apply input guardrails
      const guardedInput = await this.applyInputGuardrails(input);
      
      // Get the current user
      const { data: { user } } = await context.supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }
      
      // Get dynamic instructions if needed
      const instructions = await this.getInstructions(context);
      
      // Get conversation history from context if available
      const conversationHistory = context.metadata?.conversationHistory || [];
      
      this.recordTraceEvent("assistant_agent_invoke", 
        `Invoking Assistant Agent with ${conversationHistory.length} historical messages`
      );
      
      // Call the Supabase function with the appropriate parameters
      const { data, error } = await context.supabase.functions.invoke('multi-agent-chat', {
        body: {
          input: guardedInput,
          attachments: [], // No attachments provided in this interface
          agentType: "assistant",
          userId: user.id,
          usePerformanceModel: context.usePerformanceModel,
          enableDirectToolExecution: context.enableDirectToolExecution,
          tracingEnabled: context.tracingEnabled,
          contextData: {
            hasAttachments: false,
            instructions,
          },
          conversationHistory,
          metadata: {
            conversationId: context.groupId,
            projectId: context.metadata?.projectId,
          },
          runId: context.runId,
          groupId: context.groupId
        }
      });
      
      if (error) {
        throw new Error(`Assistant agent error: ${error.message}`);
      }
      
      this.recordTraceEvent("assistant_agent_response", 
        `Received response: ${data?.completion?.substring(0, 50)}...`
      );
      
      // Extract handoff information if present
      let nextAgent = null;
      let handoffReason = null;
      let additionalContext = null;
      
      if (data?.handoffRequest) {
        this.recordTraceEvent("assistant_agent_handoff", 
          `Handoff requested to ${data.handoffRequest.targetAgent}`
        );
        
        nextAgent = data.handoffRequest.targetAgent;
        handoffReason = data.handoffRequest.reason;
        additionalContext = data.handoffRequest.additionalContext;
      }
      
      return {
        response: data?.completion || "I processed your request but couldn't generate a response.",
        nextAgent,
        handoffReason,
        structured_output: data?.structured_output,
        additionalContext
      };
    } catch (error) {
      this.recordTraceEvent("assistant_agent_error", `Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error("AssistantAgent process error:", error);
      throw error;
    }
  }
}
