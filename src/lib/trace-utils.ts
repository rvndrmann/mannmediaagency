
// Utility functions for OpenAI traces

export type TraceEvent = {
  eventType: string;
  timestamp: string;
  agentType?: string;
  data: any;
};

export type Trace = {
  id: string;
  runId: string;
  userId: string;
  sessionId: string;
  messages: any[];
  events: TraceEvent[];
  startTime: string;
  endTime?: string;
  summary?: {
    agentTypes: string[];
    handoffs: number;
    toolCalls: number;
    success: boolean;
    duration: number;
  };
};

// Function to save a trace to Supabase
export const saveTrace = async (trace: Trace): Promise<void> => {
  // This is a placeholder for the actual implementation
  console.log("Trace saved:", trace.id);
};

// Function to format a timestamp
export const formatTraceTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleString();
};

// Function to calculate duration between two timestamps in seconds
export const calculateDuration = (startTime: string, endTime: string): number => {
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  return (end - start) / 1000;
};

// Function to generate a simplified trace event
export const createTraceEvent = (
  eventType: string, 
  data: any, 
  agentType?: string
): TraceEvent => {
  return {
    eventType,
    timestamp: new Date().toISOString(),
    agentType,
    data
  };
};

// Function to generate a summary from trace events
export const generateTraceSummary = (trace: Trace): Trace['summary'] => {
  // Extract unique agent types
  const agentTypes = [...new Set(
    trace.events
      .filter(e => e.agentType)
      .map(e => e.agentType)
  )] as string[];
  
  // Count handoffs
  const handoffs = trace.events
    .filter(e => e.eventType === 'handoff')
    .length;
  
  // Count tool calls
  const toolCalls = trace.events
    .filter(e => e.eventType === 'tool_call')
    .length;
  
  // Determine if successful
  const success = !trace.events.some(e => 
    e.eventType === 'error' || 
    (e.eventType === 'completion' && e.data?.success === false)
  );
  
  // Calculate duration
  const duration = trace.endTime ? 
    calculateDuration(trace.startTime, trace.endTime) : 
    0;
  
  return {
    agentTypes,
    handoffs,
    toolCalls,
    success,
    duration
  };
};
