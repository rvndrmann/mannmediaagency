
import { getAvailableTools } from "./tools";
import { ToolExecutorService } from "./tools/tool-executor-service";

/**
 * Initializes the Multi-Agent system and its components
 */
export async function initializeMultiAgentSystem(): Promise<void> {
  try {
    // Initialize the tool system
    await initializeToolSystem();
    
    // Log available tools
    const tools = getAvailableTools();
    console.log(`Multi-Agent system initialized with ${tools.length} tools`);
    
    // Future: Initialize other multi-agent components here
  } catch (error) {
    console.error("Failed to initialize Multi-Agent system:", error);
  }
}

/**
 * Initializes the tool system by registering default tools
 */
export async function initializeToolSystem(): Promise<void> {
  try {
    // Get the tool executor service instance to initialize it
    const toolExecutor = ToolExecutorService.getInstance();
    const availableTools = toolExecutor.getAvailableTools();
    
    console.log(`Tool system initialized with ${availableTools.length} tools`);
    return Promise.resolve();
  } catch (error) {
    console.error("Failed to initialize tool system:", error);
    return Promise.reject(error);
  }
}

// Initialize on import
initializeMultiAgentSystem().catch(error => {
  console.error("Error during automatic Multi-Agent system initialization:", error);
});

export default { initializeMultiAgentSystem, initializeToolSystem };
