
import { initializeToolSystem } from "./tools";

/**
 * Initializes the Multi-Agent system and its components
 */
export async function initializeMultiAgentSystem(): Promise<void> {
  try {
    // Initialize the tool system
    const toolsInitialized = await initializeToolSystem();
    if (!toolsInitialized) {
      console.warn("Tool system initialization failed or was incomplete");
    }
    
    // Initialize OpenAI integration if available
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (openaiApiKey) {
      console.log("OpenAI API key found, AI capabilities will be available");
    } else {
      console.log("OpenAI API key not found, some AI capabilities may be limited");
    }
    
    // Future: Initialize other multi-agent components here
    
    console.log("Multi-Agent system initialized successfully");
  } catch (error) {
    console.error("Error initializing Multi-Agent system:", error);
    throw error; // Re-throw to let caller handle
  }
}

// Auto-initialize when imported - catching any errors during initialization
initializeMultiAgentSystem().catch(error => {
  console.error("Failed to initialize Multi-Agent system:", error);
});

export default { initializeMultiAgentSystem };
