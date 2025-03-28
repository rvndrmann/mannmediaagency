
import { AgentType } from "@/hooks/multi-agent/runner/types";
import { HandoffInputData, HandoffInputFilter, HandoffOptions } from "./types";
import { Attachment } from "@/types/message";

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
    includeFullHistory: options.includeFullHistory !== false, // Default to true
  };
}

/**
 * Create input data for a handoff
 * @param history Conversation history
 * @param preHandoffItems Items before handoff
 * @param newItems New items during handoff
 * @param conversationContext Additional context to preserve
 * @returns HandoffInputData object with all items combined
 */
export function createHandoffInputData(
  history: string[] | Attachment[],
  preHandoffItems: any[],
  newItems: any[],
  conversationContext: Record<string, any> = {}
): HandoffInputData {
  return {
    inputHistory: history,
    preHandoffItems,
    newItems,
    allItems: [...preHandoffItems, ...newItems],
    conversationContext
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
  },
  
  /**
   * Add conversation continuity context
   */
  addContinuityContext: (fromAgent: AgentType) => (data: HandoffInputData): HandoffInputData => {
    // Create a system message explaining this is a handoff continuation
    const continuityMessage = {
      role: 'system',
      content: `This conversation was handed off from the ${fromAgent} agent. Please review the conversation history to maintain context.`,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      type: 'handoff'
    };
    
    // Add it to the beginning of allItems
    return {
      ...data,
      allItems: [continuityMessage, ...data.allItems]
    };
  }
};
