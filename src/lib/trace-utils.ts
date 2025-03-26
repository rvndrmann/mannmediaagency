
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
export function createTrace(name: string): Trace {
  return {
    id: uuidv4(),
    name,
    start_time: Date.now(),
    events: [],
    runId: uuidv4(),
    sessionId: uuidv4()
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
