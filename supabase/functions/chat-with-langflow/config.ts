
// Configuration constants for the chat function
export const API_TIMEOUT_MS: number = 60000; // Increased from 30000 to give more time for the request
export const MAX_RETRIES: number = 3; // Increased from 2 to try more times
export const RETRY_DELAY_MS: number = 2000; // Increased from 1000 to wait longer between retries
export const MAX_INPUT_LENGTH: number = 4000;
export const REQUEST_ID_PREFIX: string = "lf-req-";
export const CACHE_TTL_MS: number = 300000; // 5 minutes cache

// Environment variables
export const BASE_API_URL: string = Deno.env.get("BASE_API_URL") || "https://api.langflow.astra.datastax.com";
export const LANGFLOW_ID: string | undefined = Deno.env.get("LANGFLOW_ID");
export const FLOW_ID: string | undefined = Deno.env.get("FLOW_ID");
export const APPLICATION_TOKEN: string | undefined = Deno.env.get("APPLICATION_TOKEN");
