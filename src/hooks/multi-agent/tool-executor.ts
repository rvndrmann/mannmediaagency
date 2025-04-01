
import { Command } from "@/types/message";
import { CommandExecutionState, ToolContext } from "./types";
import { toast } from "sonner";
import { executeTool } from "./tools/index"; 
import { supabase } from "@/integrations/supabase/client";

export const executeCommand = async (
  commandData: Command,
  context: ToolContext
): Promise<{
  state: CommandExecutionState;
  message: string;
  data?: any;
}> => {
  try {
    // Ensure we have supabase in the context
    if (!context.supabase) {
      context.supabase = supabase;
    }
    
    // Get user auth if not already in context
    if (!context.user && !context.session) {
      try {
        const { data } = await supabase.auth.getSession();
        context.session = data.session;
        context.user = data.session?.user;
      } catch (error) {
        console.warn("Could not get user session", error);
      }
    }
    
    // Use the tool executor system
    const result = await executeTool(commandData.name, commandData.parameters || {}, context);
    
    // Return the result in the expected format
    return {
      state: result.state,
      message: result.message,
      data: result.data
    };
  } catch (error) {
    console.error("Tool execution error:", error);
    return {
      state: CommandExecutionState.FAILED,
      message: `Tool execution error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};
