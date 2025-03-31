
import { AgentResult, AgentType, RunnerContext, AgentOptions } from "../types";

export abstract class BaseAgentImpl {
  protected context: RunnerContext;
  protected traceId?: string;
  
  constructor(options: AgentOptions) {
    if (!options.context) {
      throw new Error('Context is required for BaseAgentImpl');
    }
    this.context = options.context;
    this.traceId = options.traceId;
  }
  
  abstract getType(): AgentType;
  
  // This method will be implemented by each agent
  async process(input: any, context: RunnerContext): Promise<AgentResult> {
    throw new Error("Method not implemented");
  }
  
  // Add trace event if possible
  protected addTraceEvent(event: any): void {
    if (this.context?.addMessage) {
      this.context.addMessage(JSON.stringify(event), event.type || "event");
    }
  }
  
  // Helper methods for derived classes
  protected recordTraceEvent(event: any): void {
    this.addTraceEvent(event);
  }
  
  // Apply input guardrails - to be used by derived classes
  protected async applyInputGuardrails(input: any): Promise<any> {
    // Default implementation does nothing
    return input;
  }
  
  // Apply output guardrails - to be used by derived classes
  protected async applyOutputGuardrails(output: any): Promise<any> {
    // Default implementation does nothing
    return output;
  }
  
  // Get instructions for the agent - to be overridden by derived classes
  protected getInstructions(): string {
    return "";
  }
}
