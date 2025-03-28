
import { Attachment } from "@/types/message";
import { ToolContext } from "../../types";
import { AgentResult, AgentOptions } from "../types";
import { BaseAgentImpl } from "./BaseAgentImpl";

export class AssistantAgent extends BaseAgentImpl {
  constructor(options: AgentOptions) {
    super(options);
  }

  getType() {
    return "assistant";
  }

  async run(input: string, attachments: Attachment[]): Promise<AgentResult> {
    try {
      console.log("Running AssistantAgent with input:", input, "attachments:", attachments);
      
      // Get the current user
      const { data: { user } } = await this.context.supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }
      
      // Apply input guardrails if configured
      await this.applyInputGuardrails(input);
      
      // Get dynamic instructions if needed
      const instructions = await this.getInstructions(this.context);
      
      // Get conversation history from context if available
      const conversationHistory = this.context.metadata?.conversationHistory || [];
      
      // Record trace event for assistant agent start
      this.recordTraceEvent("assistant_agent_start", {
        input_length: input.length,
        has_attachments: attachments && attachments.length > 0,
        history_length: conversationHistory.length
      });
      
      // Call the Supabase function for the assistant agent
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
            isHandoffContinuation: this.context.metadata?.isHandoffContinuation || false,
            previousAgentType: this.context.metadata?.previousAgentType || '',
            handoffReason: this.context.metadata?.handoffReason || '',
            instructions: instructions
          },
          conversationHistory: conversationHistory, // Pass conversation history
          metadata: {
            ...this.context.metadata,
            previousAgentType: 'main'
          },
          runId: this.context.runId,
          groupId: this.context.groupId
        }
      });
      
      if (error) {
        console.error("Assistant agent error:", error);
        this.recordTraceEvent("assistant_agent_error", {
          error: error.message || "Unknown error"
        });
        throw new Error(`Assistant agent error: ${error.message}`);
      }
      
      console.log("Agent response:", data);
      
      // Handle handoff if present
      let nextAgent = null;
      if (data?.handoffRequest) {
        console.log("Handoff requested to:", data.handoffRequest.targetAgent);
        nextAgent = data.handoffRequest.targetAgent;
        this.recordTraceEvent("assistant_agent_handoff", {
          target_agent: nextAgent,
          reason: data.handoffRequest.reason
        });
      }
      
      // Extract command suggestion if present
      const commandSuggestion = data?.commandSuggestion || null;
      
      // Apply output guardrails if configured
      const output = data?.completion || "I processed your request but couldn't generate a response.";
      await this.applyOutputGuardrails(output);
      
      // Record completion event
      this.recordTraceEvent("assistant_agent_complete", {
        response_length: output.length,
        has_handoff: !!nextAgent,
        has_command_suggestion: !!commandSuggestion
      });
      
      return {
        response: output,
        nextAgent: nextAgent,
        commandSuggestion: commandSuggestion,
        structured_output: data?.structured_output || null
      };
    } catch (error) {
      console.error("AssistantAgent run error:", error);
      this.recordTraceEvent("assistant_agent_error", {
        error: error instanceof Error ? error.message : "Unknown error"
      });
      throw error;
    }
  }
}
