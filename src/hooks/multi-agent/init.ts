
import { getAvailableTools, initializeToolSystem } from "./tools";

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

// Initialize on import
initializeMultiAgentSystem().catch(error => {
  console.error("Error during automatic Multi-Agent system initialization:", error);
});

export default { initializeMultiAgentSystem };
