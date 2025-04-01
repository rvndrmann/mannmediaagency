
import { initializeToolSystem } from "./tools";

/**
 * Initializes the Multi-Agent system and its components
 */
export async function initializeMultiAgentSystem(): Promise<void> {
  // Initialize the tool system
  await initializeToolSystem();
  
  // Future: Initialize other multi-agent components here
  
  console.log("Multi-Agent system initialized successfully");
}

// Auto-initialize when imported - catching any errors during initialization
initializeMultiAgentSystem().catch(error => {
  console.error("Failed to initialize Multi-Agent system:", error);
});

export default { initializeMultiAgentSystem };
