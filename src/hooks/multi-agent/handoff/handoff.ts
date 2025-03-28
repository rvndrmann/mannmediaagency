
import { AgentType } from "@/hooks/multi-agent/runner/types";
import { HandoffInputData, HandoffInputFilter, HandoffOptions } from "./types";

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
 * Create input data for a handoff
 * @param history Conversation history
 * @param preHandoffItems Items before handoff
 * @param newItems New items during handoff
 * @returns HandoffInputData object with all items combined
 */
export function createHandoffInputData(
  history: string[] | Attachment[],
  preHandoffItems: any[],
  newItems: any[]
): HandoffInputData {
  return {
    inputHistory: history,
    preHandoffItems,
    newItems,
    allItems: [...preHandoffItems, ...newItems]
  };
}

/**
 * Common handoff input filters
 */
export const handoffFilters = {
  /**
   * Remove all tool calls from the handoff input history
   */
  removeAllTools: (data: HandoffInputData): HandoffInputData => {
    // Filter out tool calls from allItems
    const filteredItems = data.allItems.filter(item => 
      item.role !== 'tool' && 
      !(item.role === 'assistant' && item.tool_name)
    );
    
    return {
      ...data,
      allItems: filteredItems
    };
  },
  
  /**
   * Keep only the last N messages
   */
  keepLastN: (n: number) => (data: HandoffInputData): HandoffInputData => {
    const lastNItems = data.allItems.slice(-n);
    
    return {
      ...data,
      allItems: lastNItems
    };
  },
  
  /**
   * Add system context for the receiving agent
   */
  addSystemContext: (context: string) => (data: HandoffInputData): HandoffInputData => {
    // Create a system message with the context
    const systemMessage = {
      role: 'system',
      content: context,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString()
    };
    
    // Add it to the beginning of allItems
    return {
      ...data,
      allItems: [systemMessage, ...data.allItems]
    };
  }
};
