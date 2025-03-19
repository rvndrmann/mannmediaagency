
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

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
    // Read request
    const { action, task_id, task, save_browser_data, browser_config } = await req.json();
    
    // Get Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get browser-use API key from env vars
    const browserUseApiKey = Deno.env.get("BROWSER_USE_API_KEY");
    
    if (!browserUseApiKey) {
      console.error("BROWSER_USE_API_KEY is not set");
      return new Response(
        JSON.stringify({ error: "API key is not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }
    
    // Define API base URL
    const API_BASE_URL = "https://api.browser-use.com/api/v1";
    
    // Set headers for all API requests
    const apiHeaders = {
      "Authorization": `Bearer ${browserUseApiKey}`,
      "Content-Type": "application/json"
    };
    
    // Handle different action types
    if (action === 'pause') {
      console.log(`Pausing task with ID: ${task_id}`);
      
      try {
        const response = await fetch(`${API_BASE_URL}/task/${task_id}/pause`, {
          method: "POST",
          headers: apiHeaders
        });
        
        if (!response.ok) {
          const errorData = await response.text();
          console.error(`Failed to pause task: ${response.status} ${errorData}`);
          
          return new Response(
            JSON.stringify({ error: `Failed to pause task: ${response.status}`, details: errorData }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: response.status }
          );
        }
        
        const data = await response.json();
        return new Response(
          JSON.stringify(data),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (error) {
        console.error(`Error pausing task: ${error.message}`);
        return new Response(
          JSON.stringify({ error: error.message }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
    } else if (action === 'resume') {
      console.log(`Resuming task with ID: ${task_id}`);
      
      try {
        const response = await fetch(`${API_BASE_URL}/task/${task_id}/resume`, {
          method: "POST",
          headers: apiHeaders
        });
        
        if (!response.ok) {
          const errorData = await response.text();
          console.error(`Failed to resume task: ${response.status} ${errorData}`);
          
          return new Response(
            JSON.stringify({ error: `Failed to resume task: ${response.status}`, details: errorData }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: response.status }
          );
        }
        
        const data = await response.json();
        return new Response(
          JSON.stringify(data),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (error) {
        console.error(`Error resuming task: ${error.message}`);
        return new Response(
          JSON.stringify({ error: error.message }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
    } else if (action === 'stop') {
      console.log(`Stopping task with ID: ${task_id}`);
      
      try {
        const response = await fetch(`${API_BASE_URL}/task/${task_id}/stop`, {
          method: "POST",
          headers: apiHeaders
        });
        
        if (!response.ok) {
          const errorData = await response.text();
          console.error(`Failed to stop task: ${response.status} ${errorData}`);
          
          if (response.status === 404 && errorData.includes("not found")) {
            // Special handling for not found - task might have already completed
            return new Response(
              JSON.stringify({ status: "stopped", info: "Task may have already completed or been stopped" }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          
          return new Response(
            JSON.stringify({ error: `Failed to stop task: ${response.status}`, details: errorData }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: response.status }
          );
        }
        
        const data = await response.json();
        return new Response(
          JSON.stringify(data),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (error) {
        console.error(`Error stopping task: ${error.message}`);
        return new Response(
          JSON.stringify({ error: error.message }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
    } else if (task) {
      // Create a new task
      console.log(`Creating new task with config: ${JSON.stringify({
        task,
        save_browser_data,
        ...browser_config
      }, null, 2)}`);
      
      try {
        const response = await fetch(`${API_BASE_URL}/task`, {
          method: "POST",
          headers: apiHeaders,
          body: JSON.stringify({
            task,
            save_browser_data,
            ...browser_config
          })
        });
        
        if (!response.ok) {
          const errorData = await response.text();
          console.error(`Failed to create task: ${response.status} ${errorData}`);
          
          return new Response(
            JSON.stringify({ error: `Failed to create task: ${response.status}`, details: errorData }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: response.status }
          );
        }
        
        const data = await response.json();
        
        // If we have a task ID in the response, set up immediate live URL
        if (data.id) {
          console.log(`Task created with ID: ${data.id}`);
          
          // Try to get a live URL immediately - some tasks set it up quickly
          try {
            const statusResponse = await fetch(`${API_BASE_URL}/task/${data.id}`, {
              method: "GET",
              headers: apiHeaders
            });
            
            if (statusResponse.ok) {
              const statusData = await statusResponse.json();
              if (statusData && statusData.browser && statusData.browser.live_url) {
                data.live_url = statusData.browser.live_url;
                console.log(`Immediate live URL available: ${data.live_url}`);
              }
            }
          } catch (liveUrlError) {
            console.warn(`Non-critical error fetching initial live URL: ${liveUrlError.message}`);
          }
          
          return new Response(
            JSON.stringify({
              id: data.id,
              task_id: data.id,
              live_url: data.live_url || null
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } else {
          console.error("Task created but no ID returned");
          return new Response(
            JSON.stringify({ error: "Task created but no ID returned" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
          );
        }
      } catch (error) {
        console.error(`Error creating task: ${error.message}`);
        return new Response(
          JSON.stringify({ error: error.message }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
    } else if (task_id) {
      // If status endpoint is called with a task_id but no action
      console.log(`Fetching status for task: ${task_id}`);
      
      try {
        const response = await fetch(`${API_BASE_URL}/task/${task_id}`, {
          method: "GET",
          headers: apiHeaders
        });
        
        if (!response.ok) {
          const errorData = await response.text();
          console.error(`Failed to fetch task status: ${response.status} ${errorData}`);
          
          // Special handling for 404 errors - task might not exist or have been deleted
          if (response.status === 404) {
            return new Response(
              JSON.stringify({ 
                status: "failed", 
                error: "Agent session not found - the task may have been deleted or expired"
              }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          
          return new Response(
            JSON.stringify({ error: `Failed to fetch task status: ${response.status}`, details: errorData }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: response.status }
          );
        }
        
        const data = await response.json();
        
        // Also get any recordings available
        let recordings = [];
        try {
          const mediaResponse = await fetch(`${API_BASE_URL}/task/${task_id}/media`, {
            method: "GET",
            headers: apiHeaders
          });
          
          if (mediaResponse.ok) {
            const mediaData = await mediaResponse.json();
            if (mediaData && mediaData.recordings && mediaData.recordings.length > 0) {
              recordings = mediaData.recordings;
              console.log(`Found ${recordings.length} recordings for task ${task_id}`);
            }
          }
        } catch (mediaError) {
          console.warn(`Non-critical error fetching media: ${mediaError.message}`);
        }
        
        // Include recordings in the response
        return new Response(
          JSON.stringify({
            ...data,
            recordings,
            task_id: task_id
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (error) {
        console.error(`Error fetching task status: ${error.message}`);
        return new Response(
          JSON.stringify({ error: error.message }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid request - missing task or task_id" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
  } catch (error) {
    console.error(`Unexpected error: ${error.message}`);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
