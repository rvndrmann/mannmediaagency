import { RunnerContext, AgentType, AgentResult, AgentOptions } from "../types";
import { Attachment } from "@/types/message";

export abstract class BaseAgentImpl {
  protected context: RunnerContext;
  protected traceId: string;

  constructor(options: { context: RunnerContext, traceId?: string }) {
    this.context = options.context;
    this.traceId = options.traceId || "unknown";
  }

  async process(input: string, context: RunnerContext): Promise<AgentResult> {
    this.context = context;
    this.recordTraceEvent("agent_start", `Starting ${this.getType()} agent processing`);
    
    // Apply input guardrails if they exist
    if (this.applyInputGuardrails) {
      const guardrailResult = await this.applyInputGuardrails(input);
      if (guardrailResult.shouldBlock) {
        this.recordTraceEvent("guardrail_block", `Input blocked by guardrail: ${guardrailResult.reason}`);
        return {
          output: guardrailResult.message || "Your message was blocked by a guardrail."
        };
      }
    }
    
    try {
      // Run the agent-specific logic
      const result = await this.run(input, context.attachments || []);
      
      // If the result already has an output property, return it
      if ('output' in result) {
        this.recordTraceEvent("agent_complete", `${this.getType()} agent completed with output`);
        return result;
      }
      
      // Otherwise, construct the expected output format
      this.recordTraceEvent("agent_complete", `${this.getType()} agent completed with response`);
      return {
        output: result.response || "Empty response",
        nextAgent: result.nextAgent,
        handoffReason: result.handoffReason,
        structured_output: result.structured_output,
        additionalContext: result.additionalContext
      };
    } catch (error) {
      this.recordTraceEvent("agent_error", `${this.getType()} agent error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error(`Error in ${this.getType()} agent:`, error);
      return {
        output: `The ${this.getType()} agent encountered an error. Please try again.`
      };
    }
  }
  
  // Can be overridden by subclasses
  protected async applyInputGuardrails(input: string): Promise<{ shouldBlock: boolean, reason?: string, message?: string }> {
    return { shouldBlock: false };
  }
  
  // Can be overridden by subclasses
  protected async applyOutputGuardrails(output: string): Promise<{ shouldBlock: boolean, reason?: string, message?: string }> {
    return { shouldBlock: false };
  }
  
  // Get instructions for this agent (can be overridden by subclasses)
  protected async getInstructions(context: RunnerContext): Promise<string> {
    return "Default instructions";
  }
  
  // Record trace event if tracing is enabled
  protected recordTraceEvent(eventType: string, message: string): void {
    if (this.context.tracingDisabled) return;
    
    // Use the context's addMessage function if available
    if (this.context.addMessage) {
      this.context.addMessage(message, eventType);
    }
    
    // Always log to console for debugging
    console.log(`[TRACE:${this.traceId}] [${eventType}] ${message}`);
  }
  
  // Abstract methods to be implemented by subclasses
  abstract run(input: string, attachments: Attachment[]): Promise<AgentResult | any>;
  abstract getType(): AgentType;
}
