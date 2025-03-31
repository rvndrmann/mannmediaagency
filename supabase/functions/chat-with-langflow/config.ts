
// API Configuration
export const BASE_API_URL = Deno.env.get("BASE_API_URL") || "https://api.langflow.com";
export const LANGFLOW_ID = Deno.env.get("LANGFLOW_ID") || "";
export const FLOW_ID = Deno.env.get("FLOW_ID") || "";
export const APPLICATION_TOKEN = Deno.env.get("APPLICATION_TOKEN") || "";

// OpenAI Configuration
export const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || "";
export const OPENAI_ASSISTANT_ID = Deno.env.get("OPENAI_ASSISTANT_ID") || "";

// Feature flags
export const USE_ASSISTANTS_API = false; // Set to true to use OpenAI Assistants API instead of Langflow
export const USE_MCP = false; // Set to true to use Model Context Protocol

// Request parameters
export const MAX_INPUT_LENGTH = 15000;
export const MAX_RETRIES = 2;
export const RETRY_DELAY = 1000;
export const REQUEST_TIMEOUT = 30000;
