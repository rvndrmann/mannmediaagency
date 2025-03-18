
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
}

export interface ManusRequest {
  task: string;
  environment: string;
  screenshot?: string;
  current_url?: string;
  previous_actions?: ManusAction[];
  api_key?: string;
}

export const useManusAdapter = () => {
  const sendToManus = async (request: ManusRequest): Promise<ManusResponse | null> => {
    try {
      // Call edge function to proxy request to Manus API
      const { data, error } = await supabase.functions.invoke("manus-computer-agent", {
        body: request
      });

      if (error) {
        console.error("Error calling Manus API:", error);
        toast.error("Failed to connect to Manus: " + error.message);
        return null;
      }

      return data as ManusResponse;
    } catch (error) {
      console.error("Exception in Manus adapter:", error);
      toast.error("Error connecting to Manus service");
      return null;
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
    formatAction
  };
};
