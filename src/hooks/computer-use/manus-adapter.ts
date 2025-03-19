
import { supabase } from "@/integrations/supabase/client";
import { normalizeUrl } from "@/utils/url-utils";

export interface ManusAction {
  type: string;
  x?: number;
  y?: number;
  button?: "left" | "middle" | "right";
  text?: string;
  keys?: string[];
  scrollX?: number;
  scrollY?: number;
  url?: string;
  element_id?: string;
  selector?: string;
  value?: string;
  options?: any;
}

export interface ManusApiRequest {
  task: string;
  environment: string;
  screenshot?: string;
  current_url?: string;
  previous_actions?: ManusAction[];
  iframe_blocked?: boolean;
}

export const actionToJson = (action: ManusAction): any => {
  return {
    type: action.type,
    ...(action.x !== undefined && { x: action.x }),
    ...(action.y !== undefined && { y: action.y }),
    ...(action.text !== undefined && { text: action.text }),
    ...(action.url !== undefined && { url: action.url }),
    ...(action.keys !== undefined && { keys: action.keys }),
    ...(action.selector !== undefined && { selector: action.selector }),
    ...(action.value !== undefined && { value: action.value }),
    ...(action.button !== undefined && { button: action.button }),
    ...(action.options !== undefined && { options: action.options })
  };
};

export const jsonToAction = (json: any): ManusAction | null => {
  if (!json || typeof json !== 'object' || !json.type) {
    return null;
  }
  
  return {
    type: json.type,
    ...(json.x !== undefined && { x: json.x }),
    ...(json.y !== undefined && { y: json.y }),
    ...(json.text !== undefined && { text: json.text }),
    ...(json.url !== undefined && { url: json.url }),
    ...(json.keys !== undefined && { keys: json.keys }),
    ...(json.selector !== undefined && { selector: json.selector }),
    ...(json.value !== undefined && { value: json.value }),
    ...(json.button !== undefined && { button: json.button }),
    ...(json.options !== undefined && { options: json.options })
  };
};

export const useManusAdapter = () => {
  const sendToManus = async (request: ManusApiRequest) => {
    try {
      console.log("Sending request to Manus API:", JSON.stringify(request, null, 2));
      
      // Use Supabase Functions.invoke instead of fetch
      const { data, error } = await supabase.functions.invoke('manus-computer-agent', {
        body: request
      });
      
      if (error) {
        console.error("Error from Supabase Functions:", error);
        throw new Error(`Error from Manus API: ${error.message}`);
      }
      
      if (!data) {
        console.error("No data returned from Manus API");
        throw new Error("No data returned from Manus API");
      }
      
      return data;
    } catch (error) {
      console.error("Error sending request to Manus:", error);
      throw error;
    }
  };
  
  const formatAction = (action: ManusAction): string => {
    switch (action.type) {
      case "click":
        if (action.selector) {
          return `Click on element ${action.selector}`;
        }
        return `Click at coordinates (${action.x}, ${action.y})`;
        
      case "type":
        return `Type "${action.text}"`;
        
      case "navigate":
      case "openNewTab":
        return `Open ${action.url}`;
        
      case "press":
        return `Press keys ${action.keys?.join('+')}`;
        
      case "select":
        return `Select "${action.value}" from dropdown`;
        
      default:
        return `${action.type} action`;
    }
  };
  
  // Helper function to check if a URL is likely to block iframe embedding
  const isLikelyToBlockIframe = (_url: string): boolean => {
    // Since we're not using iframes anymore, this always returns false
    return false;
  };
  
  // Helper function to check if a URL is supported in iframe
  const isSupportedForIframe = (_url: string): boolean => {
    // Since we're not using iframes anymore, this always returns false
    return false;
  };
  
  return {
    sendToManus,
    formatAction,
    actionToJson,
    jsonToAction,
    normalizeUrl,
    isLikelyToBlockIframe,
    isSupportedForIframe
  };
};
