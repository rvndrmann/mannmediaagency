
/**
 * Safely extracts trace data from metadata
 */
export const safeGetTrace = (metadata: any) => {
  if (!metadata) return null;
  
  try {
    // If metadata is a string, try to parse it
    const data = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
    
    // Check if trace property exists in the metadata
    return data && typeof data === 'object' && data.trace ? data.trace : null;
  } catch (error) {
    console.error('Error parsing trace metadata:', error);
    return null;
  }
};

/**
 * Safely formats a date string or returns a fallback
 */
export const formatTraceDate = (dateString: string | null | undefined, fallback = 'Unknown date') => {
  if (!dateString) return fallback;
  
  try {
    return new Date(dateString).toLocaleString();
  } catch (error) {
    return fallback;
  }
};

/**
 * Safely calculates duration between two timestamps
 */
export const calculateDuration = (start: string | null | undefined, end: string | null | undefined) => {
  if (!start || !end) return 0;
  
  try {
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    return (endTime - startTime) / 1000;
  } catch (error) {
    return 0;
  }
};
