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
    
    // Prepare browser configuration
    const browserConfig = browser_config || {};
    
    // Process desktop-specific connection methods
    if (environment === "desktop") {
      // Validate desktop requirements based on connection method
      const hasConnectionConfig = browserConfig.wssUrl || browserConfig.cdpUrl || browserConfig.browserInstancePath || browserConfig.chromePath;
      
      if (!hasConnectionConfig) {
        return new Response(
          JSON.stringify({ error: 'Desktop mode requires a connection method (chromePath, wssUrl, cdpUrl, or browserInstancePath)' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // If using browser instance path or local Chrome, ensure useOwnBrowser is enabled
      if ((browserConfig.browserInstancePath || browserConfig.chromePath) && !browserConfig.useOwnBrowser) {
        return new Response(
          JSON.stringify({ error: 'When using local Chrome or browser instance path, "useOwnBrowser" must be enabled' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Log desktop apps for debugging
      if (browserConfig.desktopApps && browserConfig.desktopApps.length > 0) {
        console.log("Desktop applications configured:", JSON.stringify(browserConfig.desktopApps));
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
    if (Object.keys(browserConfig).length > 0) {
      console.log(`Using custom ${environment} configuration:`, JSON.stringify(browserConfig));
      
      // Transform the configuration to match the API's expected format
      const apiConfig: any = { ...browserConfig };
      
      // Handle sensitive data if present
      if (browserConfig.sensitiveData && browserConfig.sensitiveData.length > 0) {
        const sensitiveDataMap: Record<string, string> = {};
        
        // Convert to the format expected by the API
        browserConfig.sensitiveData.forEach(item => {
          sensitiveDataMap[item.key] = item.value;
        });
        
        apiConfig.sensitive_data = sensitiveDataMap;
        delete apiConfig.sensitiveData;
      }
      
      // Handle connection methods specifically
      if (browserConfig.wssUrl) {
        apiConfig.wss_url = browserConfig.wssUrl;
        delete apiConfig.wssUrl;
      }
      
      if (browserConfig.cdpUrl) {
        apiConfig.cdp_url = browserConfig.cdpUrl;
        delete apiConfig.cdpUrl;
      }
      
      if (browserConfig.browserInstancePath) {
        apiConfig.browser_instance_path = browserConfig.browserInstancePath;
        delete apiConfig.browserInstancePath;
      }
      
      if (browserConfig.chromePath) {
        apiConfig.chrome_path = browserConfig.chromePath;
        delete apiConfig.chromePath;
      }
      
      // Transform context config if present
      if (browserConfig.contextConfig) {
        apiConfig.context_config = {
          ...browserConfig.contextConfig,
          
          // Transform camelCase to snake_case for API compatibility
          min_wait_page_load_time: browserConfig.contextConfig.minWaitPageLoadTime,
          wait_for_network_idle_page_load_time: browserConfig.contextConfig.waitForNetworkIdlePageLoadTime,
          max_wait_page_load_time: browserConfig.contextConfig.maxWaitPageLoadTime,
          browser_window_size: browserConfig.contextConfig.browserWindowSize,
          highlight_elements: browserConfig.contextConfig.highlightElements,
          viewport_expansion: browserConfig.contextConfig.viewportExpansion,
          user_agent: browserConfig.contextConfig.userAgent,
          allowed_domains: browserConfig.contextConfig.allowedDomains,
          save_recording_path: browserConfig.contextConfig.saveRecordingPath,
          trace_path: browserConfig.contextConfig.tracePath,
          cookies_file: browserConfig.contextConfig.cookiesFile
        };
        
        // Remove camelCase properties
        delete apiConfig.context_config.minWaitPageLoadTime;
        delete apiConfig.context_config.waitForNetworkIdlePageLoadTime;
        delete apiConfig.context_config.maxWaitPageLoadTime;
        delete apiConfig.context_config.browserWindowSize;
        delete apiConfig.context_config.highlightElements;
        delete apiConfig.context_config.viewportExpansion;
        delete apiConfig.context_config.userAgent;
        delete apiConfig.context_config.allowedDomains;
        delete apiConfig.context_config.saveRecordingPath;
        delete apiConfig.context_config.tracePath;
        delete apiConfig.context_config.cookiesFile;
        
        delete apiConfig.contextConfig;
      }
      
      requestBody.browser_config = apiConfig;
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
        browser_config: browserConfig || null
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
