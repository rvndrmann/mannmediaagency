
// Define basic trace utility functions

import { v4 as uuidv4 } from 'uuid';

/**
 * Basic trace event structure
 */
export interface TraceEvent {
  id: string;
  timestamp: number;
  type: string; 
  data: any;
  parentId?: string;
  eventType?: string; // Added for compatibility with TraceViewer
}

/**
 * Basic trace structure
 */
export interface Trace {
  id: string;
  name: string;
  start_time: number;
  end_time?: number;
  events: TraceEvent[];
  runId?: string;
  sessionId?: string;
}

/**
 * Available trace event types
 */
export enum TraceEventType {
  MESSAGE = 'message',
  TOOL_CALL = 'tool_call',
  TOOL_RESULT = 'tool_result',
  ERROR = 'error',
  THINKING = 'thinking',
  HANDOFF = 'handoff',
  CUSTOM = 'custom'
}

/**
 * Create a new trace
 */
export function createTrace(name: string, metadata?: any): Trace {
  return {
    id: uuidv4(),
    name,
    start_time: Date.now(),
    events: [],
    runId: uuidv4(),
    sessionId: uuidv4(),
    ...(metadata || {})
  };
}

/**
 * Create a trace event
 */
export function createTraceEvent(
  type: string, 
  data: any, 
  parentId?: string
): TraceEvent {
  return {
    id: uuidv4(),
    timestamp: Date.now(),
    type,
    eventType: type, // Added for compatibility with TraceViewer
    data,
    parentId
  };
}

/**
 * Add an event to a trace
 */
export function addEventToTrace(trace: Trace, event: TraceEvent): Trace {
  return {
    ...trace,
    events: [...trace.events, event]
  };
}

/**
 * Complete a trace by adding end time
 */
export function completeTrace(trace: Trace): Trace {
  return {
    ...trace,
    end_time: Date.now()
  };
}

/**
 * Save trace to local storage or API
 */
export async function saveTrace(trace: Trace): Promise<void> {
  // In a real implementation, this would save to a database or send to an API
  console.log('Saving trace:', trace);
  
  // For now, we'll just store in localStorage for development
  try {
    const traces = JSON.parse(localStorage.getItem('ai_traces') || '[]');
    traces.push(trace);
    localStorage.setItem('ai_traces', JSON.stringify(traces));
  } catch (error) {
    console.error('Error saving trace:', error);
  }
}

/**
 * Get all stored traces
 */
export function getTraces(): Trace[] {
  try {
    return JSON.parse(localStorage.getItem('ai_traces') || '[]');
  } catch (error) {
    console.error('Error getting traces:', error);
    return [];
  }
}

/**
 * Clear all traces
 */
export function clearTraces(): void {
  localStorage.removeItem('ai_traces');
}

/**
 * Format trace timestamp for display
 */
export function formatTraceTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString() + '.' + date.getMilliseconds().toString().padStart(3, '0');
}

/**
 * Format duration in milliseconds
 */
export function formatDuration(startTime: number, endTime: number): string {
  const duration = endTime - startTime;
  
  if (duration < 1000) {
    return `${duration}ms`;
  } else if (duration < 60000) {
    return `${(duration / 1000).toFixed(2)}s`;
  } else {
    const minutes = Math.floor(duration / 60000);
    const seconds = ((duration % 60000) / 1000).toFixed(2);
    return `${minutes}m ${seconds}s`;
  }
}

/**
 * Extract key data from a trace for display
 */
export function extractTraceData(trace: Trace) {
  const agentTypes = new Set<string>();
  const toolCalls = [];
  const messages = [];
  
  trace.events.forEach(event => {
    if (event.type === TraceEventType.MESSAGE) {
      messages.push(event);
      if (event.data?.agentType) {
        agentTypes.add(event.data.agentType);
      }
    } else if (event.type === TraceEventType.TOOL_CALL) {
      toolCalls.push(event);
    }
  });
  
  return {
    id: trace.id,
    name: trace.name,
    agentTypes: Array.from(agentTypes),
    messageCount: messages.length,
    toolCallCount: toolCalls.length,
    startTime: trace.start_time,
    endTime: trace.end_time || Date.now(),
    duration: formatDuration(trace.start_time, trace.end_time || Date.now()),
    runId: trace.runId,
    sessionId: trace.sessionId
  };
}

/**
 * Get a safe summary of a trace
 */
export function getSafeTraceSummary(trace: Trace) {
  if (!trace) return null;
  
  try {
    return extractTraceData(trace);
  } catch (error) {
    console.error('Error generating trace summary:', error);
    return {
      id: trace.id || 'unknown',
      name: trace.name || 'Unnamed Trace',
      agentTypes: [],
      messageCount: 0,
      toolCallCount: 0,
      startTime: trace.start_time || Date.now(),
      endTime: trace.end_time || Date.now(),
      duration: '0ms',
      error: 'Error processing trace data'
    };
  }
}

/**
 * Get safe trace events (with fallbacks for corrupted data)
 */
export function safeTraceEvents(trace: Trace): TraceEvent[] {
  if (!trace || !trace.events || !Array.isArray(trace.events)) {
    return [];
  }
  
  return trace.events.map(event => {
    // Ensure each event has basic required properties
    return {
      id: event.id || uuidv4(),
      timestamp: event.timestamp || Date.now(),
      type: event.type || 'unknown',
      eventType: event.type || 'unknown', // For compatibility with TraceViewer
      data: event.data || {},
      parentId: event.parentId
    };
  });
}
