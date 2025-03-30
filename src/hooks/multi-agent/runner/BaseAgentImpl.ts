
import { AgentResult, AgentType, RunnerContext } from "./types";
import { Attachment } from "@/types/message";
import { recordTraceEvent } from "@/utils/openai-traces";

export abstract class BaseAgentImpl {
  protected context: RunnerContext;
  protected traceId?: string;
  protected streamingHandler?: (chunk: string) => void;

  constructor(options: { 
    context: RunnerContext, 
    traceId?: string,
    streamingHandler?: (chunk: string) => void 
  }) {
    this.context = options.context;
    this.traceId = options.traceId;
    this.streamingHandler = options.streamingHandler;
  }

  abstract getType(): AgentType;
  
  abstract run(input: string, attachments?: Attachment[]): Promise<AgentResult>;
  
  protected recordTraceEvent(eventType: string, eventData: any) {
    if (this.traceId && !this.context.tracingDisabled) {
      try {
        console.log(`Agent ${this.getType()} recording trace event: ${eventType}`, {
          trace_id: this.traceId,
          event_type: eventType,
          agent_type: this.getType(),
          data: eventData
        });
        
        // Send the event to OpenAI's trace endpoint
        recordTraceEvent({
          trace_id: this.traceId,
          event_type: eventType,
          timestamp: new Date().toISOString(),
          data: {
            agent_type: this.getType(),
            ...eventData
          }
        }).catch(err => {
          console.error(`Error sending trace event to OpenAI: ${err.message}`);
        });
      } catch (error) {
        console.error(`Error recording trace event in ${this.getType()} agent:`, error);
      }
    }
  }
  
  // Utility methods that all agent implementations need
  protected async getInstructions(context: RunnerContext): Promise<string> {
    // Get dynamic instructions from context if available, or use defaults
    const agentType = this.getType();
    const instructions = context.metadata?.instructions?.[agentType] || 
                        this.getDefaultInstructions();
                        
    return instructions;
  }
  
  protected getDefaultInstructions(): string {
    // Default instructions based on agent type
    switch (this.getType()) {
      case "main":
        return "You are a helpful AI assistant focused on general tasks.";
      case "script":
        return "You specialize in writing scripts and creative content. When asked for a script, you MUST provide one, not just talk about it.";
      case "image":
        return "You specialize in creating detailed image prompts.";
      case "tool":
        return "You specialize in executing tools and technical tasks.";
      case "scene":
        return "You specialize in creating detailed visual scene descriptions.";
      case "data":
        return "You specialize in extracting and managing data from various sources.";
      default:
        return "You are a helpful AI assistant.";
    }
  }
  
  protected async applyInputGuardrails(input: string): Promise<void> {
    // Default implementation - can be extended by subclasses
    if (!input) {
      throw new Error("Input cannot be empty");
    }
    
    // Record guardrail event
    this.recordTraceEvent("input_guardrail", {
      input_length: input.length,
      passed: true
    });
    
    return Promise.resolve();
  }
  
  protected async applyOutputGuardrails(output: string): Promise<void> {
    // Default implementation - can be extended by subclasses
    if (!output) {
      throw new Error("Output cannot be empty");
    }
    
    // Record guardrail event
    this.recordTraceEvent("output_guardrail", {
      output_length: output.length,
      passed: true
    });
    
    return Promise.resolve();
  }
  
  // Register a streaming handler for this agent
  public setStreamingHandler(handler: (chunk: string) => void): void {
    this.streamingHandler = handler;
  }
}
