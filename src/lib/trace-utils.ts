
import { v4 as uuidv4 } from "uuid";
import { safeStringify } from "./safe-stringify";

// Basic trace event type
export interface TraceEvent {
  id: string;
  type: string;
  timestamp: string;
  data?: any;
  parent_id?: string;
}

// Trace metadata
export interface Trace {
  id: string;
  name: string;
  start_time: string;
  end_time?: string;
  events: TraceEvent[];
  metadata?: Record<string, any>;
}

// Create a new trace
export function createTrace(name: string, metadata?: Record<string, any>): Trace {
  return {
    id: uuidv4(),
    name,
    start_time: new Date().toISOString(),
    events: [],
    metadata
  };
}

// Add event to a trace
export function addTraceEvent(
  trace: Trace,
  eventType: string,
  data?: any,
  parentId?: string
): Trace {
  // Make a copy to avoid mutating the original
  const updatedTrace = { ...trace };
  
  // Process data to ensure it's serializable
  const safeData = data ? JSON.parse(safeStringify(data)) : undefined;
  
  // Add the new event
  updatedTrace.events = [
    ...updatedTrace.events,
    {
      id: uuidv4(),
      type: eventType,
      timestamp: new Date().toISOString(),
      data: safeData,
      parent_id: parentId
    }
  ];
  
  return updatedTrace;
}

// Complete a trace
export function completeTrace(trace: Trace, metadata?: Record<string, any>): Trace {
  return {
    ...trace,
    end_time: new Date().toISOString(),
    metadata: {
      ...trace.metadata,
      ...metadata
    }
  };
}

// Create a trace event (for the runner)
export function createTraceEvent(
  eventType: string,
  data?: any,
  parentId?: string
): TraceEvent {
  // Process data to ensure it's serializable
  const safeData = data ? JSON.parse(safeStringify(data)) : undefined;
  
  return {
    id: uuidv4(),
    type: eventType,
    timestamp: new Date().toISOString(),
    data: safeData,
    parent_id: parentId
  };
}

// Save trace (for the runner)
export async function saveTrace(trace: Trace): Promise<boolean> {
  try {
    // This would be implemented to save to your backend
    console.log("Saving trace:", trace.id);
    return true;
  } catch (error) {
    console.error("Error saving trace:", error);
    return false;
  }
}

// Helper to find events of a specific type in a trace
export function findEventsByType(trace: Trace, eventType: string): TraceEvent[] {
  return trace.events.filter(event => event.type === eventType);
}

// Helper to find an event by ID
export function findEventById(trace: Trace, eventId: string): TraceEvent | undefined {
  return trace.events.find(event => event.id === eventId);
}

// Helper to find child events of a parent
export function findChildEvents(trace: Trace, parentId: string): TraceEvent[] {
  return trace.events.filter(event => event.parent_id === parentId);
}

// Export trace as JSON
export function exportTraceAsJson(trace: Trace): string {
  return safeStringify(trace);
}

// Format trace timestamp
export function formatTraceTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleString();
  } catch (error) {
    return timestamp;
  }
}

// Format duration between two timestamps in milliseconds
export function formatDuration(duration: number): string {
  if (duration < 1000) {
    return `${duration}ms`;
  } else if (duration < 60000) {
    return `${(duration / 1000).toFixed(2)}s`;
  } else {
    const minutes = Math.floor(duration / 60000);
    const seconds = ((duration % 60000) / 1000).toFixed(1);
    return `${minutes}m ${seconds}s`;
  }
}

// Extract trace data safely
export function extractTraceData(trace: any): Trace {
  if (!trace) {
    return createTrace('Empty Trace');
  }
  
  try {
    if (typeof trace === 'string') {
      trace = JSON.parse(trace);
    }
    
    return {
      id: trace.id || uuidv4(),
      name: trace.name || 'Unnamed Trace',
      start_time: trace.start_time || new Date().toISOString(),
      end_time: trace.end_time,
      events: Array.isArray(trace.events) ? trace.events : [],
      metadata: trace.metadata || {}
    };
  } catch (error) {
    console.error('Error extracting trace data:', error);
    return createTrace('Error Trace');
  }
}

// Get safe trace summary
export function getSafeTraceSummary(trace: Trace): any {
  try {
    if (!trace) return { success: false, error: 'No trace data' };
    
    const handoffs = trace.events.filter(e => e.type === 'handoff').length;
    const toolCalls = trace.events.filter(e => e.type === 'tool_call').length;
    const errorEvents = trace.events.filter(e => e.type === 'error');
    
    return {
      agentTypes: Array.from(new Set(trace.events
        .filter(e => e.data?.agentType)
        .map(e => e.data.agentType))),
      handoffs,
      toolCalls,
      success: errorEvents.length === 0,
      duration: trace.end_time 
        ? new Date(trace.end_time).getTime() - new Date(trace.start_time).getTime()
        : 0,
    };
  } catch (error) {
    console.error('Error getting trace summary:', error);
    return { success: false, error: 'Failed to process trace data' };
  }
}

// Get safe trace events (with error handling)
export function safeTraceEvents(trace: Trace): TraceEvent[] {
  if (!trace || !Array.isArray(trace.events)) {
    return [];
  }
  return trace.events;
}
