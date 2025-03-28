
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { task, browserConfig, save_browser_data, userId, runId } = await req.json();
    
    // Get API key from environment
    const apiKey = Deno.env.get("BROWSER_USE_API_KEY");
    if (!apiKey) {
      throw new Error("BROWSER_USE_API_KEY environment variable is not set");
    }

    console.log(`Starting browser automation task for user ${userId}:`, task);

    // Format the request body
    const requestBody = {
      task: task,
      save_browser_data: save_browser_data !== false
    };

    // Add browser configuration if provided
    if (browserConfig && Object.keys(browserConfig).length > 0) {
      Object.assign(requestBody, { browserConfig });
    }

    // Call the Browser-Use API
    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    };

    console.log("Sending request to Browser-Use API");
    const response = await fetch('https://api.browser-use.com/api/v1/run-task', options);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error("Browser-Use API error:", errorData);
      throw new Error(`Browser-Use API error: ${errorData.message || response.statusText}`);
    }

    const data = await response.json();
    console.log("Browser-Use API response:", data);

    // Create a task record in the database
    const { data: taskRecord, error: dbError } = await fetch(
      `${Deno.env.get("SUPABASE_URL")}/rest/v1/browser_automation_tasks`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Prefer": "return=representation",
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          user_id: userId,
          task_id: data.task_id,
          task_description: task,
          status: "running",
          run_id: runId,
          task_config: browserConfig || {}
        }),
      }
    ).then(res => res.json());

    if (dbError) {
      console.error("Error storing task in database:", dbError);
    }

    // Generate a live URL to view the task
    const liveUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/browser-automation-ws?taskId=${data.task_id}`;

    return new Response(
      JSON.stringify({
        taskId: data.task_id,
        liveUrl: liveUrl,
        status: "running",
        message: "Browser automation task started"
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    console.error("Error in browser-use-api function:", error);
    
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to execute browser automation task"
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});
