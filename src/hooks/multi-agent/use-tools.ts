
import { useState } from "react";
import { detectToolCommand, parseToolCommand } from "./tool-parser";
import { getTool } from "./tools";
import { Command, Message } from "@/types/message";
import { ToolResult } from "./types";

export function useTools(
  messages: Message[],
  userId: string | undefined,
  creditsRemaining: number,
  addMessage: (message: Message) => void,
  setIsLoading: (isLoading: boolean) => void
) {
  const [error, setError] = useState<string | null>(null);

  const executeToolIfDetected = async (message: Message): Promise<boolean> => {
    if (!message.content) return false;
    if (!userId) {
      setError("You must be logged in to use tools");
      return false;
    }

    const command = detectToolCommand(message.content);
    if (!command) return false;

    const toolDef = getTool(command.feature);
    if (!toolDef) {
      setError(`Tool ${command.feature} not found`);
      return false;
    }

    try {
      setIsLoading(true);
      
      // Check if user has enough credits
      if (creditsRemaining < toolDef.requiredCredits) {
        const result: ToolResult = {
          success: false,
          message: `You don't have enough credits to use this tool. Required: ${toolDef.requiredCredits}, Available: ${creditsRemaining}`
        };
        
        addMessage({
          role: "assistant",
          content: result.message,
          status: "error"
        });
        
        return true;
      }

      const toolContext = {
        userId,
        creditsRemaining,
        attachments: message.attachments || []
      };

      const result = await toolDef.execute(command.parameters || {}, toolContext);

      addMessage({
        role: "assistant",
        content: result.message,
        status: result.success ? "completed" : "error",
        command: {
          ...command,
          tool: toolDef.name
        }
      });

      return true;
    } catch (error) {
      console.error(`Error executing tool ${command.feature}:`, error);
      
      const errorResult: ToolResult = {
        success: false,
        message: `Error executing tool: ${error instanceof Error ? error.message : String(error)}`
      };
      
      addMessage({
        role: "assistant",
        content: errorResult.message,
        status: "error"
      });
      
      return true;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    executeToolIfDetected,
    error
  };
}
