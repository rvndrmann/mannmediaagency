
import { AgentResult, AgentType, RunnerContext } from "../types";
import { Attachment } from "@/types/message";
import { BaseAgentImpl } from "./BaseAgentImpl";

export class AssistantAgent extends BaseAgentImpl {
  constructor(options: any) {
    super({
      name: options.name || "Assistant Agent",
      instructions: options.instructions || "You are a helpful AI assistant.",
      context: options.context,
      traceId: options.traceId,
      ...options
    });
  }

  getType(): AgentType {
    return "assistant";
  }

  async process(input: string, context: RunnerContext): Promise<AgentResult> {
    try {
      console.log("Processing input with AssistantAgent:", input.substring(0, 50) + "...");
      
      // Record trace event for assistant agent start
      this.recordTraceEvent("assistant_agent_start", {
        input_length: input.length
      });
      
      // Get dynamic instructions if needed
      const instructions = this.getInstructions();
      
      // Handle input guardrails
      // Placeholder for future implementation
      
      // Record instruction loading
      this.recordTraceEvent("assistant_loaded_instructions", {
        instructions_length: instructions.length
      });
      
      // Get the current user
      const { data: { user } } = await context.supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }
      
      // Get attachments if they exist in metadata
      const attachments = context.metadata?.attachments || [];
      
      // Call the Supabase function for the assistant agent
      const { data, error } = await context.supabase.functions.invoke('multi-agent-chat', {
        body: {
          input,
          attachments,
          agentType: "assistant",
          userId: user.id,
          usePerformanceModel: context.usePerformanceModel,
          enableDirectToolExecution: context.enableDirectToolExecution,
          contextData: {
            instructions
          },
          runId: context.runId,
          groupId: context.groupId
        }
      });
      
      if (error) {
        console.error("Assistant agent error:", error);
        this.recordTraceEvent("assistant_agent_error", {
          error: error.message || "Unknown error"
        });
        throw new Error(`Assistant agent error: ${error.message}`);
      }
      
      // Handle handoff if needed
      let nextAgent = null;
      let handoffReason = null;
      let additionalContext = null;
      
      if (data?.handoff) {
        nextAgent = data.handoff.targetAgent;
        handoffReason = data.handoff.reason;
        additionalContext = data.handoff.additionalContext;
        
        this.recordTraceEvent("assistant_agent_handoff", {
          target_agent: nextAgent,
          reason: handoffReason
        });
      }
      
      // Record completion event
      this.recordTraceEvent("assistant_agent_complete", {
        response_length: data?.completion?.length || 0,
        has_handoff: !!nextAgent
      });
      
      // Return the result
      return {
        response: data?.completion || "I've processed your request, but couldn't generate a proper response.",
        output: data?.completion || "I've processed your request, but couldn't generate a proper response.",
        nextAgent,
        handoffReason,
        structured_output: data?.structured_output,
        additionalContext
      };
    } catch (error) {
      console.error("Error in AssistantAgent.process:", error);
      this.recordTraceEvent("assistant_agent_error", {
        error: error instanceof Error ? error.message : "Unknown error"
      });
      return {
        response: "An error occurred while processing your request. Please try again.",
        output: "An error occurred while processing your request. Please try again.",
        nextAgent: null
      };
    }
  }
}
