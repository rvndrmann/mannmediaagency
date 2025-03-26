
// Utility functions for OpenAI traces
import { supabase } from '@/integrations/supabase/client';

export type TraceEvent = {
  eventType: string;
  timestamp: string;
  agentType?: string;
  data: any;
};

export type TraceSummary = {
  agentTypes: string[];
  handoffs: number;
  toolCalls: number;
  success: boolean;
  duration: number;
  messageCount?: number;
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
  summary?: TraceSummary;
};

// Function to safely access trace data from metadata
const safeGetTraceFromMetadata = (metadata: any) => {
  if (!metadata) return null;
  
  // Handle both string and object metadata formats
  try {
    // If metadata is a JSON string, parse it
    const metadataObj = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
    
    // Check if trace exists in the metadata
    if (metadataObj && typeof metadataObj === 'object' && metadataObj.trace) {
      return metadataObj.trace;
    }
    
    return null;
  } catch (e) {
    console.error("Error accessing trace from metadata:", e);
    return null;
  }
};

// Function to save a trace to Supabase
export const saveTrace = async (trace: Trace): Promise<void> => {
  try {
    // First, check if we already have trace data in the agent_interactions table
    const { data: existingData, error: checkError } = await supabase
      .from('agent_interactions')
      .select('id, metadata')
      .filter('metadata->trace->runId', 'eq', trace.id)
      .limit(1);
    
    if (checkError) {
      console.error("Error checking for existing trace:", checkError);
      return;
    }
    
    // If no existing data, create a summary record
    if (!existingData || existingData.length === 0) {
      // Calculate trace summary
      const summary = generateTraceSummary(trace);
      
      // Save summary trace entry
      const { error } = await supabase
        .from('agent_interactions')
        .insert({
          user_id: trace.userId,
          agent_type: 'trace_summary',
          user_message: `Trace ${trace.id}`,
          assistant_response: `Multi-agent conversation with ${summary.agentTypes.length} agents`,
          metadata: {
            trace: {
              runId: trace.id,
              sessionId: trace.sessionId,
              summary,
              events: trace.events.slice(0, 5), // Just store a few key events
              startTime: trace.startTime,
              endTime: trace.endTime || new Date().toISOString()
            }
          },
          timestamp: trace.startTime,
          group_id: trace.sessionId
        });
      
      if (error) {
        console.error("Error saving trace summary:", error);
      }
    } else {
      // Update the existing trace with the latest information
      const existingRecord = existingData[0];
      const existingMetadata = existingRecord.metadata || {};
      const existingTrace = safeGetTraceFromMetadata(existingMetadata) || {};
      
      // Initialize updatedEvents array
      const updatedEvents: any[] = [];
      
      // If existingTrace.events exists and is an array, add them to updatedEvents
      if (existingTrace && typeof existingTrace === 'object' && 'events' in existingTrace && Array.isArray(existingTrace.events)) {
        updatedEvents.push(...existingTrace.events);
      }
      
      // Add the new events, safely appending to existing
      if (trace.events && Array.isArray(trace.events)) {
        for (const event of trace.events.slice(-5)) {
          updatedEvents.push(event);
        }
      }
      
      // Create an updated metadata object with the new trace information
      const updatedMetadata = { 
        ...existingMetadata,
        trace: {
          ...(typeof existingTrace === 'object' ? existingTrace : {}),
          events: updatedEvents,
          endTime: trace.endTime || new Date().toISOString(),
          summary: generateTraceSummary(trace)
        }
      };
      
      const { error } = await supabase
        .from('agent_interactions')
        .update({
          metadata: updatedMetadata
        })
        .eq('id', existingRecord.id);
        
      if (error) {
        console.error("Error updating trace:", error);
      }
    }
    
    console.log("Trace saved/updated:", trace.id);
  } catch (error) {
    console.error("Error in saveTrace:", error);
  }
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

// Helper function to format duration in a human-readable way
export const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
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
export const generateTraceSummary = (trace: Trace): TraceSummary => {
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
  
  // Count messages
  const messageCount = trace.messages?.length || 0;
  
  return {
    agentTypes,
    handoffs,
    toolCalls,
    success,
    duration,
    messageCount
  };
};
