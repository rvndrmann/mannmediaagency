import { AgentResult, AgentType, RunnerContext } from "../types";
import { Attachment } from "@/types/message";

export abstract class BaseAgentImpl {
  protected context: RunnerContext;
  protected traceId?: string;

  constructor(options: { context: RunnerContext, traceId?: string }) {
    this.context = options.context;
    this.traceId = options.traceId;
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
        
        // Here you would send the event to OpenAI's trace endpoint
        // This is where you'd implement the actual API call to OpenAI
      } catch (error) {
        console.error(`Error recording trace event in ${this.getType()} agent:`, error);
      }
    }
  }
}
