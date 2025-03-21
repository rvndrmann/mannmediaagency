
import { ToolDefinition } from "./types";

// Map of tool definitions
const toolsMap: Record<string, ToolDefinition> = {};

// Register a tool definition
export const registerTool = (tool: ToolDefinition): void => {
  toolsMap[tool.name] = tool;
};

// Get a tool by name
export const getTool = (name: string): ToolDefinition | undefined => {
  return toolsMap[name];
};

// Get all tools
export const getAllTools = (): ToolDefinition[] => {
  return Object.values(toolsMap);
};

// Initialize with some sample tools
registerTool({
  name: "image-generation",
  description: "Generate an image from a text prompt",
  parameters: {
    prompt: {
      type: "string",
      description: "Text description of the image to generate",
      required: true
    },
    style: {
      type: "string",
      description: "Style of the image (realistic, cartoon, etc.)",
      required: false
    }
  },
  requiredCredits: 0.5,
  execute: async (params, context) => {
    console.log(`Mock image generation with prompt: ${params.prompt}`);
    // In a real implementation, this would call an API
    return {
      success: true,
      message: `Successfully generated image from prompt: "${params.prompt}"`,
      data: {
        imageUrl: "https://placeholder.com/800x600",
        generationId: "gen-" + Date.now()
      }
    };
  }
});

registerTool({
  name: "web-search",
  description: "Search the web for information",
  parameters: {
    query: {
      type: "string",
      description: "Search query",
      required: true
    },
    numResults: {
      type: "number",
      description: "Number of results to return",
      required: false
    }
  },
  requiredCredits: 0.3,
  execute: async (params, context) => {
    console.log(`Mock web search for: ${params.query}`);
    // In a real implementation, this would call an API
    return {
      success: true,
      message: `Web search results for: "${params.query}"`,
      data: {
        results: [
          { title: "Example result 1", snippet: "This is an example search result." },
          { title: "Example result 2", snippet: "Another example search result." }
        ]
      }
    };
  }
});
