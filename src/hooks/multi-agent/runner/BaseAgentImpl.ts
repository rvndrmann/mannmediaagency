
import { AgentOptions, AgentResult, AgentType, BaseAgent, RunnerContext } from "./types";
import { Attachment } from "@/types/message";

export abstract class BaseAgentImpl implements BaseAgent {
  protected context: RunnerContext;
  protected traceId: string;
  protected streamingHandler?: (chunk: string) => void;

  constructor(options: AgentOptions) {
    this.context = options.context;
    this.traceId = options.traceId;
    this.streamingHandler = options.streamingHandler;
  }

  abstract getType(): AgentType;
  abstract run(input: string, attachments?: Attachment[]): Promise<AgentResult>;

  setStreamingHandler(handler: (chunk: string) => void): void {
    this.streamingHandler = handler;
  }

  protected recordTraceEvent(eventType: string, eventData: any): void {
    if (this.context.tracingDisabled) return;
    
    try {
      console.log(`Agent ${this.getType()} recording trace event: ${eventType}`, {
        trace_id: this.traceId,
        event_type: eventType,
        agent_type: this.getType(),
        data: eventData
      });
    } catch (error) {
      console.error("Error recording trace event:", error);
    }
  }

  protected async getInstructions(context: RunnerContext): Promise<string> {
    // Get instructions for this agent type
    const defaultInstructions = this.getDefaultInstructions();
    
    // Use custom instructions if available
    const customInstructions = context.metadata?.instructions?.[this.getType()];
    
    return customInstructions || defaultInstructions;
  }

  protected getDefaultInstructions(): string {
    switch (this.getType()) {
      case "main":
        return "You are a helpful AI assistant focused on general tasks.";
      case "script":
        return "You are a script writer specializing in creating scripts for video content.";
      case "image":
        return "You are an image prompt generator specializing in creating detailed prompts for image generation.";
      case "tool":
        return "You are a tool agent specializing in executing tools and technical tasks.";
      case "scene":
        return "You are a scene creator specializing in creating detailed scene descriptions for video content.";
      case "data":
        return "You are a data agent specializing in analyzing and working with data.";
      case "assistant":
        return "You are a helpful AI assistant.";
      default:
        return "You are a helpful AI assistant.";
    }
  }

  protected async applyInputGuardrails(input: string): Promise<void> {
    // In the base implementation, we just record that the guardrail was applied
    this.recordTraceEvent("input_guardrail", {
      input_length: input.length,
      passed: true
    });
  }

  protected async applyOutputGuardrails(output: string): Promise<void> {
    // In the base implementation, we just record that the guardrail was applied
    this.recordTraceEvent("output_guardrail", {
      output_length: output.length,
      passed: true
    });
  }
}
