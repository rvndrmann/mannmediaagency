
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

interface BrowserUseApiRequest {
  task?: string;
  task_id?: string;
  save_browser_data?: boolean;
  action?: 'pause' | 'resume' | 'stop';
  browser_config?: any;
}

interface TaskMediaResponse {
  recordings: string[] | null;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const API_KEY = Deno.env.get("BROWSER_USE_API_KEY");
    
    if (!API_KEY) {
      throw new Error("Browser Use API key is not configured.");
    }

    // Base API URL changed to use api.browser-use.com
    const BASE_URL = "https://api.browser-use.com/api/v1";
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    
    console.log(`Processing request for path: ${url.pathname}, method: ${req.method}`);
    
    // Check if this is a status endpoint call
    if (pathParts[pathParts.length - 1] === 'status') {
      const { data, error } = await checkTaskStatus(req);
      
      if (error) {
        throw error;
      }
      
      console.log("Returning status data:", data);
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Check if this is a media endpoint call
    if (pathParts[pathParts.length - 1] === 'media') {
      // Extract task ID from URL path
      const taskIdIndex = pathParts.indexOf('task') + 1;
      let taskId: string | null = null;
      
      if (taskIdIndex < pathParts.length) {
        taskId = pathParts[taskIdIndex];
      }
      
      if (taskId) {
        console.log(`Fetching media for task ID: ${taskId}`);
        return await getTaskMediaByTaskId(taskId);
      } else {
        console.log("No task ID found in URL, trying to parse from request body");
        const { data, error } = await getTaskMedia(req);
        
        if (error) {
          throw error;
        }
        
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // For standard task operations
    let requestBody: BrowserUseApiRequest;
    let requestText = '';
    try {
      requestText = await req.text();
      console.log(`Request body received: ${requestText}`);
      requestBody = requestText ? JSON.parse(requestText) : {};
    } catch (parseError) {
      console.error(`Error parsing request body: ${parseError.message}, raw text: ${requestText}`);
      return new Response(JSON.stringify({
        error: `Invalid JSON in request body: ${parseError.message}`
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Get task from database if task_id is provided but no task
    if (requestBody.task_id && !requestBody.task && !requestBody.action) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      console.log(`Looking up task with ID: ${requestBody.task_id}`);
      const { data: taskData, error: taskError } = await supabase
        .from('browser_automation_tasks')
        .select('input, browser_task_id')
        .eq('id', requestBody.task_id)
        .single();
      
      if (taskError) {
        console.error(`Error fetching task: ${taskError.message}`);
        throw new Error(`Error fetching task: ${taskError.message}`);
      }
      
      if (taskData.browser_task_id) {
        console.log(`Found existing browser task ID: ${taskData.browser_task_id}`);
        // Task already exists in browser-use API, get status
        return await checkTaskStatus(req, taskData.browser_task_id);
      }
      
      console.log(`Using input from database: ${taskData.input}`);
      requestBody.task = taskData.input;
    }

    // Handle different operations based on action
    let endpoint = '';
    let method = 'POST';
    let body: any = undefined;
    
    if (requestBody.action) {
      // Actions for existing tasks
      const taskId = requestBody.task_id;
      if (!taskId) {
        throw new Error("Task ID is required for task actions");
      }
      
      endpoint = `${BASE_URL}/task/${taskId}/${requestBody.action}`;
      method = 'POST';
      console.log(`Performing action: ${requestBody.action} on task: ${taskId}`);
    } else if (requestBody.task) {
      // Creating a new task - updated to use run-task endpoint
      endpoint = `${BASE_URL}/run-task`;
      body = {
        task: requestBody.task,
        save_browser_data: true
      };
      
      // Add browser configuration if provided
      if (requestBody.browser_config) {
        body = { ...body, ...requestBody.browser_config };
      }
      
      console.log(`Creating new task with config: ${JSON.stringify(body, null, 2)}`);
    }

    console.log(`Calling Browser Use API: ${endpoint}`, body ? `with body: ${JSON.stringify(body)}` : "No body");
    
    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      // Handle non-OK responses properly
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error ${response.status}: ${errorText}`);
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }
      
      // Safely parse JSON response
      let responseData = {};
      let responseText = '';
      try {
        responseText = await response.text();
        console.log(`API Response: ${responseText}`);
        responseData = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        console.error(`Error parsing response: ${parseError.message}, raw text: ${responseText}`);
        throw new Error(`Failed to parse API response: ${parseError.message}`);
      }
      
      // Make sure we extract live_url if it's in the browser object
      if (responseData.browser && responseData.browser.live_url) {
        responseData.live_url = responseData.browser.live_url;
        console.log(`Extracted live_url from browser object: ${responseData.live_url}`);
      }
      
      // Update the task in database with browser_task_id if creating a new task
      if (response.ok && requestBody.task_id && responseData.task_id && !requestBody.action) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        console.log(`Updating task ${requestBody.task_id} with browser_task_id: ${responseData.task_id}`);
        await supabase
          .from('browser_automation_tasks')
          .update({ 
            browser_task_id: responseData.task_id,
            status: 'created'
          })
          .eq('id', requestBody.task_id);
      }

      return new Response(JSON.stringify(responseData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (fetchError) {
      console.error(`Fetch error: ${fetchError.message}`);
      throw new Error(`API Communication Error: ${fetchError.message}`);
    }
    
  } catch (error) {
    console.error("Browser Use API Error:", error);
    
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error occurred"
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Helper function to check task status
async function checkTaskStatus(req: Request, taskId?: string): Promise<{ data: any, error: Error | null }> {
  try {
    const API_KEY = Deno.env.get("BROWSER_USE_API_KEY");
    
    if (!API_KEY) {
      throw new Error("Browser Use API key is not configured.");
    }
    
    // Get task_id from request body if not provided as parameter
    if (!taskId) {
      let requestText = '';
      try {
        requestText = await req.text();
        console.log(`Request body for status check: ${requestText}`);
        const requestBody = requestText ? JSON.parse(requestText) : {};
        taskId = requestBody.task_id;
      } catch (parseError) {
        console.error(`Error parsing request body for status: ${parseError.message}, raw text: ${requestText}`);
        throw new Error(`Invalid JSON in request body: ${parseError.message}`);
      }
      
      if (!taskId) {
        throw new Error("Task ID is required for checking status");
      }
    }
    
    console.log(`Checking status for task: ${taskId}`);
    
    // Updated to use the correct task status endpoint as specified in the API docs
    const response = await fetch(`https://api.browser-use.com/api/v1/task/${taskId}/status`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to fetch task status: ${response.status} ${errorText}`);
      
      // Handle 404 error (Agent session not found) more gracefully
      if (response.status === 404) {
        return { 
          data: { 
            status: 'failed',
            error: 'Agent session not found - the task may have been deleted or expired'
          }, 
          error: null 
        };
      }
      
      throw new Error(`Failed to fetch task status: ${errorText}`);
    }
    
    // Safely parse JSON response
    let responseData;
    let responseText = '';
    try {
      responseText = await response.text();
      console.log(`Status response: ${responseText}`);
      responseData = responseText ? JSON.parse(responseText) : {};
    } catch (parseError) {
      console.error(`Error parsing status response: ${parseError.message}, raw text: ${responseText}`);
      throw new Error(`Failed to parse status response: ${parseError.message}`);
    }
    
    // Extract live_url if available in the response or in the browser object
    if (responseData.browser && responseData.browser.live_url) {
      responseData.live_url = responseData.browser.live_url;
      console.log(`Extracted live_url from browser object: ${responseData.live_url}`);
    }
    
    return { data: responseData, error: null };
  } catch (error) {
    console.error(`Error checking task status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { 
      data: null, 
      error: error instanceof Error ? error : new Error("Unknown error checking task status") 
    };
  }
}

// Helper function to fetch task media using task ID directly
async function getTaskMediaByTaskId(taskId: string): Promise<Response> {
  try {
    const API_KEY = Deno.env.get("BROWSER_USE_API_KEY");
    
    if (!API_KEY) {
      throw new Error("Browser Use API key is not configured.");
    }
    
    console.log(`Fetching media for task: ${taskId}`);
    
    // Updated to use the correct API endpoint
    const response = await fetch(`https://api.browser-use.com/api/v1/task/${taskId}/media`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to fetch task media: ${response.status} ${errorText}`);
      
      // Handle 404 error (Agent session not found) more gracefully
      if (response.status === 404) {
        return new Response(JSON.stringify({
          error: 'Agent session not found - the task may have been deleted or expired',
          recordings: null
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      throw new Error(`Failed to fetch task media: ${errorText}`);
    }
    
    // Safely parse JSON response
    let responseData;
    let responseText = '';
    try {
      responseText = await response.text();
      console.log(`Media response: ${responseText}`);
      responseData = responseText ? JSON.parse(responseText) : { recordings: null };
    } catch (parseError) {
      console.error(`Error parsing media response: ${parseError.message}, raw text: ${responseText}`);
      throw new Error(`Failed to parse media response: ${parseError.message}`);
    }
    
    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error(`Error fetching task media: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error fetching task media",
      recordings: null
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Helper function to fetch task media from request
async function getTaskMedia(req: Request): Promise<{ data: TaskMediaResponse | null, error: Error | null }> {
  try {
    const API_KEY = Deno.env.get("BROWSER_USE_API_KEY");
    
    if (!API_KEY) {
      throw new Error("Browser Use API key is not configured.");
    }
    
    // Get task_id from request body
    let taskId;
    let requestText = '';
    try {
      requestText = await req.text();
      console.log(`Request body for media: ${requestText}`);
      const requestBody = requestText ? JSON.parse(requestText) : {};
      taskId = requestBody.task_id;
    } catch (parseError) {
      console.error(`Error parsing request body for media: ${parseError.message}, raw text: ${requestText}`);
      throw new Error(`Invalid JSON in request body: ${parseError.message}`);
    }
    
    if (!taskId) {
      // Try to get task_id from URL path
      const url = new URL(req.url);
      const pathParts = url.pathname.split('/');
      const taskIdIndex = pathParts.indexOf('task') + 1;
      
      if (taskIdIndex >= pathParts.length) {
        throw new Error("Task ID is required for fetching media");
      }
      
      taskId = pathParts[taskIdIndex];
    }
    
    console.log(`Fetching media for task: ${taskId}`);
    
    // Updated to use the new API endpoint
    const response = await fetch(`https://api.browser-use.com/api/v1/task/${taskId}/media`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to fetch task media: ${response.status} ${errorText}`);
      
      // Handle 404 error (Agent session not found) more gracefully
      if (response.status === 404) {
        return { 
          data: { recordings: null }, 
          error: new Error('Agent session not found - the task may have been deleted or expired') 
        };
      }
      
      throw new Error(`Failed to fetch task media: ${errorText}`);
    }
    
    // Safely parse JSON response
    let responseData;
    let responseText = '';
    try {
      responseText = await response.text();
      console.log(`Media response: ${responseText}`);
      responseData = responseText ? JSON.parse(responseText) : { recordings: null };
    } catch (parseError) {
      console.error(`Error parsing media response: ${parseError.message}, raw text: ${responseText}`);
      throw new Error(`Failed to parse media response: ${parseError.message}`);
    }
    
    return { data: responseData, error: null };
  } catch (error) {
    console.error(`Error fetching task media: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { 
      data: null, 
      error: error instanceof Error ? error : new Error("Unknown error fetching task media") 
    };
  }
}
