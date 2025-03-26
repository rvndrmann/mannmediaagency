
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
