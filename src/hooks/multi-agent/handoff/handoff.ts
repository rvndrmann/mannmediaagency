import { AgentType } from "@/hooks/use-multi-agent-chat";
import { HandoffInputFilter, HandoffOptions } from "./types";

/**
 * Create a handoff to another agent
 * 
 * @param targetAgent The agent to hand off to
 * @param options Additional options for the handoff
 * @returns Handoff configuration object
 */
export function createHandoff(
  targetAgent: AgentType,
  options: Partial<Omit<HandoffOptions, 'targetAgent'>> = {}
): HandoffOptions {
  // Generate a default tool name if not provided
  const toolName = options.toolName || `transfer_to_${targetAgent}_agent`;
  
  // Generate a default tool description if not provided
  const toolDescription = options.toolDescription || 
    `Transfer the conversation to the ${targetAgent} agent when the user's request requires specialized handling in that domain.`;
  
  return {
    targetAgent,
    reason: options.reason || "Request requires specialized handling",
    toolName,
    toolDescription,
    inputFilter: options.inputFilter,
    preserveContext: options.preserveContext !== false, // Default to true
    additionalContext: options.additionalContext || {},
  };
}

/**
 * Common handoff input filters
 */
export const handoffFilters = {
  /**
   * Remove all tool calls from the handoff input history
   */
  removeAllTools: (data: any): any => {
    // Implementation would filter out tool calls
    return data;
  },
  
  /**
   * Keep only the last N messages
   */
  keepLastN: (n: number) => (data: any): any => {
    // Implementation would keep only the last N messages
    return data;
  },
  
  /**
   * Add system context for the receiving agent
   */
  addSystemContext: (context: string) => (data: any): any => {
    // Implementation would add system context
    return data;
  }
};
