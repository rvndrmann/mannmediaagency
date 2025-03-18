
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
    normalizeUrl
  };
};
