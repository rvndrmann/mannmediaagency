
// Configuration constants for the chat function
export const API_TIMEOUT_MS: number = 120000; // Increased from 60000 to give more time for complex requests
export const MAX_RETRIES: number = 4; // Increased from 3 to try more times
export const RETRY_DELAY_MS: number = 3000; // Increased from 2000 to wait longer between retries
export const MAX_INPUT_LENGTH: number = 8000; // Increased from 4000 to allow more context
export const REQUEST_ID_PREFIX: string = "lf-req-";
export const CACHE_TTL_MS: number = 300000; // 5 minutes cache

// Environment variables for Langflow
export const BASE_API_URL: string = Deno.env.get("BASE_API_URL") || "https://api.langflow.astra.datastax.com";
export const LANGFLOW_ID: string | undefined = Deno.env.get("LANGFLOW_ID");
export const FLOW_ID: string | undefined = Deno.env.get("FLOW_ID");
export const APPLICATION_TOKEN: string | undefined = Deno.env.get("APPLICATION_TOKEN");

// OpenAI Assistant configuration
export const OPENAI_API_KEY: string | undefined = Deno.env.get("OPENAI_API_KEY");
export const ASSISTANT_ID: string | undefined = Deno.env.get("ASSISTANT_ID");
export const USE_ASSISTANTS_API: boolean = Deno.env.get("USE_ASSISTANTS_API") === "true";

// MCP configuration
export const USE_MCP: boolean = Deno.env.get("USE_MCP") === "true";
export const MCP_SERVER_URL: string | undefined = Deno.env.get("MCP_SERVER_URL");
export const MCP_SERVER_TOKEN: string | undefined = Deno.env.get("MCP_SERVER_TOKEN");
