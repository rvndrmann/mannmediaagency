
import { initializeToolSystem } from "./tools";

/**
 * Initializes the Multi-Agent system and its components
 */
export async function initializeMultiAgentSystem(): Promise<void> {
  try {
    // Initialize the tool system
    await initializeToolSystem();
    
    // Future: Initialize other multi-agent components here
    
    console.log("Multi-Agent system initialized successfully");
  } catch (error) {
    console.error("Failed to initialize Multi-Agent system:", error);
  }
}

// Initialize on import
initializeMultiAgentSystem().catch(error => {
  console.error("Error during automatic Multi-Agent system initialization:", error);
});

export default { initializeMultiAgentSystem };
