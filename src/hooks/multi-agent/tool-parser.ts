
import { supabase } from "@/integrations/supabase/client";
import { Command, Message } from "@/types/message";
import { Session } from "@supabase/supabase-js";
import { toast } from "sonner";

/**
 * Extract command information from agent responses
 */
export const parseToolCommand = (message: Message): Command | null => {
  if (!message.content) return null;

  // First try to extract from structured_output
  if (message.structured_output && message.structured_output.command) {
    return {
      action: message.structured_output.command.action || message.structured_output.command.name,
      name: message.structured_output.command.name,
      parameters: message.structured_output.command.parameters || message.structured_output.command.params || {}
    };
  }

  // Then try to extract from tool_arguments
  if (message.tool_name && message.tool_arguments) {
    return {
      action: message.tool_name,
      name: message.tool_name,
      parameters: message.tool_arguments || {}
    };
  }

  // Check for command in direct message command property
  if (message.command) {
    return {
      action: message.command.action || message.command.name || "",
      name: message.command.name || message.command.action || "",
      parameters: message.command.parameters || message.command.params || {}
    };
  }

  // Final fallback - try to parse from content
  try {
    // Look for command patterns in the message content
    const commandMatch = message.content.match(/```(?:json|command)([\s\S]*?)```/);
    
    if (commandMatch && commandMatch[1]) {
      const parsedCommand = JSON.parse(commandMatch[1].trim());
      
      if (parsedCommand.command || parsedCommand.action) {
        return {
          action: parsedCommand.action || parsedCommand.command || "",
          name: parsedCommand.name || parsedCommand.action || parsedCommand.command || "",
          parameters: parsedCommand.parameters || parsedCommand.params || {}
        };
      }
    }
  } catch (e) {
    console.log("Failed to parse command from message content", e);
  }

  return null;
};

/**
 * Get the authenticated user's session
 */
export const getUserSession = async (): Promise<Session | null> => {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session;
  } catch (error) {
    console.error("Error getting user session:", error);
    toast.error("Failed to authenticate user session");
    return null;
  }
};
