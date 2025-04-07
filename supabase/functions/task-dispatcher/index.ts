import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

console.log("Task Dispatcher function initializing...");

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl) {
  console.error("Missing SUPABASE_URL environment variable.");
  throw new Error("Missing SUPABASE_URL environment variable.");
}
if (!serviceRoleKey) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable.");
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    // Required for service role key
    autoRefreshToken: false,
    persistSession: false,
  },
});

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("Task Dispatcher function invoked.");

    // Query the agent_tasks table for tasks with status 'pending'
    const { data: pendingTasks, error: queryError } = await supabase
      .from('agent_tasks')
      .select('id, assigned_agent') // Select only necessary fields
      .eq('status', 'pending');

    if (queryError) {
      console.error("Error querying pending tasks:", queryError);
      throw new Error(`Error querying pending tasks: ${queryError.message}`);
    }

    console.log(`Found ${pendingTasks?.length || 0} pending tasks.`);
    let tasksProcessed = 0;

    // Helper function to map agent names to Supabase function names
    function getFunctionNameForAgent(agentName: string | null): string | null {
      if (!agentName) return null;
      switch (agentName) {
        case 'ScriptAgent':
          return 'script-agent';
        case 'PromptAgent':
          return 'prompt-agent';
        case 'ImageGenerationWorker':
          return 'image-generation-worker';
        // Add other agent mappings here as needed
        default:
          console.warn(`Unknown agent name encountered: ${agentName}`);
          return null;
      }
    }

    // Loop through pending tasks and invoke corresponding functions
    for (const task of pendingTasks || []) {
      tasksProcessed++; // Count each task we attempt to process
      console.log(`Processing task ${task.id} assigned to ${task.assigned_agent}`);

      const functionName = getFunctionNameForAgent(task.assigned_agent);

      if (!functionName) {
        console.error(`No function mapping found for agent "${task.assigned_agent}" on task ${task.id}. Skipping invocation.`);
        // Optionally: Update task status to 'failed' or 'error' here
        continue; // Skip to the next task
      }

      try {
        // Invoke the appropriate worker function without waiting for completion
        const { error: invokeError } = await supabase.functions.invoke(
          functionName,
          {
            body: { taskId: task.id },
            invokeOptions: { noWait: true } // Fire-and-forget invocation
          }
        );

        if (invokeError) {
          // Log error but continue processing other tasks
          console.error(`Error invoking function "${functionName}" for task ${task.id}:`, invokeError);
          // Optionally: Update task status to 'failed' or 'error' here
        } else {
          console.log(`Successfully triggered function "${functionName}" for task ${task.id}.`);
          // Optionally: Update task status to 'processing' or 'dispatched' here
        }
      } catch (invocationCatchError) {
         // Catch unexpected errors during the invoke call itself
         console.error(`Unexpected error during invocation for task ${task.id} with function ${functionName}:`, invocationCatchError);
      }
    }

    return new Response(
      JSON.stringify({
        message: "Dispatcher run completed.",
        tasksProcessed: tasksProcessed, // Report actual count
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in Task Dispatcher:", error);
    let errorMessage = "An unexpected error occurred in Task Dispatcher.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

console.log("Task Dispatcher function handler registered.");