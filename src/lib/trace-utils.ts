
import { format, formatDistance } from 'date-fns';
import { safeStringify } from './safe-stringify';

/**
 * Format a trace timestamp for display
 */
export function formatTraceTimestamp(timestamp: string): string {
  if (!timestamp) return '';
  
  try {
    const date = new Date(timestamp);
    return format(date, 'h:mm:ss a, MMM d');
  } catch (e) {
    return timestamp;
  }
}

/**
 * Format a duration in milliseconds to a human-readable string
 */
export function formatDuration(durationMs: number): string {
  if (!durationMs || durationMs <= 0) return '0s';
  
  const seconds = Math.floor(durationMs / 1000);
  
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes < 60) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  return `${hours}h ${remainingMinutes}m ${remainingSeconds}s`;
}

/**
 * Calculate time elapsed between two dates
 */
export function calculateElapsedTime(startTime?: string, endTime?: string): string {
  if (!startTime) return '';
  
  try {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    
    return formatDistance(start, end, { includeSeconds: true });
  } catch (e) {
    return '';
  }
}

/**
 * Safely extract trace data from metadata
 */
export function extractTraceData(metadata: any): any {
  if (!metadata) return null;
  
  try {
    // Handle string metadata (needs parsing)
    if (typeof metadata === 'string') {
      try {
        metadata = JSON.parse(metadata);
      } catch (e) {
        return null;
      }
    }
    
    // Handle different metadata structures
    if (metadata.trace) {
      return metadata.trace;
    }
    
    // Some systems store it nested
    if (typeof metadata === 'object' && metadata !== null) {
      // Look for trace property at any level
      const findTrace = (obj: any): any => {
        if (obj.trace) return obj.trace;
        
        for (const key in obj) {
          if (typeof obj[key] === 'object' && obj[key] !== null) {
            const result = findTrace(obj[key]);
            if (result) return result;
          }
        }
        
        return null;
      };
      
      return findTrace(metadata);
    }
  } catch (e) {
    console.error('Error extracting trace data:', e);
  }
  
  return null;
}

/**
 * Get a safe summary of a trace
 */
export function getSafeTraceSummary(trace: any): any {
  if (!trace) return null;
  
  try {
    // For object traces
    if (typeof trace === 'object' && trace !== null) {
      if (trace.summary) {
        return {
          agentTypes: Array.isArray(trace.summary.agentTypes) ? trace.summary.agentTypes : [],
          handoffs: typeof trace.summary.handoffs === 'number' ? trace.summary.handoffs : 0,
          toolCalls: typeof trace.summary.toolCalls === 'number' ? trace.summary.toolCalls : 0,
          success: Boolean(trace.summary.success),
          duration: typeof trace.summary.duration === 'number' ? trace.summary.duration : 0,
          messageCount: typeof trace.summary.messageCount === 'number' ? trace.summary.messageCount : 0
        };
      }
      
      // Construct a basic summary if not present
      return {
        agentTypes: [],
        handoffs: 0,
        toolCalls: 0,
        success: false,
        duration: 0,
        messageCount: 0
      };
    }
  } catch (e) {
    console.error('Error getting trace summary:', e);
  }
  
  return null;
}

/**
 * Safely convert trace events to a serializable format
 */
export function safeTraceEvents(events: any[]): any[] {
  if (!Array.isArray(events)) return [];
  
  try {
    return events.map(event => {
      // Clean up event data to prevent circular references
      const safeData = event.data ? JSON.parse(safeStringify(event.data)) : null;
      
      return {
        eventType: event.eventType || 'unknown',
        timestamp: event.timestamp || '',
        agentType: event.agentType || 'Unknown',
        data: safeData
      };
    });
  } catch (e) {
    console.error('Error processing trace events:', e);
    return [];
  }
}
