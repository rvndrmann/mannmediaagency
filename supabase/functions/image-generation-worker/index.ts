/// <reference types="https://deno.land/x/deno/cli/types/v1.37.1/deno.d.ts" />
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log('ImageGenerationWorker function booting up...');

// --- Supabase Client Initialization ---
let supabase: SupabaseClient | null = null;
let initializationError: Error | null = null;

try {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'); // Use Service Role Key for admin operations

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
  }

  supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      // Required for service_role key
      autoRefreshToken: false,
      persistSession: false
    }
  });
  console.log('Supabase client initialized successfully with Service Role Key.');

} catch (error: unknown) { // Explicitly type caught error as unknown
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error('CRITICAL: Failed to initialize Supabase client:', errorMessage);
  initializationError = error instanceof Error ? error : new Error(errorMessage); // Ensure it's an Error object
  // The function will still start, but requests will fail until env vars are fixed.
}

// --- Types ---
// Define a type for the task structure based on the 'agent_tasks' table
interface AgentTask {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  input_payload: {
    prompt?: string; // Expecting prompt in input_payload
    parameters?: Record<string, any>; // Optional additional parameters
    [key: string]: any; // Allow other properties
  };
  result_payload?: Record<string, any> | null;
  error_message?: string | null;
  updated_at?: string; // For tracking updates
  // Add other relevant fields from your schema if needed
}

// --- Helper Functions ---
const jsonResponse = (data: any, status: number = 200) => {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });
};

