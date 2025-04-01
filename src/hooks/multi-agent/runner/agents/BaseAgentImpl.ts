
import { AgentType, AgentResult, RunnerContext, BaseAgent, AgentOptions } from "../types";
import { v4 as uuidv4 } from "uuid";

export abstract class BaseAgentImpl implements BaseAgent {
  protected name: string;
  protected instructions: string;
  protected tools: any[];
  protected context: RunnerContext;
  protected traceId: string;
  protected model: string;

  constructor(options: AgentOptions) {
    this.name = options.name;
    this.instructions = options.instructions || `You are a helpful AI ${options.name} agent.`;
    this.tools = options.tools || [];
    this.context = options.context || {};
    this.traceId = options.traceId || uuidv4();
    this.model = options.model || 'gpt-4o';
  }

  abstract getType(): AgentType;
  
  abstract process(input: string, context: RunnerContext): Promise<AgentResult>;
  
  getInstructions(): string {
    return this.instructions;
  }
  
  getTools(): any[] {
    return this.tools;
  }
  
  async run(input: string, context: RunnerContext): Promise<AgentResult> {
    try {
      // Merge context with this.context
      const mergedContext: RunnerContext = {
        ...this.context,
        ...context,
        metadata: {
          ...this.context.metadata,
          ...context.metadata
        }
      };
      
      // Record trace event if enabled
      this.recordTraceEvent("run_start", { 
        message: `Starting agent run with ${this.name}`,
        input_length: input.length
      });
      
      // Process the input with the agent
      const result = await this.process(input, mergedContext);
      
      // Record trace event if enabled
      this.recordTraceEvent("run_complete", { 
        message: `Completed agent run with ${this.name}`,
        output_length: result.response.length,
        has_handoff: !!result.nextAgent
      });
      
      return result;
    } catch (error) {
      // Record trace error event if enabled
      this.recordTraceEvent("run_error", { 
        message: `Error in agent run with ${this.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error_type: error instanceof Error ? error.name : 'Unknown'
      });
      
      console.error(`Error in ${this.name} run:`, error);
      return {
        response: `The ${this.name} agent encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        output: `The ${this.name} agent encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        nextAgent: null,
        structured_output: null
      };
    }
  }
  
  protected recordTraceEvent(eventType: string, data: Record<string, any>): void {
    if (this.context.tracingEnabled && this.context.addMessage) {
      this.context.addMessage(JSON.stringify({
        event_type: eventType,
        agent_type: this.getType(),
        agent_name: this.name,
        timestamp: new Date().toISOString(),
        trace_id: this.traceId,
        ...data
      }), 'trace');
    }
  }
}
