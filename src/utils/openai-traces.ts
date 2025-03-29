
/**
 * Utility for integrating with OpenAI Traces API
 */

export type TraceEventData = {
  trace_id: string;
  event_type: string;
  timestamp: string;
  data: any;
};

// Use import.meta.env instead of process.env for Vite compatibility
const OPENAI_TRACES_ENABLED = import.meta.env.VITE_OPENAI_TRACES_ENABLED === 'true';
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const OPENAI_API_BASE_URL = 'https://api.openai.com/v1';

/**
 * Initializes a new trace in OpenAI
 */
export async function initializeTrace(traceId: string, metadata: any): Promise<boolean> {
  if (!OPENAI_TRACES_ENABLED || !OPENAI_API_KEY) {
    console.log('OpenAI traces not enabled or API key not found');
    return false;
  }
  
  try {
    const response = await fetch(`${OPENAI_API_BASE_URL}/traces`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        id: traceId,
        metadata
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to initialize OpenAI trace:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error initializing OpenAI trace:', error);
    return false;
  }
}

/**
 * Records an event to an existing trace
 */
export async function recordTraceEvent(event: TraceEventData): Promise<boolean> {
  if (!OPENAI_TRACES_ENABLED || !OPENAI_API_KEY) {
    return false;
  }
  
  try {
    const response = await fetch(`${OPENAI_API_BASE_URL}/traces/${event.trace_id}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        type: event.event_type,
        timestamp: event.timestamp,
        data: event.data
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to record OpenAI trace event:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error recording OpenAI trace event:', error);
    return false;
  }
}

/**
 * Finalize a trace (mark it as complete)
 */
export async function finalizeTrace(traceId: string): Promise<boolean> {
  if (!OPENAI_TRACES_ENABLED || !OPENAI_API_KEY) {
    return false;
  }
  
  try {
    const response = await fetch(`${OPENAI_API_BASE_URL}/traces/${traceId}/finalize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      }
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to finalize OpenAI trace:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error finalizing OpenAI trace:', error);
    return false;
  }
}
