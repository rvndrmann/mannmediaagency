
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
      parameters: commandData.parameters || {}
    };
  } catch (error) {
    console.error("Error parsing tool command:", error);
    return null;
  }
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
