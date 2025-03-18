
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
  iframe_blocked?: boolean;
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

// Check if a domain is likely to block iframe embedding
export const isLikelyToBlockIframe = (url: string): boolean => {
  try {
    const urlObj = new URL(normalizeUrl(url));
    const domain = urlObj.hostname.toLowerCase();
    
    // List of domains known to frequently block iframe embedding
    const blockedDomains = [
      'facebook.com', 'www.facebook.com',
      'amazon.com', 'www.amazon.com',
      'netflix.com', 'www.netflix.com',
      'twitter.com', 'www.twitter.com', 'x.com', 'www.x.com',
      'instagram.com', 'www.instagram.com',
      'linkedin.com', 'www.linkedin.com',
      'canva.com', 'www.canva.com',
      'figma.com', 'www.figma.com',
      'youtube.com', 'www.youtube.com',
      'spotify.com', 'www.spotify.com',
      'airbnb.com', 'www.airbnb.com',
      'notion.so', 'www.notion.so',
      'slack.com', 'www.slack.com',
      'microsoft.com', 'www.microsoft.com',
      'office.com', 'www.office.com',
      'apple.com', 'www.apple.com',
      'dropbox.com', 'www.dropbox.com',
      'zoom.us', 'www.zoom.us',
      'shopify.com', 'www.shopify.com',
      'pinterest.com', 'www.pinterest.com',
      'ebay.com', 'www.ebay.com'
    ];
    
    // Check if the domain matches any known blocked domain
    return blockedDomains.some(blocked => 
      domain === blocked || domain.endsWith('.' + blocked)
    );
  } catch (error) {
    console.error("Error checking domain blocking:", error);
    return false;
  }
};

// Check if a domain is likely to support iframe embedding
export const isSupportedForIframe = (url: string): boolean => {
  try {
    const urlObj = new URL(normalizeUrl(url));
    const domain = urlObj.hostname.toLowerCase();
    
    // List of domains known to generally work in iframes
    const supportedDomains = [
      'google.com', 'www.google.com',
      'bing.com', 'www.bing.com',
      'duckduckgo.com', 'www.duckduckgo.com',
      'wikipedia.org', 'www.wikipedia.org',
      'wikimedia.org',
      'github.io',
      'netlify.app',
      'vercel.app',
      'stackblitz.com',
      'codepen.io',
      'jsfiddle.net',
      'plnkr.co',
      'replit.com',
      'lovable.app'
    ];
    
    // Check if the domain matches any supported domain
    return supportedDomains.some(supported => 
      domain === supported || domain.endsWith('.' + supported)
    );
  } catch (error) {
    console.error("Error checking domain support:", error);
    return false;
  }
};

// Analyze DOM content to detect iframe blocking
export const detectIframeBlocking = (domContent: string): boolean => {
  if (!domContent) return false;
  
  const lowerContent = domContent.toLowerCase();
  
  // Common patterns in X-Frame-Options or CSP error messages
  const blockingPatterns = [
    'refused to connect',
    'x-frame-options',
    'content security policy',
    'frame-ancestors',
    'cannot be displayed in a frame',
    'security error',
    'access to the resource has been blocked'
  ];
  
  return blockingPatterns.some(pattern => lowerContent.includes(pattern));
};

export const useManusAdapter = () => {
  const sendToManus = async (request: ManusRequest): Promise<ManusResponse | null> => {
    try {
      // Normalize URL if present
      if (request.current_url) {
        request.current_url = normalizeUrl(request.current_url);
      }
      
      // Check if URL is likely to block iframe embedding
      if (request.current_url && !request.iframe_blocked) {
        const likelyToBlock = isLikelyToBlockIframe(request.current_url);
        if (likelyToBlock) {
          console.log(`URL ${request.current_url} is likely to block iframe embedding`);
          request.iframe_blocked = true;
        }
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
        if ((action.type === 'navigate' || action.type === 'openNewTab') && action.url) {
          return {
            ...action,
            url: normalizeUrl(action.url)
          };
        }
        return action;
      });
      
      // Handle iframe restriction automatically
      if (request.iframe_blocked && response.actions.length > 0) {
        response.actions = response.actions.map(action => {
          // Convert navigate actions to openNewTab if iframe is blocked
          if (action.type === 'navigate' && action.url) {
            console.log(`Converting navigate to openNewTab due to iframe restrictions for URL: ${action.url}`);
            return {
              ...action,
              type: 'openNewTab'
            };
          }
          return action;
        });
      }
      
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
      case "openNewTab":
        return `Open in new tab: ${action.url}`;
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
    normalizeUrl,
    isLikelyToBlockIframe,
    isSupportedForIframe,
    detectIframeBlocking
  };
};
