
// Utility functions to check task status
export const isTaskPending = (status: string): boolean => {
  return status === 'pending';
};

export const isTaskInProgress = (status: string): boolean => {
  return status === 'in_progress' || status === 'in-progress' || status === 'running';
};

export const isTaskCompleted = (status: string): boolean => {
  return status === 'completed' || status === 'finished';
};

export const isTaskFailed = (status: string): boolean => {
  return status === 'failed' || status === 'error' || status === 'stopped';
};

// Helper to create properly typed messages
export const createTypedMessage = (props: {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  createdAt: string;
  agentType?: string;
  status?: "thinking" | "completed" | "error";
}) => {
  return props;
};

// Safely parse JSON with error handling
export const safeJsonParse = (text: string, fallback: any = null): any => {
  if (!text) return fallback;
  
  try {
    return JSON.parse(text);
  } catch (error) {
    console.error("JSON parse error:", error);
    console.log("Failed to parse text:", text);
    return fallback;
  }
};

// Safely stringify JSON with error handling
export const safeJsonStringify = (data: any, fallback: string = "{}"): string => {
  if (!data) return fallback;
  
  try {
    return JSON.stringify(data);
  } catch (error) {
    console.error("JSON stringify error:", error);
    return fallback;
  }
};

// Helper to safely handle browser-use API responses
export const handleBrowserUseApiResponse = async (response: Response) => {
  if (!response.ok) {
    const errorText = await response.text();
    console.error("API Error Response:", errorText);
    try {
      // Try to parse as JSON if possible
      const errorJson = JSON.parse(errorText);
      throw new Error(errorJson.error || `API returned ${response.status}`);
    } catch (e) {
      // If parsing fails, use the raw text
      throw new Error(`API returned ${response.status}: ${errorText.substring(0, 100)}`);
    }
  }
  
  try {
    // First try to get the text
    const text = await response.text();
    
    // If empty, return an empty object
    if (!text || text.trim() === '') {
      console.warn("Empty response received");
      return {};
    }
    
    // Try to parse the text as JSON
    try {
      return JSON.parse(text);
    } catch (jsonError) {
      console.error("Failed to parse response as JSON:", jsonError);
      console.log("Raw response:", text);
      throw new Error("Invalid JSON response from server");
    }
  } catch (error) {
    console.error("Error handling API response:", error);
    throw error;
  }
};
