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
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Ensure it's a POST request
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse the request body
    let userInput: string;
    let projectId: string | undefined; // Variable to hold projectId
    let authHeader: string | null = null; // Declare authHeader here
    try {
      const body = await req.json();
      if (!body.input || typeof body.input !== 'string') {
        throw new Error("Missing or invalid 'input' in request body");
      }
      userInput = body.input;
      projectId = body.projectId; // Extract projectId (can be undefined)
      console.log(`Received user input: "${userInput}", projectId: ${projectId}`);
      authHeader = req.headers.get('Authorization'); // Assign value here
    } catch (error) {
      console.error("Error parsing request body:", error);
      const parseErrorMessage = error instanceof Error ? error.message : "Invalid request body";
      return new Response(JSON.stringify({ error: "Bad Request: " + parseErrorMessage }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Execute the orchestrator ---
    // NOTE: Ensure any required environment variables (like OPENAI_API_KEY)
    // are set in the Supabase function settings.
    console.log("Running orchestrator...");
    const result = await runOrchestrator(userInput, projectId, authHeader); // Pass projectId and authHeader
    console.log("Orchestrator finished. Result:", result);

    // Return the result
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Internal Server Error:", error);
    // Check if error is an instance of Error before accessing message
    const errorMessage = error instanceof Error ? error.message : "An unknown internal error occurred.";
    return new Response(JSON.stringify({ error: "Internal Server Error", details: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

console.log("Multi-agent chat function ready to serve requests.");
