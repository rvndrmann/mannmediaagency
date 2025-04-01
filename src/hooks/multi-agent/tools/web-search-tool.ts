
import { CommandExecutionState, ToolContext, ToolExecutionResult } from '../types';

interface WebSearchParams {
  query: string;
  num_results?: number;
}

export async function executeWebSearch(
  parameters: WebSearchParams, 
  context: ToolContext
): Promise<ToolExecutionResult> {
  try {
    // Mock web search results
    const results = [
      {
        title: 'Sample Search Result 1',
        snippet: 'This is a sample search result description',
        url: 'https://example.com/result1'
      },
      {
        title: 'Sample Search Result 2',
        snippet: 'Another sample search result with different information',
        url: 'https://example.com/result2'
      },
      {
        title: 'Sample Search Result 3',
        snippet: 'Yet another interesting search result example',
        url: 'https://example.com/result3'
      }
    ];

    return {
      success: true,
      data: { results: results.slice(0, parameters.num_results || 3) },
      message: `Found ${results.length} results for query: ${parameters.query}`,
      state: CommandExecutionState.COMPLETED
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: `Failed to execute web search for query: ${parameters.query}`,
      state: CommandExecutionState.FAILED
    };
  }
}

export const webSearchTool = {
  name: "web_search",
  description: "Search the web for information",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "The search query"
      },
      num_results: {
        type: "number",
        description: "Number of results to return"
      }
    },
    required: ["query"]
  },
  execute: executeWebSearch
};
