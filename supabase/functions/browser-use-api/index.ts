
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

    const BASE_URL = "https://browser-use.com/api/v1";
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    
    // Check if this is a status endpoint call
    if (pathParts[pathParts.length - 1] === 'status') {
      const { data, error } = await checkTaskStatus(req);
      
      if (error) {
        throw error;
      }
      
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Check if this is a media endpoint call
    if (pathParts[pathParts.length - 1] === 'media') {
      const { data, error } = await getTaskMedia(req);
      
      if (error) {
        throw error;
      }
      
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // For standard task operations
    const requestBody: BrowserUseApiRequest = await req.json();
    
    // Get task from database if task_id is provided but no task
    if (requestBody.task_id && !requestBody.task && !requestBody.action) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      const { data: taskData, error: taskError } = await supabase
        .from('browser_automation_tasks')
        .select('input, browser_task_id')
        .eq('id', requestBody.task_id)
        .single();
      
      if (taskError) {
        throw new Error(`Error fetching task: ${taskError.message}`);
      }
      
      if (taskData.browser_task_id) {
        // Task already exists in browser-use API, get status
        return await checkTaskStatus(req, taskData.browser_task_id);
      }
      
      requestBody.task = taskData.input;
    }

    // Handle different operations based on action
    let endpoint = `${BASE_URL}/task`;
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
    } else if (requestBody.task) {
      // Creating a new task
      body = {
        task: requestBody.task,
        save_recording: true
      };
      
      // Add browser configuration if provided
      if (requestBody.browser_config) {
        body = { ...body, ...requestBody.browser_config };
      }
    }

    console.log(`Calling Browser Use API: ${endpoint}`, body ? JSON.stringify(body) : "No body");
    
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
    let responseData;
    try {
      const responseText = await response.text();
      responseData = responseText ? JSON.parse(responseText) : {};
    } catch (parseError) {
      console.error("Error parsing response:", parseError);
      throw new Error(`Failed to parse API response: ${parseError.message}`);
    }
    
    // Update the task in database with browser_task_id if creating a new task
    if (response.ok && requestBody.task_id && responseData.task_id && !requestBody.action) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      await supabase
        .from('browser_automation_tasks')
        .update({ 
          browser_task_id: responseData.task_id,
          status: 'running'
        })
        .eq('id', requestBody.task_id);
    }

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
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
      const requestBody = await req.json();
      taskId = requestBody.task_id;
      
      if (!taskId) {
        throw new Error("Task ID is required for checking status");
      }
    }
    
    console.log(`Checking status for task: ${taskId}`);
    
    const response = await fetch(`https://browser-use.com/api/v1/task/${taskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch task status: ${errorText}`);
    }
    
    // Safely parse JSON response
    let responseData;
    try {
      const responseText = await response.text();
      responseData = responseText ? JSON.parse(responseText) : {};
    } catch (parseError) {
      console.error("Error parsing status response:", parseError);
      throw new Error(`Failed to parse status response: ${parseError.message}`);
    }
    
    // Extract live_url if available
    if (responseData.browser && responseData.browser.live_url) {
      responseData.live_url = responseData.browser.live_url;
    }
    
    return { data: responseData, error: null };
  } catch (error) {
    console.error("Error checking task status:", error);
    return { 
      data: null, 
      error: error instanceof Error ? error : new Error("Unknown error checking task status") 
    };
  }
}

// Helper function to fetch task media
async function getTaskMedia(req: Request): Promise<{ data: TaskMediaResponse | null, error: Error | null }> {
  try {
    const API_KEY = Deno.env.get("BROWSER_USE_API_KEY");
    
    if (!API_KEY) {
      throw new Error("Browser Use API key is not configured.");
    }
    
    // Get task_id from request URL
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const taskIdIndex = pathParts.indexOf('task') + 1;
    
    if (taskIdIndex >= pathParts.length) {
      throw new Error("Task ID is required for fetching media");
    }
    
    const taskId = pathParts[taskIdIndex];
    
    console.log(`Fetching media for task: ${taskId}`);
    
    const response = await fetch(`https://browser-use.com/api/v1/task/${taskId}/media`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch task media: ${errorText}`);
    }
    
    // Safely parse JSON response
    let responseData;
    try {
      const responseText = await response.text();
      responseData = responseText ? JSON.parse(responseText) : { recordings: null };
    } catch (parseError) {
      console.error("Error parsing media response:", parseError);
      throw new Error(`Failed to parse media response: ${parseError.message}`);
    }
    
    return { data: responseData, error: null };
  } catch (error) {
    console.error("Error fetching task media:", error);
    return { 
      data: null, 
      error: error instanceof Error ? error : new Error("Unknown error fetching task media") 
    };
  }
}
