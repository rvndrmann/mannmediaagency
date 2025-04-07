import {
  AIConfigRuntime,
  ModelParserRegistry,
  AIConfig,
  JSONObject,
  // ToolDefinition // Still assuming this type might exist or be relevant, using 'any' if not
} from "aiconfig";
import { GreetingAgentConfig, createGreetingTool } from "./greeting"; // Import config and tool creator

// Define model parsers (MUST match those used in runtime)
const modelParsers = new ModelParserRegistry();
// Example: Register OpenAI parser if used
// import { OpenAIParser } from "aiconfig/dist/parsers/openai";
// modelParsers.register(new OpenAIParser());


// Define the configuration for the Orchestrator Agent
export const OrchestratorAgentConfig: AIConfig = {
  name: "Orchestrator Agent Config",
  description: "Configuration for the main orchestrator agent.",
  schema_version: "latest",
  metadata: {
    // Orchestrator-specific metadata
  },
  prompts: [
    {
      name: "orchestrate_request", // Name for the main orchestration prompt
      // input: { // Removed duplicate input definition - schema defined via parameters below or inferred
      //   type: "string",
      //   description: "The user's request.",
      // },
      outputs: [], // Define expected output structure if known
      metadata: {
        model: {
          name: "openai:gpt-4o", // Using a more capable model
          // settings: { ... }
        }, // Added comma here
        // Removed duplicate empty parameters block
        tags: ["orchestration"],
        // Tools will be associated at runtime, but we can list them here for reference
        // tools: ["provide_greeting"] // Reference name
        // Define the input parameter used in the prompt template within metadata
        parameters: {
           user_input: {
              type: "string",
              description: "The user's request."
           }
        }
      },
      // Define the prompt structure using chat format under the 'input' key
      input: [
        {
          role: "system",
          content: `You are an orchestrator agent. Your primary role is to understand the user's request and delegate tasks to specialized agents available as tools.
Available Tools:
- provide_greeting: Provides a friendly greeting to the user.

Instructions:
1. Analyze the user's request.
2. If the request is simple, like just saying hello, use the 'provide_greeting' tool.
3. For other requests, state that you cannot handle them yet.
4. Start by greeting the user using the 'provide_greeting' tool unless the user has already initiated the conversation strongly towards a specific task.`,
        },
        {
          role: "user",
          content: "{{user_input}}", // Using a named parameter for user input
        },
      ]
      // Removed parameters definition from here as it's moved into metadata
    },
  ],
  parameters: {
    // Global parameters if any
  },
  // Tools are typically added to the runtime, not statically in the config usually.
  // The 'tools' array in the prompt metadata is more for informational purposes.
};


// Function to create the orchestrator's tool list dynamically
// Requires runtime instances for both orchestrator and the tools it uses
export function getOrchestratorTools(
    orchestratorRuntime: AIConfigRuntime, // Runtime for the orchestrator itself
    greetingRuntime: AIConfigRuntime     // Runtime specifically for the greeting config
): any[] /* ToolDefinition[] or any[] */ {

    const greetingTool = createGreetingTool(
        greetingRuntime, // Pass the runtime configured for the greeting agent
        "provide_greeting",
        "Provides a friendly greeting to the user."
    );

    // Add more tools here as needed
    // const otherTool = createOtherTool(...);

    return [greetingTool /*, otherTool */];
}