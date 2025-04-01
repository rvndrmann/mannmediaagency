
import { AgentOptions, AgentResult, AgentType, RunnerContext } from "../types";

/**
 * Base implementation of an agent with common functionality
 */
export abstract class BaseAgentImpl {
  protected context: RunnerContext;
  protected traceId: string;
  protected model: string;
  protected config: any;
  
  constructor(options: AgentOptions) {
    this.context = options.context;
    this.traceId = options.traceId || `agent-${Date.now()}`;
    this.model = options.model || "gpt-3.5-turbo";
    this.config = options.config || {};
  }
  
  /**
   * Get the agent type
   */
  abstract getType(): AgentType;
  
  /**
   * Process the input and generate a response
   */
  abstract process(input: string, context: RunnerContext): Promise<AgentResult>;
  
  /**
   * Run the agent with the given input
   */
  async run(input: string, context: RunnerContext): Promise<AgentResult> {
    try {
      if (context.tracingEnabled && context.addMessage) {
        context.addMessage(`Running ${this.getType()} agent with input: ${input.substring(0, 100)}...`, "agent_start");
      }
      
      const result = await this.process(input, context);
      
      if (context.tracingEnabled && context.addMessage) {
        context.addMessage(`Completed ${this.getType()} agent run`, "agent_end");
      }
      
      return {
        response: result.response || result.output || "",
        nextAgent: result.nextAgent,
        handoffReason: result.handoffReason,
        structured_output: result.structured_output,
        additionalContext: result.additionalContext
      };
      
    } catch (error) {
      console.error(`Error in ${this.getType()} agent:`, error);
      
      if (context.tracingEnabled && context.addMessage) {
        context.addMessage(`Error in ${this.getType()} agent: ${error}`, "agent_error");
      }
      
      return {
        response: `Error processing request with ${this.getType()} agent: ${error instanceof Error ? error.message : String(error)}`,
        nextAgent: null
      };
    }
  }
  
  /**
   * Record a trace event for debugging purposes
   */
  protected recordTraceEvent(event: Record<string, any>): void {
    if (this.context.tracingEnabled && this.context.addMessage) {
      this.context.addMessage(JSON.stringify(event), "trace");
    }
  }
  
  /**
   * Get the instructions for this agent
   */
  protected getInstructions(): string {
    return `You are an AI assistant specialized in ${this.getType()} tasks.`;
  }
  
  /**
   * Apply input guardrails - placeholder
   */
  protected async applyInputGuardrails(input: string): Promise<string> {
    return input;
  }
  
  /**
   * Apply output guardrails - placeholder
   */
  protected async applyOutputGuardrails(output: any): Promise<any> {
    return output;
  }
}
