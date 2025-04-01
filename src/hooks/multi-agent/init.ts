
import { initializeTools } from "./tools/index";

/**
 * Initializes the Multi-Agent system and its components
 */
export function initializeMultiAgentSystem(): void {
  // Initialize the tool system
  initializeTools();
  
  // Future: Initialize other multi-agent components here
  
  console.log("Multi-Agent system initialized successfully");
}

// Auto-initialize when imported
initializeMultiAgentSystem();

export default { initializeMultiAgentSystem };
