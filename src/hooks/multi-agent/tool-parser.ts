
import { Command } from "@/types/message";

// Regular expression for matching commands in text
const COMMAND_REGEX = /```(?:json|command)?\s*(\{[\s\S]*?\})\s*```/g;

/**
 * Parse tool command JSON from message content
 */
export function parseToolCommand(content: string): Command | null {
  try {
    // Reset regex lastIndex
    COMMAND_REGEX.lastIndex = 0;
    
    const matches = content.match(COMMAND_REGEX);
    
    if (!matches || matches.length === 0) {
      return null;
    }
    
    // Get the last command from the message
    const lastMatch = matches[matches.length - 1];
    
    // Extract JSON content
    const jsonContent = lastMatch.replace(/```(?:json|command)?\s*|\s*```/g, '');
    
    // Parse command JSON
    const commandData = JSON.parse(jsonContent);
    
    // Validate command structure
    if (!commandData.feature) {
      console.warn("Invalid command format: missing 'feature' property", commandData);
      return null;
    }
    
    return {
      feature: commandData.feature,
      action: commandData.action || "create", // Default action
      parameters: commandData.parameters || {},
      confidence: commandData.confidence || 1.0,
      type: commandData.type || "standard"
    };
  } catch (error) {
    console.error("Error parsing tool command:", error);
    return null;
  }
}

/**
 * Detect tool command from the input
 * @param message The message to parse for commands
 */
export function detectToolCommand(message: { role: string; content: string }): Command | null {
  // Check for classic command format
  const commandMatch = parseToolCommand(message.content);
  if (commandMatch) {
    return commandMatch;
  }
  
  // Check for slash command format like "/image generate cat"
  const slashCommandRegex = /^\/(\w+)\s+([^$]*)/;
  const match = message.content.match(slashCommandRegex);
  
  if (match) {
    const [_, feature, paramText] = match;
    return {
      feature: feature as any,
      action: "create",
      parameters: { prompt: paramText.trim() },
      confidence: 1.0,
      type: "slash-command"
    };
  }
  
  return null;
}

/**
 * Extract tool name from a potential command string
 */
export function extractToolName(content: string): string | null {
  const command = parseToolCommand(content);
  return command ? command.feature.toString() : null;
}

/**
 * Check if content contains a tool command
 */
export function hasToolCommand(content: string): boolean {
  return parseToolCommand(content) !== null;
}
