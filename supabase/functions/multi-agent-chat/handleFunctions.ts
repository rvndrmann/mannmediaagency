// This file handles function calls from the agents

export function shouldPreventHandoff(contextData: any): boolean {
  // Check if we should prevent automatic handoff based on context data
  return contextData?.preventAutoHandoff === true || 
         (contextData?.input && contextData.input.length < 20) ||
         isSimpleGreeting(contextData?.input);
}

// Helper function to detect simple greetings
export function isSimpleGreeting(input: string): boolean {
  if (!input) return false;
  
  const trimmedInput = input.trim().toLowerCase();
  const simpleGreetings = [
    'hi', 'hello', 'hey', 'hi there', 'hello there', 'hey there',
    'greetings', 'good morning', 'good afternoon', 'good evening',
    'howdy', 'yo', 'hiya', 'what\'s up', 'sup'
  ];
  
  return simpleGreetings.some(greeting => 
    trimmedInput === greeting || 
    trimmedInput === greeting + '!' ||
    trimmedInput === greeting + '.' ||
    trimmedInput === greeting + '?'
  );
}

export function processFunctionCall(
  functionName: string, 
  functionArgs: any, 
  contextData: any
): { shouldHandoff: boolean, targetAgent?: string, reason?: string, additionalContext?: any } {
  console.log(`Processing function call: ${functionName}`, contextData?.preventAutoHandoff ? "with handoff prevention" : "");
  
  // If this is a transfer function but we should prevent handoff for simple messages
  if (functionName.includes('transfer_to_') && shouldPreventHandoff(contextData)) {
    console.log("Preventing automatic handoff for simple greeting or short message");
    
    // Return a special response that will be handled differently in the edge function
    return { 
      shouldHandoff: false,
      targetAgent: undefined,
      reason: "Prevented automatic handoff for simple greeting or short message"
    };
  }
  
  // Otherwise process normally
  if (functionName === 'transfer_to_script_agent') {
    return {
      shouldHandoff: true,
      targetAgent: 'script',
      reason: functionArgs.reason || "Transfer to script agent requested",
      additionalContext: functionArgs.additional_context || {}
    };
  }
  
  // Handle other function calls similarly
  if (functionName === 'transfer_to_image_agent') {
    return {
      shouldHandoff: true,
      targetAgent: 'image',
      reason: functionArgs.reason || "Transfer to image agent requested",
      additionalContext: functionArgs.additional_context || {}
    };
  }
  
  if (functionName === 'transfer_to_scene_agent') {
    return {
      shouldHandoff: true,
      targetAgent: 'scene',
      reason: functionArgs.reason || "Transfer to scene agent requested",
      additionalContext: functionArgs.additional_context || {}
    };
  }
  
  if (functionName === 'transfer_to_tool_agent') {
    return {
      shouldHandoff: true,
      targetAgent: 'tool',
      reason: functionArgs.reason || "Transfer to tool agent requested",
      additionalContext: functionArgs.additional_context || {}
    };
  }
  
  if (functionName === 'transfer_to_data_agent') {
    return {
      shouldHandoff: true,
      targetAgent: 'data',
      reason: functionArgs.reason || "Transfer to data agent requested",
      additionalContext: functionArgs.additional_context || {}
    };
  }
  
  // If it's agentResponse, just return shouldHandoff: false
  if (functionName === 'agentResponse') {
    return { shouldHandoff: false };
  }
  
  // Default case - no handoff
  return { shouldHandoff: false };
}
