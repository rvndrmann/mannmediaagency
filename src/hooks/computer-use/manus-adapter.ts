
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ManusAction {
  type: string;
  x?: number;
  y?: number;
  text?: string;
  url?: string;
  element?: string;
  keys?: string[];
  button?: "left" | "right" | "middle";
  selector?: string;
  value?: string;
  options?: any;
}

export interface ManusResponse {
  actions: ManusAction[];
  reasoning: string;
  state?: {
    current_url?: string;
    screenshot?: string;
    dom_state?: any;
  };
  error?: string;
}

export interface ManusRequest {
  task: string;
  environment: string;
  screenshot?: string;
  current_url?: string;
  previous_actions?: ManusAction[];
}

// Helper to convert ManusAction to Json compatible object
export const actionToJson = (action: ManusAction): Record<string, any> => {
  return {
    ...action
  };
};

// Helper to convert from Json to ManusAction with type safety
export const jsonToAction = (json: any): ManusAction | null => {
  if (!json || typeof json !== 'object') {
    console.error('Invalid JSON for action conversion:', json);
    return null;
  }
  
  // Check if the JSON has a type property, which is required for ManusAction
  if (!json.type || typeof json.type !== 'string') {
    console.error('JSON missing required "type" property for ManusAction:', json);
    return null;
  }
  
  // Create a valid ManusAction object with type safety
  const action: ManusAction = {
    type: json.type,
  };
  
  // Add optional properties if they exist
  if (json.x !== undefined) action.x = Number(json.x);
  if (json.y !== undefined) action.y = Number(json.y);
  if (json.text !== undefined) action.text = String(json.text);
  if (json.url !== undefined) action.url = String(json.url);
  if (json.element !== undefined) action.element = String(json.element);
  if (json.keys !== undefined && Array.isArray(json.keys)) action.keys = json.keys.map(String);
  if (json.button !== undefined) action.button = json.button as "left" | "right" | "middle";
  if (json.selector !== undefined) action.selector = String(json.selector);
  if (json.value !== undefined) action.value = String(json.value);
  if (json.options !== undefined) action.options = json.options;
  
  return action;
};

// Helper to normalize URLs
export const normalizeUrl = (url: string): string => {
  if (!url) return '';
  
  // Add protocol if missing
  if (!/^https?:\/\//i.test(url)) {
    return `https://${url}`;
  }
  
  return url;
};

export const useManusAdapter = () => {
  const sendToManus = async (request: ManusRequest): Promise<ManusResponse | null> => {
    try {
      // Normalize URL if present
      if (request.current_url) {
        request.current_url = normalizeUrl(request.current_url);
      }
      
      console.log("Sending request to Manus:", JSON.stringify(request, null, 2));
      
      // Call edge function to proxy request to OpenAI
      const { data, error } = await supabase.functions.invoke("manus-computer-agent", {
        body: request
      });

      if (error) {
        console.error("Error calling Manus Computer Agent:", error);
        toast.error("Failed to connect to agent: " + error.message);
        
        // Return a fallback response with the error message
        return {
          actions: [],
          reasoning: "Failed to connect to the AI agent. " + error.message,
          error: error.message
        };
      }

      if (!data) {
        console.error("No data returned from Manus Computer Agent");
        toast.error("No response from agent service");
        
        // Return a fallback response
        return {
          actions: [],
          reasoning: "No response received from the AI agent service",
          error: "Empty response"
        };
      }

      console.log("Response from Manus:", JSON.stringify(data, null, 2));
      
      // Validate the response structure
      const response = data as ManusResponse;
      
      // If there's an error in the response, show it to the user
      if (response.error) {
        toast.error("Agent error: " + response.error);
      }
      
      // Make sure actions is always an array
      if (!Array.isArray(response.actions)) {
        console.warn("Response actions is not an array, using empty array");
        response.actions = [];
      }
      
      // For navigate actions, normalize URLs
      response.actions = response.actions.map(action => {
        if (action.type === 'navigate' && action.url) {
          return {
            ...action,
            url: normalizeUrl(action.url)
          };
        }
        return action;
      });
      
      return response;
    } catch (error) {
      console.error("Exception in Manus adapter:", error);
      toast.error("Error connecting to Manus service: " + (error instanceof Error ? error.message : String(error)));
      
      // Return a fallback response with the error
      return {
        actions: [],
        reasoning: "An error occurred while connecting to the agent",
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  };

  const formatAction = (action: ManusAction): string => {
    switch (action.type) {
      case "click":
        return `Click at (${action.x}, ${action.y})${action.selector ? ` on ${action.selector}` : ''}`;
      case "type":
        return `Type: "${action.text}"`;
      case "navigate":
        return `Navigate to: ${action.url}`;
      case "press":
        return `Press keys: ${action.keys?.join(' + ')}`;
      case "select":
        return `Select: "${action.value}" from ${action.selector}`;
      default:
        return `${action.type} ${JSON.stringify(action)}`;
    }
  };

  return {
    sendToManus,
    formatAction,
    actionToJson,
    jsonToAction,
    normalizeUrl
  };
};
