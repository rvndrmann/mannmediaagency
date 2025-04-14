// @deno-types="https://deno.land/std@0.168.0/http/server.d.ts" // Add type hint for local TS server
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"; // TS error 'Cannot find module' is often a local setup issue for Deno imports, should work on deploy.
// Assuming cors.ts is one level up in a _shared directory
import { corsHeaders } from "../_shared/cors.ts";
// Import the orchestrator runner
// NOTE: This assumes 'aiconfig' and its dependencies work in Deno.
// If 'aiconfig' strictly requires Node.js, this function needs to be
// rewritten using the Supabase Node.js runtime.
import { runOrchestrator } from "./runner.ts"; // Use .ts extension for Deno imports

console.log("Multi-agent chat function booting up...");

serve(async (req: Request) => {
  console.log(`[${new Date().toISOString()}] [Request Start] Handling incoming request... Method: ${req.method}`);
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log(`[${new Date().toISOString()}] [CORS Preflight] Responding OK.`);
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log(`[${new Date().toISOString()}] [Check Method] Validating request method.`);
    // Ensure it's a POST request
    if (req.method !== "POST") {
      console.error(`[${new Date().toISOString()}] [Error] Method Not Allowed: ${req.method}`);
      return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log(`[${new Date().toISOString()}] [Check Method] Method is POST.`);

    // Parse the request body
    let userInput: string = ""; // Initialize
    let projectId: string | undefined;
    let authHeader: string | null = null;
    console.log(`[${new Date().toISOString()}] [Parse Body] Attempting to parse request body...`);
    try {
      const body = await req.json();
      console.log(`[${new Date().toISOString()}] [Parse Body] Raw body parsed:`, body); // Log raw body
      if (!body || typeof body.input !== 'string') { // Check body exists first
        throw new Error("Missing or invalid 'input' in request body");
      }
      userInput = body.input;
      projectId = body.projectId; // Extract projectId (can be undefined or null)
      authHeader = req.headers.get('Authorization'); // Assign value here
      console.log(`[${new Date().toISOString()}] [Parse Body] Parsed OK. Input: "${userInput}", ProjectId: ${projectId}, Auth Header Present: ${!!authHeader}`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] [Error] Error parsing request body:`, error);
      const parseErrorMessage = error instanceof Error ? error.message : "Invalid request body";
      return new Response(JSON.stringify({ error: "Bad Request: " + parseErrorMessage }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Execute the orchestrator ---
    // NOTE: Ensure any required environment variables (like OPENAI_API_KEY)
    // are set in the Supabase function settings.
    console.log(`[${new Date().toISOString()}] [Run Orchestrator] Calling runOrchestrator...`);
    const result = await runOrchestrator(userInput, projectId, authHeader); // Pass projectId and authHeader
    console.log(`[${new Date().toISOString()}] [Run Orchestrator] Finished. Result:`, JSON.stringify(result)); // Stringify for better logging

    // Return the result
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error(`[${new Date().toISOString()}] [FATAL ERROR] Top-level catch block in index.ts:`, error);
    // Check if error is an instance of Error before accessing message
    const errorMessage = error instanceof Error ? error.message : "An unknown internal error occurred.";
    // Log stack trace if available
    if (error instanceof Error && error.stack) {
        console.error(`[${new Date().toISOString()}] [FATAL ERROR Stack Trace]:`, error.stack);
    }
    return new Response(JSON.stringify({ error: "Internal Server Error", details: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500, // Ensure 500 is returned on error
    });
  }
});

console.log("Multi-agent chat function ready to serve requests.");
