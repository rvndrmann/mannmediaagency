import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import OpenAI from "https://esm.sh/openai@4";
import { corsHeaders } from "../_shared/cors.ts";

console.log("Chat Interface Agent function booting up...");

// --- Initialize Supabase Client ---
let supabase: ReturnType<typeof createClient>;
try {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables.");
  }
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${supabaseAnonKey}` } }, // Use anon key for server-side functions
  });
  console.log("Supabase client initialized.");
} catch (error) {
  console.error("Supabase client initialization failed:", error);
  // If Supabase client fails, the function cannot proceed meaningfully.
  // Consider how to handle this - maybe return a specific error immediately in serve?
}

// --- Initialize OpenAI Client ---
let openai: OpenAI;
try {
  const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiApiKey) {
    throw new Error("Missing OPENAI_API_KEY environment variable.");
  }
  openai = new OpenAI({ apiKey: openaiApiKey });
  console.log("OpenAI client initialized.");
} catch (error) {
  console.error("OpenAI client initialization failed:", error);
  // NLU step will fail if OpenAI client isn't initialized.
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Ensure clients are initialized before processing requests
  if (!supabase) {
    return new Response(JSON.stringify({ error: "Internal Server Error: Supabase client not available." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  // OpenAI is optional for NLU, so we don't hard fail here, but NLU will be skipped.

  try {
    // Ensure the request is a POST request
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse the request body
    // Expecting { userInput: string, projectId: string, threadId?: string }
    const requestData = await req.json();
    console.log("CIA Received request:", requestData);

    const { userInput, projectId, threadId } = requestData;

    // Validate required fields
    if (!userInput || !projectId) {
      return new Response(JSON.stringify({ error: "Missing required fields: userInput and projectId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- (Optional) NLU Step ---
    let intent = "general_query"; // Default intent
    let parameters: Record<string, any> = { originalInput: userInput }; // Default parameters

    if (openai) { // Only attempt NLU if OpenAI client is initialized
      try {
        const nluPrompt = `
          Analyze the following user input and extract the primary intent and any relevant parameters.
          Possible intents: 'generate_script', 'refine_script', 'generate_prompt', 'generate_image', 'update_scene', 'general_query'.
          Extract parameters relevant to the intent, such as scene numbers, specific instructions, or keywords.
          Return the result as a JSON object with keys "intent" and "parameters".
          If no specific intent is clear, use "general_query".

          User Input: "${userInput}"

          JSON Output:
        `;

        console.log("Sending request to OpenAI for NLU...");
        const completion = await openai.chat.completions.create({
          model: "gpt-3.5-turbo", // Or "gpt-4o"
          messages: [{ role: "user", content: nluPrompt }],
          response_format: { type: "json_object" },
          temperature: 0.2,
        });

        const nluResultContent = completion.choices[0]?.message?.content;
        console.log("OpenAI NLU Raw Response:", nluResultContent);

        if (nluResultContent) {
          try {
            const nluResult = JSON.parse(nluResultContent);
            if (nluResult.intent && typeof nluResult.intent === 'string') {
              intent = nluResult.intent;
            }
            if (nluResult.parameters && typeof nluResult.parameters === 'object') {
              parameters = { ...parameters, ...nluResult.parameters }; // Merge originalInput with extracted params
            }
            console.log("NLU Result:", { intent, parameters });
          } catch (parseError) {
            console.error("Failed to parse NLU JSON response:", parseError, "Raw content:", nluResultContent);
            // Keep default intent/parameters if parsing fails
          }
        } else {
           console.warn("OpenAI NLU returned empty content.");
           // Keep default intent/parameters
        }
      } catch (nluError) {
        console.error("Error during NLU step:", nluError);
        // Proceed with default intent/parameters if NLU fails
      }
    } else {
      console.warn("OpenAI client not initialized. Skipping NLU step.");
    }

    // --- Prepare RRO Request ---
    const sceneId = parameters?.sceneId || parameters?.scene_id || parameters?.sceneNumber; // Extract sceneId if present
    const rroRequestBody = {
      intent,
      parameters,
      projectId,
      sceneId: typeof sceneId === 'number' || typeof sceneId === 'string' ? String(sceneId) : undefined, // Ensure sceneId is string or undefined
      threadId, // Pass threadId if provided
      userInput, // Also pass the original user input
    };
    console.log("Prepared RRO Request Body:", rroRequestBody);

    // --- Invoke RRO ---
    console.log("Invoking Request Router Orchestrator (RRO)...");
    const { data: rroData, error: rroError } = await supabase.functions.invoke(
      "request-router-orchestrator",
      { body: rroRequestBody }
    );

    // --- Handle RRO Response ---
    if (rroError) {
      console.error("Error invoking RRO:", rroError);
      // Try to parse Supabase Edge Function error details if available
      let errorMessage = "Failed to process request via RRO.";
      if (rroError instanceof Error && 'details' in rroError) {
         errorMessage = `RRO Error: ${rroError.message} - ${rroError.details}`;
      } else if (rroError instanceof Error) {
         errorMessage = `RRO Error: ${rroError.message}`;
      } else {
         errorMessage = `RRO Invocation Error: ${String(rroError)}`;
      }
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: 500, // Or potentially map RRO errors to client errors (e.g., 4xx) if appropriate
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("RRO Invocation Successful. RRO Data:", rroData);

    // --- Return Response to Frontend ---
    // Formulate response based on RRO output. This might need refinement
    // depending on the exact structure RRO returns.
    const responsePayload = {
      message: rroData?.message || "Request processed.", // Default message
      rroResponse: rroData, // Include the full RRO response for the frontend
    };

    return new Response(JSON.stringify(responsePayload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200, // Assuming RRO handles its own errors and returns 200 from invoke if *invocation* succeeded
    });

  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e));
    console.error("Error processing CIA request:", error);
    return new Response(JSON.stringify({ error: `Internal Server Error: ${error.message}` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});