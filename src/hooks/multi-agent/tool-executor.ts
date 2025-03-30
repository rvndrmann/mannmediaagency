
import { Command } from "@/types/message";
import { getTool } from "./tools";
import { CommandExecutionState, ToolContext } from "./types";
import { toast } from "sonner";

interface ExecutionResult {
  state: CommandExecutionState;
  message: string;
  data?: any;
}

export const executeCommand = async (
  commandData: Command,
  context: ToolContext
): Promise<ExecutionResult> => {
  try {
    // Find the tool with the given name
    const tool = getTool(commandData.name);
    
    if (!tool) {
      return {
        state: CommandExecutionState.FAILED,
        message: `Tool "${commandData.name}" not found.`
      };
    }
    
    // Enhanced script detection for Canvas tool
    if (commandData.name === 'canvas' && 
        commandData.parameters?.action === 'updateScene' && 
        commandData.parameters?.content) {
      
      // Improved script detection with more comprehensive markers
      const scriptMarkers = [
        /SCENE \d+/i,
        /\bINT\.\s/i,
        /\bEXT\.\s/i,
        /FADE (IN|OUT)/i,
        /CUT TO:/i,
        /TITLE:/i,
        /CLOSE UP/i,
        /WIDE SHOT/i,
        /NARRATOR:/i,
        /\bVO:/i,
        /VOICE OVER:/i,
        /\bV\.O\./i,
        /\(beat\)/i,
        /DISSOLVE TO:/i,
        /FADE TO BLACK/i
      ];
      
      // Check if content looks like a script
      let isScript = false;
      for (const marker of scriptMarkers) {
        if (marker.test(commandData.parameters.content)) {
          isScript = true;
          break;
        }
      }
      
      // Additional check for script-like structure (multiple paragraphs or line blocks)
      if (!isScript && commandData.parameters.content.includes('\n\n')) {
        const paragraphs = commandData.parameters.content.split('\n\n');
        if (paragraphs.length >= 3) {
          isScript = true;
        }
      }
      
      // If it looks like a script, try to save it as a full script too
      if (isScript && commandData.parameters.projectId) {
        console.log("Content looks like a script, saving as full script too", {
          contentLength: commandData.parameters.content.length,
          previewContent: commandData.parameters.content.substring(0, 100) + '...'
        });
        
        try {
          const { error } = await context.supabase
            .from('canvas_projects')
            .update({ full_script: commandData.parameters.content })
            .eq('id', commandData.parameters.projectId);
            
          if (error) {
            console.error("Error saving as full script:", error);
          } else {
            console.log("Successfully saved as full script");
          }
        } catch (err) {
          console.error("Error saving as full script:", err);
        }
      }
    }
    
    // Check if user has enough credits to execute the tool
    if (
      typeof tool.requiredCredits === 'number' && 
      tool.requiredCredits > 0 &&
      context.creditsRemaining !== undefined &&
      context.creditsRemaining < tool.requiredCredits
    ) {
      return {
        state: CommandExecutionState.FAILED,
        message: `Insufficient credits to execute tool "${commandData.name}". Required: ${tool.requiredCredits}, Available: ${context.creditsRemaining || 0}`
      };
    }
    
    // Execute the tool
    // Use parameters or fall back to args if parameters is undefined
    const toolParams = commandData.parameters || commandData.args || {};
    const result = await tool.execute(toolParams, context);
    
    if (!result.success) {
      return {
        state: CommandExecutionState.FAILED,
        message: `Tool execution failed: ${result.message || result.error || "Unknown error"}`
      };
    }
    
    return {
      state: CommandExecutionState.COMPLETED,
      message: result.message || "Tool execution completed successfully",
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
