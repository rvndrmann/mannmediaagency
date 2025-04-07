import {
  AIConfigRuntime,
  ModelParserRegistry,
  Prompt,
  InferenceOptions,
  Output,
  JSONObject,
  // ToolDefinition, // Removed - Type not found
  AIConfig, // Import the base AIConfig type
  ExecuteResult // Import ExecuteResult which might be the type for output
} from "aiconfig";

// Define model parsers (replace with actual parsers used in your project)
// You MUST register the specific model parsers you intend to use (e.g., for OpenAI)
const modelParsers = new ModelParserRegistry();
// Example:
// import { OpenAIParser } from "aiconfig/dist/parsers/openai"; // Adjust path if needed
// modelParsers.register(new OpenAIParser());

// Define the configuration for the Greeting Agent as an object
// Conforming to the AIConfig structure
export const GreetingAgentConfig: AIConfig = {
  name: "Greeting Agent Config",
  description: "Configuration for a simple greeting agent.",
  schema_version: "latest", // Or specific version like "v1"
  metadata: {
    // Agent-level metadata can go here
  },
  prompts: [
    {
      name: "generate_greeting", // Name of the prompt
      // input: {}, // Removed duplicate input key
      outputs: [], // Changed 'output' to 'outputs' and assuming it's an array for potential outputs
      metadata: {
        model: {
          name: "openai:gpt-3.5-turbo", // Specify model provider and name
          // settings: { ... } // Add model settings if needed
        },
        parameters: {
          // Prompt-specific parameters
        },
        tags: ["greeting"],
      },
      // Define the actual prompt structure using a chat format
      input: [ // Assuming input can be an array of chat messages
         { "role": "system", "content": "You are a friendly agent that provides a simple greeting." },
         { "role": "user", "content": "Provide a greeting." }
         // The model should generate the assistant's response
      ]
      // Removed the invalid 'prompt' key
    },
  ],
  // Define parameters used across prompts if any
  parameters: {},
};

// Function to create a tool definition from this config
export function createGreetingTool(
  runtime: AIConfigRuntime, // Expect a runtime instance
  tool_name: string,
  tool_description: string
): any { // Using 'any' for now as ToolDefinition is not found
  return {
    name: tool_name,
    description: tool_description,
    parameters: { // Input schema for the tool
      type: "object",
      properties: {}, // No input params needed for simple greeting
      required: [],
    },
    // The function to execute when the tool is called
    execute: async (params: JSONObject): Promise<JSONObject | string> => {
      try {
        console.log(`Tool ${tool_name}: Running GreetingAgent config...`, params);
        // Run the 'generate_greeting' prompt. run() returns Output[]
        const outputs: Output[] | null = await runtime.run(
          "generate_greeting", // Name of the prompt in the config
          { /* Parameters for the run, if any */ },
          { stream: false } // Ensure non-streaming for tool use
        );

        console.log(`Tool ${tool_name}: GreetingAgent result:`, outputs);

        // Extract and return the relevant output.
        let outputText = "No greeting generated.";
        // Check if outputs array exists and has content
        if (outputs && outputs.length > 0) {
            const firstOutput = outputs[0]; // Get the first Output object
            // Check the type of the Output object and extract data
            if (firstOutput.output_type === "execute_result") {
                // Cast to ExecuteResult to access its properties
                const executeResult = firstOutput as ExecuteResult;
                if (typeof executeResult.data === 'string') {
                    outputText = executeResult.data;
                } else if (executeResult.data && typeof (executeResult.data as any).value === 'string') {
                    outputText = (executeResult.data as any).value; // Common pattern
                } else if (executeResult.data && typeof (executeResult.data as any).content === 'string') {
                    outputText = (executeResult.data as any).content; // Another common pattern
                }
                 else {
                    // Fallback if structure is different
                    outputText = JSON.stringify(executeResult.data);
                }
            } else {
                // Handle other output types if necessary (e.g., 'error')
                 outputText = `Unsupported output type: ${firstOutput.output_type}`;
                 console.warn("Unhandled output type:", firstOutput);
            }
        } else if (outputs === null) {
             outputText = "Greeting agent run returned null.";
        } else {
             // Fallback if outputs array is empty
             outputText = "Received empty outputs array.";
        }
        return outputText;
      } catch (error) {
        console.error(`Tool ${tool_name}: Error running GreetingAgent:`, error);
        return `Error: Failed to get greeting - ${(error as Error).message}`;
      }
    },
  };
}