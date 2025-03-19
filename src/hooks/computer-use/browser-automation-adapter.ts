
import { supabase } from "@/integrations/supabase/client";
import { SUPABASE_URL } from "@/integrations/supabase/client";

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

export interface BrowserRequest {
  task: string;
  screenshot?: string;
  current_url?: string;
  previous_actions?: BrowserAction[];
  session_id?: string;
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

export const useBrowserAutomationAdapter = () => {
  /**
   * Normalizes a URL by ensuring it has the correct protocol
   */
  const normalizeUrl = (url: string): string => {
    if (!url) return "";
    
    // If URL doesn't start with http:// or https://, add https://
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return `https://${url}`;
    }
    return url;
  };

  /**
   * Formats a browser action into a readable string for display
   */
  const formatAction = (action: BrowserAction): string => {
    switch (action.type) {
      case "click":
        if (action.selector) {
          return `Click on element: ${action.selector}`;
        } else if (action.x !== undefined && action.y !== undefined) {
          return `Click at position: (${action.x}, ${action.y})`;
        }
        return "Click (no target specified)";

      case "type":
        return `Type text: "${action.text || ""}"${action.selector ? ` in ${action.selector}` : ''}`;

      case "openUrl":
      case "navigate":
        return `Navigate to: ${action.url || ""}`;

      case "press":
        return `Press key${action.keys && action.keys.length > 1 ? 's' : ''}: ${action.keys?.join(' + ') || ""}`;

      case "select":
        return `Select "${action.value || ""}" from dropdown ${action.selector || ""}`;

      default:
        return `${action.type} action`;
    }
  };

  /**
   * Converts a browser action to a JSON-serializable object
   */
  const actionToJson = (action: BrowserAction): any => {
    return {
      type: action.type,
      x: action.x,
      y: action.y,
      text: action.text,
      url: action.url,
      keys: action.keys,
      button: action.button,
      selector: action.selector,
      value: action.value,
      options: action.options
    };
  };

  /**
   * Converts a JSON object back to a BrowserAction
   */
  const jsonToAction = (json: any): BrowserAction | null => {
    if (!json || typeof json !== 'object' || !json.type) {
      console.error("Invalid action data:", json);
      return null;
    }

    return {
      type: json.type,
      x: json.x,
      y: json.y,
      text: json.text,
      url: json.url,
      keys: json.keys,
      button: json.button,
      selector: json.selector,
      value: json.value,
      options: json.options
    };
  };

  /**
   * Sends a request to the browser automation function
   */
  const sendToBrowserAutomation = async (request: BrowserRequest): Promise<BrowserResponse | null> => {
    try {
      // Get the auth token for the request
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        throw new Error("Authentication required to use browser automation");
      }

      // Clean up the WebSocket URL 
      const wsBaseUrl = SUPABASE_URL.replace('https://', '');
      
      // Make the request to the browser automation function
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/browser-automation`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(request)
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Browser automation API error:", response.status, errorText);
        throw new Error(`API Error (${response.status}): ${errorText}`);
      }

      const responseData = await response.json();
      return responseData as BrowserResponse;
    } catch (error) {
      console.error("Error in browser automation request:", error);
      throw error;
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

// Export the utility functions directly so they can be imported separately
export const { actionToJson, jsonToAction } = useBrowserAutomationAdapter();