// --- Request Handler ---
serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Check if Supabase client failed initialization
  if (initializationError || !supabase) {
    console.error('Supabase client not available. Cannot process request.');
    return jsonResponse({ error: `Internal Server Error: Database client initialization failed. ${initializationError?.message || ''}` }, 500);
  }

  let taskId: string | null = null; // Keep track of taskId for error reporting

  try {
    // 1. Parse request body and validate taskId
    const requestBody = await req.json();
    taskId = requestBody?.taskId;

    if (!taskId || typeof taskId !== 'string') {
      console.error('Invalid request: Missing or invalid taskId.');
      return jsonResponse({ error: 'Invalid request: Missing or invalid taskId.' }, 400);
    }
    console.log(`[${taskId}] ImageGenerationWorker received task.`);

    // 2. Fetch task details
    console.log(`[${taskId}] Fetching task details...`);
    const { data: taskData, error: fetchError } = await supabase
      .from('agent_tasks')
      .select('*') // Adjust columns as needed for efficiency later
      .eq('id', taskId)
      .single();

    if (fetchError) {
        console.error(`[${taskId}] Error fetching task:`, fetchError.message);
        const status = fetchError.message.includes('Results contain 0 rows') ? 404 : 500;
        const errorMessage = status === 404 ? 'Task not found.' : `Failed to fetch task: ${fetchError.message}`;
        return jsonResponse({ error: errorMessage }, status);
    }

    if (!taskData) { // Should be caught by single() error, but double-check
        console.error(`[${taskId}] Task data not found after fetch.`);
        return jsonResponse({ error: 'Task not found.' }, 404);
    }

    const agentTask = taskData as AgentTask;

    // 3. Check task status
    if (agentTask.status !== 'pending') {
      console.log(`[${taskId}] Task is not pending (status: ${agentTask.status}). No action taken.`);
      return jsonResponse({ message: `Task ${taskId} is not pending (status: ${agentTask.status}).` }, 200); // Not an error
    }

    // 4. Update task status to 'processing'
    console.log(`[${taskId}] Updating task status to 'processing'.`);
    const { error: updateProcessingError } = await supabase
      .from('agent_tasks')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', taskId);

    if (updateProcessingError) {
      console.error(`[${taskId}] Error updating task to processing:`, updateProcessingError.message);
      // Don't proceed if we can't mark as processing
      return jsonResponse({ error: `Failed to update task status to processing: ${updateProcessingError.message}` }, 500);
    }

    // 5. Simulate Image Generation
    let resultPayload: Record<string, any> | null = null;
    let simulationError: Error | null = null;

    try {
      const prompt = agentTask.input_payload?.prompt || 'Default prompt: A cute cat.';
      const params = agentTask.input_payload?.parameters || {};
      console.log(`[${taskId}] Starting simulated image generation with prompt: "${prompt}"`, "Params:", params);

      // ** Placeholder: Simulate API call delay **
      const delay = Math.random() * 5000 + 5000; // 5-10 seconds
      await new Promise(resolve => setTimeout(resolve, delay));

      // ** Placeholder: Simulate API result **
      // In a real scenario, make the API call here and handle its response/errors
      // Example: Check for errors from the external API
      const shouldSimulateError = Math.random() < 0.1; // Simulate a 10% failure rate
      if (shouldSimulateError) {
          throw new Error("Simulated API Error: Generation failed due to random issue.");
      }

      // Success case
      const fakeImageUrl = `https://placehold.co/600x400/EEE/31343C/png?text=Generated+Image\\n${taskId}`; // More descriptive placeholder
      resultPayload = { imageUrl: fakeImageUrl, generatedAt: new Date().toISOString() };
      console.log(`[${taskId}] Simulated image generation successful. Result: ${fakeImageUrl}`);

    } catch (err: unknown) {
        console.error(`[${taskId}] Error during simulated image generation:`, err);
        simulationError = err instanceof Error ? err : new Error(String(err));
    }

    // 6. Update Task Completion Status
    let finalStatus: AgentTask['status'];
    let updatePayload: Partial<AgentTask>;

    if (simulationError) {
      finalStatus = 'failed';
      updatePayload = {
        status: finalStatus,
        error_message: simulationError.message,
        result_payload: null, // Ensure result is null on failure
        updated_at: new Date().toISOString(),
      };
      console.log(`[${taskId}] Updating task status to 'failed'.`);
    } else {
      finalStatus = 'completed';
      updatePayload = {
        status: finalStatus,
        result_payload: resultPayload,
        error_message: null, // Clear any previous error
        updated_at: new Date().toISOString(),
      };
      console.log(`[${taskId}] Updating task status to 'completed'.`);
    }

    const { error: updateCompletionError } = await supabase
      .from('agent_tasks')
      .update(updatePayload)
      .eq('id', taskId);

    if (updateCompletionError) {
      // Log the error, but the task processing itself might have succeeded/failed already.
      // This indicates a problem saving the final state.
      console.error(`[${taskId}] CRITICAL: Failed to update task final status (${finalStatus}) in DB:`, updateCompletionError.message);
      // Depending on requirements, this might warrant returning an error even if simulation succeeded.
      // For now, we'll return based on simulation outcome but log this critical DB error.
    }

    // 7. Return final response based on simulation outcome
    // (Future Step): Add logic here later to emit an MCP event (task_completed or task_failed)
    if (finalStatus === 'completed') {
      console.log(`[${taskId}] Task processing finished successfully.`);
      // Placeholder: Emit MCP event after successful DB update (or attempt)
      console.log(`[${taskId}] Placeholder: Emitting MCP event: { type: 'task_completed', taskId: '${taskId}', result: ${JSON.stringify(resultPayload)} }`);
      return jsonResponse({ message: `Task ${taskId} completed successfully.`, result: resultPayload }, 200);
    } else {
      console.log(`[${taskId}] Task processing failed.`);
      // Placeholder: Emit MCP event after successful DB update (or attempt)
      console.log(`[${taskId}] Placeholder: Emitting MCP event: { type: 'task_failed', taskId: '${taskId}', error: ${JSON.stringify(simulationError?.message)} }`);
      // Return 200 OK from the function perspective (it handled the task), but indicate failure in the payload.
      // Alternatively, return 500 if the worker itself is considered to have failed. Let's stick to 200 for now.
      return jsonResponse({ message: `Task ${taskId} failed during processing.`, error: simulationError?.message }, 200);
    }

  } catch (error: unknown) {
    console.error(`[${taskId || 'UNKNOWN'}] Unhandled error in ImageGenerationWorker:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';

    // Attempt to mark task as failed if possible (if taskId is known and DB connection exists)
    if (taskId && supabase) {
        try {
            console.warn(`[${taskId}] Attempting to mark task as failed due to unhandled error: ${errorMessage}`);
            await supabase
                .from('agent_tasks')
                .update({
                    status: 'failed',
                    error_message: `Worker unhandled error: ${errorMessage.substring(0, 500)}`, // Limit error message length
                    updated_at: new Date().toISOString(),
                })
                .eq('id', taskId)
                .neq('status', 'completed'); // Avoid overwriting already completed task
        } catch (dbError) {
            console.error(`[${taskId}] Failed to update task status to failed after unhandled error:`, dbError);
        }
    }

    return jsonResponse({ error: `Internal Server Error: ${errorMessage}` }, 500);
  }
});