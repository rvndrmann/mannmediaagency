
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.1";

const BROWSER_USE_API_KEY = Deno.env.get('BROWSER_USE_API_KEY');
const BROWSER_USE_API_URL = "https://api.browser-use.com/api/v1";

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
    // Verify user authentication
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get request body
    const requestData = await req.json();
    
    // Handle different action types
    const action = requestData.action;
    
    // For GET, LIST, PAUSE, RESUME, STOP operations
    if (action) {
      console.log(`Handling action: ${action}`);
      
      // Task management operations
      if (action === 'get' && requestData.taskId) {
        // Get task details
        const options = {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${BROWSER_USE_API_KEY}` }
        };
        
        const response = await fetch(`${BROWSER_USE_API_URL}/task/${requestData.taskId}`, options);
        const data = await response.json();
        
        return new Response(
          JSON.stringify(data),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else if (action === 'list') {
        // List tasks
        const options = {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${BROWSER_USE_API_KEY}` }
        };
        
        const response = await fetch(`${BROWSER_USE_API_URL}/tasks`, options);
        const data = await response.json();
        
        return new Response(
          JSON.stringify(data),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else if (action === 'stop' && requestData.taskId) {
        // Stop task
        const options = {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${BROWSER_USE_API_KEY}` }
        };
        
        const response = await fetch(`${BROWSER_USE_API_URL}/stop-task?task_id=${requestData.taskId}`, options);
        const data = await response.json();
        
        return new Response(
          JSON.stringify(data),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else if (action === 'pause' && requestData.taskId) {
        // Pause task
        const options = {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${BROWSER_USE_API_KEY}` }
        };
        
        const response = await fetch(`${BROWSER_USE_API_URL}/pause-task?task_id=${requestData.taskId}`, options);
        const data = await response.json();
        
        return new Response(
          JSON.stringify(data),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else if (action === 'resume' && requestData.taskId) {
        // Resume task
        const options = {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${BROWSER_USE_API_KEY}` }
        };
        
        const response = await fetch(`${BROWSER_USE_API_URL}/resume-task?task_id=${requestData.taskId}`, options);
        const data = await response.json();
        
        return new Response(
          JSON.stringify(data),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Invalid action or missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Below is for starting a new task
    const { task, environment = "browser", browser_config } = requestData;
    
    if (!task) {
      return new Response(
        JSON.stringify({ error: 'Task description is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!BROWSER_USE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Browser Use API key is not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Check user credits before proceeding
    const { data: userCredits, error: creditsError } = await supabase
      .from('user_credits')
      .select('credits_remaining')
      .eq('user_id', user.id)
      .single();
    
    if (creditsError) {
      return new Response(
        JSON.stringify({ error: 'Failed to retrieve user credits' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (userCredits.credits_remaining < 1) {
      return new Response(
        JSON.stringify({ error: 'Insufficient credits. You need at least 1 credit.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate desktop requirements
    if (environment === "desktop") {
      if (!browser_config || !browser_config.useOwnBrowser) {
        return new Response(
          JSON.stringify({ error: 'Desktop mode requires using your own browser' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (!browser_config.chromePath) {
        return new Response(
          JSON.stringify({ error: 'Chrome executable path is required for desktop automation' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Log desktop apps for debugging
      if (browser_config.desktopApps && browser_config.desktopApps.length > 0) {
        console.log("Desktop applications configured:", JSON.stringify(browser_config.desktopApps));
      }
    }
    
    // Prepare request body for Browser Use API
    const requestBody: any = {
      task: task,
      save_browser_data: true
    };
    
    // Include environment type for the API
    requestBody.environment = environment;
    
    // Include browser configuration if provided
    if (browser_config) {
      console.log(`Using custom ${environment} configuration:`, JSON.stringify(browser_config));
      requestBody.browser_config = browser_config;
    }
    
    // Start a task using the Browser Use API
    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BROWSER_USE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    };
    
    console.log(`Starting ${environment} automation task: ${task}`);
    const response = await fetch(`${BROWSER_USE_API_URL}/run-task`, options);
    const data = await response.json();
    
    if (!response.ok) {
      console.error(`Error from Browser Use API (${environment} mode):`, data);
      
      return new Response(
        JSON.stringify({ error: data.error || `Failed to start ${environment} automation task` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Log the task in the database
    const { data: taskRecord, error: taskError } = await supabase
      .from('browser_automation_tasks')
      .insert({
        user_id: user.id,
        task_id: data.id,
        task_description: task,
        environment: environment,
        status: 'running',
        browser_config: browser_config || null
      })
      .select()
      .single();
    
    if (taskError) {
      console.error('Error logging task in database:', taskError);
    }
    
    // Deduct a credit for the task
    const { error: creditUpdateError } = await supabase
      .from('user_credits')
      .update({ 
        credits_remaining: userCredits.credits_remaining - 1,
        last_used_at: new Date().toISOString()
      })
      .eq('user_id', user.id);
      
    if (creditUpdateError) {
      console.error('Error updating user credits:', creditUpdateError);
    }
    
    // Return task information
    return new Response(
      JSON.stringify({
        taskId: data.id,
        status: 'running',
        message: `${environment.charAt(0).toUpperCase() + environment.slice(1)} automation task started successfully`,
        liveUrl: data.live_url || null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in browser-use-api:', error);
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
