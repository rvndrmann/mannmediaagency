
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface BrowserAction {
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

export interface BrowserResponse {
  actions: BrowserAction[];
  reasoning: string;
  state?: {
    current_url?: string;
    screenshot?: string;
    page_content?: string;
  };
  error?: string;
}

export interface BrowserRequest {
  task: string;
  screenshot?: string;
  current_url?: string;
  previous_actions?: BrowserAction[];
  session_id?: string;
}

// Helper to convert BrowserAction to Json compatible object
export const actionToJson = (action: BrowserAction): Record<string, any> => {
  return {
    ...action
  };
};

// Helper to convert from Json to BrowserAction with type safety
export const jsonToAction = (json: any): BrowserAction | null => {
  if (!json || typeof json !== 'object') {
    console.error('Invalid JSON for action conversion:', json);
    return null;
  }
  
  // Check if the JSON has a type property, which is required for BrowserAction
  if (!json.type || typeof json.type !== 'string') {
    console.error('JSON missing required "type" property for BrowserAction:', json);
    return null;
  }
  
  // Create a valid BrowserAction object with type safety
  const action: BrowserAction = {
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
  
  try {
    // Handle search queries
    if (!url.includes(".") && !url.startsWith("http")) {
      return `https://www.google.com/search?q=${encodeURIComponent(url)}`;
    }
    
    // Add protocol if missing
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }
    
    // Try to create a URL object to validate
    new URL(url);
    
    return url;
  } catch (error) {
    console.error("Error normalizing URL:", error);
    // Fall back to Google search if URL is invalid
    return `https://www.google.com/search?q=${encodeURIComponent(url)}`;
  }
};

export const useBrowserAutomationAdapter = () => {
  const sendToBrowserAutomation = async (request: BrowserRequest): Promise<BrowserResponse | null> => {
    try {
      // Normalize URL if present
      if (request.current_url) {
        request.current_url = normalizeUrl(request.current_url);
      }
      
      console.log("Sending request to browser automation service:", JSON.stringify(request, null, 2));
      
      // Call edge function to handle browser automation
      const { data, error } = await supabase.functions.invoke("browser-automation", {
        body: request
      });

      if (error) {
        console.error("Error calling Browser Automation service:", error);
        toast.error("Failed to connect to browser automation service: " + error.message);
        
        // Return a fallback response with the error message
        return {
          actions: [],
          reasoning: "Failed to connect to the browser automation service. " + error.message,
          error: error.message
        };
      }

      if (!data) {
        console.error("No data returned from Browser Automation service");
        toast.error("No response from browser automation service");
        
        // Return a fallback response
        return {
          actions: [],
          reasoning: "No response received from the browser automation service",
          error: "Empty response"
        };
      }

      console.log("Response from Browser Automation service:", JSON.stringify(data, null, 2));
      
      // Validate the response structure
      const response = data as BrowserResponse;
      
      // If there's an error in the response, show it to the user
      if (response.error) {
        toast.error("Browser automation error: " + response.error);
      }
      
      // Make sure actions is always an array
      if (!Array.isArray(response.actions)) {
        console.warn("Response actions is not an array, using empty array");
        response.actions = [];
      }
      
      // For navigate actions, normalize URLs
      response.actions = response.actions.map(action => {
        if ((action.type === 'navigate' || action.type === 'openUrl') && action.url) {
          return {
            ...action,
            url: normalizeUrl(action.url)
          };
        }
        return action;
      });
      
      return response;
    } catch (error) {
      console.error("Exception in Browser automation adapter:", error);
      toast.error("Error connecting to browser automation service: " + (error instanceof Error ? error.message : String(error)));
      
      // Return a fallback response with the error
      return {
        actions: [],
        reasoning: "An error occurred while connecting to the browser automation service",
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  };

  const formatAction = (action: BrowserAction): string => {
    switch (action.type) {
      case "click":
        return `Click at (${action.x}, ${action.y})${action.selector ? ` on ${action.selector}` : ''}`;
      case "type":
        return `Type: "${action.text}"`;
      case "navigate":
      case "openUrl":
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
    sendToBrowserAutomation,
    formatAction,
    actionToJson,
    jsonToAction,
    normalizeUrl
  };
};
