
import { AgentType, RunnerContext, AgentResult } from "../types";
import { toast } from "sonner";

// Use a safe way to initialize OpenAI that works in the browser
let openai: any = null;

// Dynamically load OpenAI to avoid issues with browser/server-side rendering
const initializeOpenAI = async () => {
  try {
    // Dynamically import OpenAI to avoid issues with browser-side rendering
    const { default: OpenAI } = await import('openai');
    
    openai = new OpenAI({
      apiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
      dangerouslyAllowBrowser: true // Note: In production, use backend calls instead
    });
    
    return true;
  } catch (error) {
    console.error("Failed to initialize OpenAI:", error);
    return false;
  }
};

// Initialize when the module is loaded
initializeOpenAI();

// Helper to select the appropriate model based on performance needs
const getModelName = (usePerformanceModel: boolean = false): string => {
  return usePerformanceModel ? 'gpt-4o-mini' : 'gpt-4o';
};

// Get appropriate system instructions for each agent type
const getAgentInstructions = (agentType: AgentType): string => {
  switch (agentType) {
    case "main":
      return "You are a helpful assistant that can answer questions on any topic.";
    case "script":
      return "You are a creative script writer specializing in engaging and effective scripts.";
    case "image":
      return "You are an image prompt specialist who creates detailed prompts for AI image generation.";
    case "tool":
      return "You are a technical specialist who helps users with tools and technical tasks.";
    case "scene":
      return "You are a scene creation specialist who excels at creating detailed visual scenes.";
    case "data":
      return "You are a data analysis specialist who helps interpret and analyze data.";
    default:
      return "You are a helpful AI assistant.";
  }
};

// Process the agent response to check for handoff requests
const processAgentResponse = (response: string): { 
  output: string, 
  nextAgent: AgentType | null,
  handoffReason: string | null 
} => {
  // Simple pattern matching for agent handoff markers
  const handoffPatterns = [
    { pattern: /\[HANDOFF:SCRIPT\](.*)/i, agent: "script" as AgentType },
    { pattern: /\[HANDOFF:IMAGE\](.*)/i, agent: "image" as AgentType },
    { pattern: /\[HANDOFF:TOOL\](.*)/i, agent: "tool" as AgentType },
    { pattern: /\[HANDOFF:SCENE\](.*)/i, agent: "scene" as AgentType },
    { pattern: /\[HANDOFF:DATA\](.*)/i, agent: "data" as AgentType },
    { pattern: /\[HANDOFF:MAIN\](.*)/i, agent: "main" as AgentType },
    // Additional patterns can be added
  ];

  for (const { pattern, agent } of handoffPatterns) {
    const match = response.match(pattern);
    if (match) {
      const reason = match[1]?.trim() || "Specialized assistance needed";
      // Remove the handoff marker from the output
      const cleanedOutput = response.replace(pattern, '').trim();
      return { 
        output: cleanedOutput, 
        nextAgent: agent,
        handoffReason: reason
      };
    }
  }

  return { output: response, nextAgent: null, handoffReason: null };
};

// Main function to run an agent with OpenAI
export const runAgentWithOpenAI = async (
  agentType: AgentType,
  input: string,
  context: RunnerContext
): Promise<AgentResult> => {
  try {
    // Initialize OpenAI if not already done
    if (!openai) {
      const initialized = await initializeOpenAI();
      if (!initialized) {
        throw new Error("Could not initialize OpenAI");
      }
    }

    const modelName = getModelName(context.usePerformanceModel);
    const instructions = getAgentInstructions(agentType);
    
    // Build the conversation history
    const messages = [
      { role: "system", content: instructions },
      { role: "user", content: input }
    ];
    
    // Add history if available
    if (context.metadata?.conversationHistory) {
      // Insert conversation history before the current message
      messages.splice(1, 0, ...context.metadata.conversationHistory.map((msg: any) => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      })));
    }

    // Log what's happening
    console.log(`Running ${agentType} agent with model ${modelName}...`);
    
    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: modelName,
      messages,
      temperature: 0.7
    });

    const responseText = completion.choices[0].message.content || '';
    const { output, nextAgent, handoffReason } = processAgentResponse(responseText);
    
    if (nextAgent) {
      console.log(`Detected handoff request to ${nextAgent} agent: ${handoffReason}`);
    }
    
    return {
      response: output,
      output: output,
      nextAgent,
      handoffReason: handoffReason || undefined
    };
  } catch (error) {
    console.error(`Error running ${agentType} agent with OpenAI:`, error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    toast.error(`Agent error: ${errorMessage}`);
    
    return {
      response: "I encountered an error while processing your request. Please try again later.",
      output: "I encountered an error while processing your request. Please try again later.",
      nextAgent: null
    };
  }
};

export default {
  runAgentWithOpenAI,
  initializeOpenAI
};
