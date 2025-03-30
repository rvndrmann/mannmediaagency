// This file might not exist, but we'll create it or add to an existing file that handles function calls

export function shouldPreventHandoff(contextData: any): boolean {
  // Check if we should prevent automatic handoff based on context data
  return contextData?.preventAutoHandoff === true || 
         (contextData?.input && contextData.input.length < 20);
}

export function processFunctionCall(
  functionName: string, 
  functionArgs: any, 
  contextData: any
): { shouldHandoff: boolean, targetAgent?: string, reason?: string, additionalContext?: any } {
  // If this is a transfer function but we should prevent handoff for simple messages
  if (functionName.includes('transfer_to_') && shouldPreventHandoff(contextData)) {
    console.log("Preventing automatic handoff for simple greeting or short message");
    return { shouldHandoff: false };
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
  
  return { shouldHandoff: false };
}
