
import { AgentResult, AgentType, RunnerContext } from "../types";

export abstract class BaseAgentImpl {
  protected context: RunnerContext;
  protected traceId?: string;
  
  constructor(options: { context: RunnerContext; traceId?: string }) {
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
}
