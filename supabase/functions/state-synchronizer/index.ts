/// &lt;reference types="https://deno.land/x/deno/cli/types/v1.37.1/index.d.ts" /&gt;
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts' // Removed ServerRequest as it's not directly used and Request is standard
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2' // Added import and type
import { corsHeaders } from '../_shared/cors.ts'

console.log('State Synchronizer function booting up...')

// Initialize Supabase client
const supabaseUrl: string | undefined = Deno.env.get('SUPABASE_URL')
const supabaseAnonKey: string | undefined = Deno.env.get('SUPABASE_ANON_KEY')

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables.')
  // Optionally, throw an error or exit if the client cannot be initialized
  // For now, we'll log the error and let requests fail later if the client is needed.
}

// We only initialize the client if the env vars are present.
// Functions needing the client should handle the case where it's null.
const supabase: SupabaseClient | null = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

if (!supabase) {
    console.error("Supabase client could not be initialized due to missing environment variables.");
} else {
    console.log("Supabase client initialized successfully.");
}


serve(async (req: Request) => { // Added Request type
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Only accept POST requests
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // --- Request Body Parsing and Validation ---
    let requestBody: { type: string; projectId: string; sceneId: string; field: string; newValue: any };
    try {
      requestBody = await req.json();
      // Basic structure validation
      if (
        !requestBody ||
        typeof requestBody !== 'object' ||
        requestBody.type !== 'canvas_update' ||
        typeof requestBody.projectId !== 'string' ||
        typeof requestBody.sceneId !== 'string' ||
        typeof requestBody.field !== 'string' ||
        requestBody.newValue === undefined // Allow null, but not undefined
      ) {
        throw new Error('Invalid request body structure or missing required fields.');
      }
    } catch (parseError: unknown) { // Added unknown type
      console.error('Error parsing request body:', parseError);
      // Type guard for error message
      const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown parsing error';
      return new Response(JSON.stringify({ error: `Bad Request: ${errorMessage}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Received valid state synchronization request:', requestBody);
    const { projectId, sceneId, field, newValue } = requestBody;

    // --- Placeholder: Detailed Validation Logic ---
    // TODO: Add more specific validation based on the 'field'
    // Example: Check if 'field' is one of the allowed updatable fields for a scene.
    // Example: Validate the type of 'newValue' based on the 'field' (e.g., string for 'script', number for 'duration').
    console.log(`Placeholder: Validating field '${field}' and newValue type...`);

    // --- Placeholder: Downstream Action Triggering ---
    // TODO: Implement logic to trigger downstream actions based on the update.
    // This might involve updating the database, creating tasks for workers, or sending MCP events.
    console.log(`Placeholder: Determining downstream actions for field '${field}'...`);
    console.log(`Placeholder: Emitting MCP event: { type: 'canvas_updated', payload: ${JSON.stringify(requestBody)} }`); // Simulate MCP event

    if (field === 'image_prompt') {
      // Example: Create a task for the ImageGenerationWorker
      console.log(`Placeholder: Would trigger image regeneration for scene ${sceneId}`);
      // await createImageGenerationTask(projectId, sceneId, newValue); // Future implementation
    } else if (field === 'script' || field === 'scene_description') {
      // Example: Notify RRO/CIA or trigger script analysis
      console.log(`Placeholder: Would notify RRO/CIA about script/description change for scene ${sceneId}`);
      // await notifyRelevantAgents(projectId, sceneId, field, newValue); // Future implementation (e.g., via MCP event)
    } else {
        // Handle other field updates (e.g., just update the DB)
        console.log(`Placeholder: Handling update for field '${field}' (e.g., direct DB update)`);
        // await updateSceneFieldInDB(projectId, sceneId, field, newValue); // Future implementation
    }

    // --- Success Response ---
    return new Response(
      JSON.stringify({ message: 'State synchronization request processed successfully by SS.' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: unknown) { // Added unknown type
    // Catch unexpected errors during processing (after parsing)
    console.error('Error processing state synchronization request:', error);
     // Type guard for error message
    const errorMessage = error instanceof Error ? error.message : 'Unknown internal server error';
    return new Response(JSON.stringify({ error: `Internal Server Error: ${errorMessage}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});