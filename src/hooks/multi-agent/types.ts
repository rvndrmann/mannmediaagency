
import { AgentType } from "@/hooks/use-multi-agent-chat";
import { Command, HandoffRequest, Message, Task } from "@/types/message";

export interface ToolContext {
  userId: string;
  sessionId: string;
  messageId: string;
  attachments: any[];
}

export interface ToolResult {
  success: boolean;
  data: any;
  error?: string;
}

/**
 * Manages trace creation and events for agent runs
 */
export class TraceManager {
  private activeTraces: Map<string, any> = new Map();
  
  /**
   * Start a new trace with the given ID and metadata
   */
  startTrace(traceId: string, metadata?: any): void {
    console.log(`Starting trace ${traceId}`, metadata);
    this.activeTraces.set(traceId, {
      id: traceId,
      startTime: Date.now(),
      events: [],
      metadata
    });
  }
  
  /**
   * Add an event to an active trace
   */
  addEvent(traceId: string, eventType: string, data: any): void {
    if (!this.activeTraces.has(traceId)) {
      console.warn(`Attempted to add event to non-existent trace ${traceId}`);
      return;
    }
    
    const trace = this.activeTraces.get(traceId);
    trace.events.push({
      id: crypto.randomUUID(),
      type: eventType,
      timestamp: Date.now(),
      data
    });
    
    console.log(`Added ${eventType} event to trace ${traceId}`, data);
  }
  
  /**
   * Complete a trace and save it
   */
  completeTrace(traceId: string): void {
    if (!this.activeTraces.has(traceId)) {
      console.warn(`Attempted to complete non-existent trace ${traceId}`);
      return;
    }
    
    const trace = this.activeTraces.get(traceId);
    trace.endTime = Date.now();
    trace.duration = trace.endTime - trace.startTime;
    
    // In a real implementation, this would save to a database
    console.log(`Completed trace ${traceId}`, {
      id: traceId,
      duration: trace.duration,
      eventCount: trace.events.length
    });
    
    // Store in localStorage for now
    try {
      const traces = JSON.parse(localStorage.getItem('agent_traces') || '[]');
      traces.push(trace);
      localStorage.setItem('agent_traces', JSON.stringify(traces));
    } catch (err) {
      console.error('Error saving trace to localStorage:', err);
    }
    
    // Clean up
    this.activeTraces.delete(traceId);
  }
  
  /**
   * Get all stored traces
   */
  getTraces(): any[] {
    try {
      return JSON.parse(localStorage.getItem('agent_traces') || '[]');
    } catch (err) {
      console.error('Error retrieving traces:', err);
      return [];
    }
  }
}
