
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    // Get API key from environment variables
    const apiKey = Deno.env.get('BROWSER_USE_API_KEY');
    if (!apiKey) {
      console.error("Browser Use API key is not configured");
      return new Response(
        JSON.stringify({ error: "Browser Use API key is not configured" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Parse request JSON
    const requestBody = await req.json();
    console.log("Request body:", JSON.stringify(requestBody, null, 2));
    
    // Handle different types of requests based on action
    const { task_id, url_check_only, action, task, browser_config, save_browser_data } = requestBody;
    
    // Starting a new task
    if (task && !task_id) {
      console.log("Starting new task with configuration:", browser_config);
      
      // Prepare request body for task creation
      const taskRequestBody: Record<string, any> = {
        task,
        save_browser_data: save_browser_data === true
      };
      
      // Add browser configuration if provided
      if (browser_config) {
        taskRequestBody.browser_config = browser_config;
      }
      
      const response = await fetch('https://api.browser-use.com/api/v1/run-task', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(taskRequestBody)
      });
      
      if (!response.ok) {
        // Handle API errors for task creation
        const errorText = await response.text();
        let errorMessage;
        
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorJson.message || `API error: ${response.status}`;
        } catch (e) {
          errorMessage = errorText || `API error: ${response.status}`;
        }
        
        console.error(`API error (${response.status}): ${errorMessage}`);
        
        return new Response(
          JSON.stringify({ error: errorMessage, status: response.status }),
          { 
            status: 200, // Return 200 to handle errors gracefully on the client
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      const data = await response.json();
      console.log("Task started successfully:", data);
      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Task management actions (pause, resume, stop)
    if (task_id && action) {
      console.log(`Performing action ${action} on task ${task_id}`);
      
      let endpoint = '';
      
      switch (action) {
        case 'pause':
          endpoint = 'https://api.browser-use.com/api/v1/pause-task';
          break;
        case 'resume':
          endpoint = 'https://api.browser-use.com/api/v1/resume-task';
          break;
        case 'stop':
          endpoint = 'https://api.browser-use.com/api/v1/stop-task';
          break;
        default:
          return new Response(
            JSON.stringify({ error: `Unknown action: ${action}` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
      }
      
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ task_id })
      });
      
      if (!response.ok) {
        // Handle API errors for task actions
        const errorText = await response.text();
        let errorMessage;
        
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorJson.message || `API error: ${response.status}`;
        } catch (e) {
          errorMessage = errorText || `API error: ${response.status}`;
        }
        
        console.error(`API error (${response.status}) during ${action}: ${errorMessage}`);
        
        if (response.status === 404) {
          errorMessage = `Task not found or expired (${task_id})`;
        }
        
        return new Response(
          JSON.stringify({ error: errorMessage, status: response.status }),
          { 
            status: 200, // Return 200 to handle errors gracefully on the client
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      const data = await response.json();
      console.log(`${action} action successful:`, data);
      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Task status checking and URL retrieval
    if (task_id) {
      if (!task_id) {
        return new Response(
          JSON.stringify({ error: "Task ID is required" }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Use a different API endpoint based on url_check_only flag
      const endpoint = url_check_only 
        ? `https://api.browser-use.com/api/v1/task/${task_id}/media` 
        : `https://api.browser-use.com/api/v1/task/${task_id}`;
      
      console.log(`Checking ${url_check_only ? 'media for' : 'status of'} task: ${task_id}`);
      console.log(`Using authentication: Bearer ${apiKey.substring(0, 4)}...`);
      
      // Implement retries for transient errors
      const maxRetries = 2;
      let retryCount = 0;
      let response;
      
      while (retryCount <= maxRetries) {
        try {
          // Call the Browser Use API
          response = await fetch(endpoint, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            }
          });
          
          // If successful or not a retriable error, break the loop
          if (response.ok || response.status !== 429) {
            break;
          }
          
          // If rate limited, wait before retrying
          if (response.status === 429) {
            console.warn(`Rate limited (attempt ${retryCount + 1}/${maxRetries + 1}), waiting before retry...`);
            // Exponential backoff: 1s, 2s, 4s
            await new Promise(r => setTimeout(r, 1000 * Math.pow(2, retryCount)));
            retryCount++;
          }
        } catch (fetchError) {
          console.error(`Network error (attempt ${retryCount + 1}/${maxRetries + 1}):`, fetchError);
          // Only retry on network errors
          if (retryCount < maxRetries) {
            retryCount++;
            await new Promise(r => setTimeout(r, 1000 * Math.pow(2, retryCount)));
          } else {
            throw fetchError; // Rethrow the error if we've exhausted retries
          }
        }
      }
      
      if (!response.ok) {
        // Handle API errors
        const errorText = await response.text();
        let errorMessage;
        
        try {
          // Try to parse error as JSON
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorJson.message || `API error: ${response.status}`;
        } catch (e) {
          // Fall back to raw error text
          errorMessage = errorText || `API error: ${response.status}`;
        }
        
        // Special handling for not found errors
        if (response.status === 404) {
          errorMessage = "Task not found or expired";
        }
        
        console.error(`API error (${response.status}): ${errorMessage}`);
        
        return new Response(
          JSON.stringify({ error: errorMessage, status: response.status }),
          { 
            status: 200, // Return 200 so we can handle errors gracefully on the client
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      // Parse successful response
      const data = await response.json();
      
      // Return the API response to the client
      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // If we get here, the request was invalid
    return new Response(
      JSON.stringify({ error: "Invalid request: missing task_id or task" }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error in Browser Use API function:", error);
    
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
