// @ts-ignore deno-types
/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

// @ts-ignore deno-types
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
// @ts-ignore deno-types
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
// @ts-ignore deno-types
import "https://deno.land/x/xhr@0.1.0/mod.ts";

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BROWSER_TASK_CREDIT_COST = 1;

// Helper function for consistent JSON responses
const jsonResponse = (body: any, status: number = 200) => {
  return new Response(JSON.stringify(body), {
    status: status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Initialize Supabase client
  const supabaseAdmin: SupabaseClient = createClient(
    // @ts-ignore Deno global
    Deno.env.get('SUPABASE_URL') ?? '',
    // @ts-ignore Deno global
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    // --- Get Request Body and Action ---
    const body = await req.json();
    const { action, userId, taskId, task, browserConfig, save_browser_data, runId } = body;

    // --- User ID Validation (Required for most actions) ---
    // Allow 'get' without userId initially, but enforce ownership check later if userId is present
    if (!userId && action !== 'get') {
        console.error("User ID is required for this action.");
        return jsonResponse({ error: "User ID is required." }, 400);
    }


    // --- Action Routing ---
    switch (action) {
      case 'list': {
        if (!userId) return jsonResponse({ error: "User ID required to list tasks." }, 400); // Re-check userId specifically for list
        console.log(`Listing tasks for user ${userId}`);
        const { data: tasks, error } = await supabaseAdmin
          .from('browser_task_history') // Changed to query the correct history table
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return jsonResponse({ tasks: tasks || [] });
      }

      case 'get': {
        if (!taskId) return jsonResponse({ error: "Task ID required to get task details." }, 400);
        console.log(`Getting details for task ${taskId}`);
        const { data: taskDetails, error } = await supabaseAdmin
          .from('browser_automation_tasks')
          .select('*')
          .eq('task_id', taskId) // Assuming task_id from external API is the unique ID used here
          .maybeSingle(); // Use maybeSingle to handle null if not found

        if (error) throw error;
        if (!taskDetails) return jsonResponse({ error: "Task not found." }, 404);

        // IMPORTANT: If userId was provided in the request, verify ownership.
        if (userId && taskDetails.user_id !== userId) {
            console.warn(`User ${userId} attempted to access task ${taskId} owned by ${taskDetails.user_id}`);
            return jsonResponse({ error: "Access denied. Task does not belong to user." }, 403);
        }
        // If no userId was provided, we assume it's okay to return details (e.g., for a public status view)
        // Adjust this logic based on your security requirements.

        return jsonResponse(taskDetails);
      }

      case 'stop':
      case 'pause':
      case 'resume': {
        if (!userId) return jsonResponse({ error: "User ID required for task control actions." }, 400);
        if (!taskId) return jsonResponse({ error: "Task ID required for task control actions." }, 400);

        console.log(`Performing action '${action}' on task ${taskId} for user ${userId}`);

        // 1. Verify task ownership
        const { data: taskToUpdate, error: fetchError } = await supabaseAdmin
          .from('browser_automation_tasks')
          .select('id, user_id, status') // Select minimal fields needed
          .eq('task_id', taskId)
          .eq('user_id', userId)
          .single(); // Use single to ensure it exists and belongs to user

        if (fetchError || !taskToUpdate) {
          console.error(`Error fetching task ${taskId} for user ${userId} or task not found/owned:`, fetchError);
          return jsonResponse({ error: "Task not found or access denied." }, 404);
        }

        // 2. Determine new status (assuming no external API call needed for these)
        let newStatus: string;
        switch (action) {
            case 'stop': newStatus = 'stopped'; break;
            case 'pause': newStatus = 'paused'; break;
            case 'resume': newStatus = 'running'; break; // Assuming resume sets it back to running
            default: throw new Error("Invalid control action"); // Should not happen
        }

        // 3. Update status in DB
        const { error: updateError } = await supabaseAdmin
          .from('browser_automation_tasks')
          .update({ status: newStatus, updated_at: new Date().toISOString() }) // Also update timestamp
          .eq('id', taskToUpdate.id); // Use primary key 'id' for update

        if (updateError) throw updateError;

        console.log(`Task ${taskId} status updated to ${newStatus}`);
        return jsonResponse({ message: `Task ${action} successful.`, status: newStatus });
      }

      // --- Start Task (Default Action) ---
      case 'start':
      default: { // Treat no action or 'start' as starting a new task
        if (!userId) return jsonResponse({ error: "User ID required to start task." }, 400);
        if (!task) return jsonResponse({ error: "Task description is required." }, 400);

        console.log(`Attempting to start browser automation task for user ${userId}:`, task);

        // Get API key
        // @ts-ignore Deno global
        const apiKey = Deno.env.get("BROWSER_USE_API_KEY");
        if (!apiKey) throw new Error("BROWSER_USE_API_KEY environment variable is not set");

        // --- Credit Check and Deduction ---
        const { data: decrementSuccess, error: decrementError } = await supabaseAdmin.rpc('decrement_user_credits', {
          user_id_param: userId,
          amount: BROWSER_TASK_CREDIT_COST
        });
        if (decrementError) throw new Error("Failed to process credits.");
        if (!decrementSuccess) {
          console.warn(`Insufficient credits for user ${userId}.`);
          return jsonResponse({ error: "Insufficient credits to start task." }, 402);
        }
        console.log(`Successfully deducted ${BROWSER_TASK_CREDIT_COST} credit(s) for user ${userId}.`);
        // --- End Credit Check ---

        // Format request for external API
        const requestBody = { task: task, save_browser_data: save_browser_data !== false };
        if (browserConfig && Object.keys(browserConfig).length > 0) {
          Object.assign(requestBody, { browserConfig });
        }

        // Call External API
        console.log("Sending request to Browser-Use API");
        const options = {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        };
        const response = await fetch('https://api.browser-use.com/api/v1/run-task', options);

        // Handle External API Failure (and refund)
        if (!response.ok) {
          let externalApiErrorData = null;
          try { externalApiErrorData = await response.json(); } catch (e) { /* ignore parsing error */ }
          console.error("Browser-Use API error:", externalApiErrorData || response.statusText);

          // --- Refund Credit ---
          console.warn(`External API call failed for user ${userId}. Attempting refund.`);
          const { error: refundError } = await supabaseAdmin.rpc('increment_user_credits', {
            user_id_param: userId, amount: BROWSER_TASK_CREDIT_COST
          });
          if (refundError) console.error(`CRITICAL: Failed to refund credit for user ${userId}. Error:`, refundError);
          else console.log(`Successfully refunded ${BROWSER_TASK_CREDIT_COST} credit(s) to user ${userId}.`);
          // --- End Refund ---

          throw new Error(`Browser-Use API error: ${externalApiErrorData?.message || response.statusText}`);
        }

        // External API Success
        const externalData = await response.json();
        console.log("Browser-Use API response:", externalData);

        // --- Store Task Record ---
        const { error: dbError } = await supabaseAdmin
          .from('browser_automation_tasks')
          .insert({
            user_id: userId,
            task_id: externalData.task_id, // task_id from external API
            task_description: task,
            status: "running",
            run_id: runId,
            task_config: browserConfig || {},
            credit_cost: BROWSER_TASK_CREDIT_COST // Store cost
          });
        if (dbError) {
          console.error("Error storing task in database:", dbError);
          // Log this, but don't refund as the task *did* start externally
        } else {
          console.log("Successfully stored task record.");
        }
        // --- End Store Task Record ---

        // Generate live URL
        // @ts-ignore Deno global
        const liveUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/browser-automation-ws?taskId=${externalData.task_id}`;

        return jsonResponse({
          taskId: externalData.task_id,
          liveUrl: liveUrl,
          status: "running",
          message: "Browser automation task started"
        });
      } // End Start Task Case
    } // End Switch
  } catch (error) {
    // --- Centralized Error Handling ---
    let errorMessage = "An unexpected error occurred.";
    let statusCode = 500;

    if (error instanceof Error) {
      errorMessage = error.message;
      console.error("Error in browser-use-api function:", errorMessage);
      // Determine status code based on error type
      if (errorMessage.includes("Insufficient credits")) statusCode = 402;
      else if (errorMessage.includes("User ID is required")) statusCode = 400;
      else if (errorMessage.includes("Task ID required")) statusCode = 400;
      else if (errorMessage.includes("Task not found")) statusCode = 404;
      else if (errorMessage.includes("Access denied")) statusCode = 403;
      else if (errorMessage.includes("Browser-Use API error")) statusCode = 502;
      else if (errorMessage.includes("Failed to process credits")) statusCode = 500; // Internal server error
    } else {
      console.error("Unknown error in browser-use-api function:", error);
    }

    return jsonResponse({ error: errorMessage }, statusCode);
  }
});
