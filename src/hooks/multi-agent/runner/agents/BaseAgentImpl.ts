
import { AgentOptions, AgentType, AgentResult, RunnerContext } from "../types";
import { v4 as uuidv4 } from "uuid";

export abstract class BaseAgentImpl {
  protected name: string;
  protected instructions: string;
  protected context: RunnerContext;
  protected traceId: string;
  protected tools: any[] = [];
  protected model?: string;

  constructor(options: AgentOptions) {
    this.name = options.name;
    this.instructions = options.instructions;
    this.context = options.context;
    this.traceId = options.traceId || uuidv4();
    this.tools = options.tools || [];
    this.model = options.model;
  }

  abstract getType(): AgentType;

  async run(input: string, context: RunnerContext): Promise<AgentResult> {
    return this.process(input, context);
  }

  abstract process(input: string, context: RunnerContext): Promise<AgentResult>;

  protected getInstructions(): string {
    return this.instructions;
  }

  protected recordTraceEvent(eventType: string, data: Record<string, any> = {}): void {
    if (!this.context.tracingEnabled) return;
    
    const eventData = {
      agent_type: this.getType(),
      trace_id: this.traceId,
      event_type: eventType,
      timestamp: new Date().toISOString(),
      ...data
    };
    
    console.log(`[TRACE:${this.traceId}] ${eventType}`, eventData);
    
    // Add to trace record if the context has a callback
    if (this.context.addMessage) {
      this.context.addMessage(JSON.stringify(eventData), `agent_${eventType}`);
    }
  }

  protected async handoff(targetAgent: AgentType, reason: string, additionalContext: any = {}): Promise<AgentResult> {
    this.recordTraceEvent("handoff_initiated", {
      target_agent: targetAgent,
      reason
    });
    
    return {
      response: `I'm transferring you to our ${targetAgent} specialist who can better assist with this request.`,
      output: `I'm transferring you to our ${targetAgent} specialist who can better assist with this request.`,
      nextAgent: targetAgent,
      handoffReason: reason,
      structured_output: null,
      additionalContext
    };
  }
  
  // Default error handler
  protected handleError(error: Error): AgentResult {
    this.recordTraceEvent("agent_error", {
      error_message: error.message,
      error_stack: error.stack
    });
    
    return {
      response: "I'm sorry, but I encountered an error while processing your request. Please try again.",
      output: "I'm sorry, but I encountered an error while processing your request. Please try again.",
      nextAgent: null,
      handoffReason: null
    };
  }
}
