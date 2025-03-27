
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.1";

const BROWSER_USE_API_KEY = Deno.env.get('BROWSER_USE_API_KEY');
const BROWSER_USE_API_URL = "https://api.browser-use.com/api/v1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
    
    const requestData = await req.json();
    
    const action = requestData.action;
    
    if (action) {
      console.log(`Handling action: ${action}`);
      
      if (action === 'get' && requestData.taskId) {
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
      } else if (action === 'getTemplates') {
        const { data, error } = await supabase
          .from('browser_task_templates')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        if (error) {
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        return new Response(
          JSON.stringify({ templates: data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Invalid action or missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
    
    const browserConfig = browser_config || {};
    
    // Process sensitive data replacements in the task text
    let processedTask = task;
    if (browserConfig.sensitiveData && browserConfig.sensitiveData.length > 0) {
      browserConfig.sensitiveData.forEach(item => {
        if (item.key && item.value) {
          const placeholder = `{${item.key}}`;
          const regex = new RegExp(placeholder, 'g');
          processedTask = processedTask.replace(regex, item.value);
        }
      });
      
      console.log(`Task processed with sensitive data replacements`);
    }
    
    if (environment === "desktop") {
      const hasConnectionConfig = browserConfig.wssUrl || browserConfig.cdpUrl || browserConfig.browserInstancePath || browserConfig.chromePath;
      
      if (!hasConnectionConfig) {
        return new Response(
          JSON.stringify({ error: 'Desktop mode requires a connection method (chromePath, wssUrl, cdpUrl, or browserInstancePath)' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if ((browserConfig.browserInstancePath || browserConfig.chromePath) && !browserConfig.useOwnBrowser) {
        return new Response(
          JSON.stringify({ error: 'When using local Chrome or browser instance path, "useOwnBrowser" must be enabled' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (browserConfig.desktopApps && browserConfig.desktopApps.length > 0) {
        console.log("Desktop applications configured:", JSON.stringify(browserConfig.desktopApps));
      }
    }
    
    const requestBody: any = {
      task: processedTask,
      save_browser_data: true
    };
    
    requestBody.environment = environment;
    
    if (Object.keys(browserConfig).length > 0) {
      console.log(`Using custom ${environment} configuration:`, JSON.stringify(browserConfig));
      
      const apiConfig: any = { ...browserConfig };
      
      if (browserConfig.sensitiveData && browserConfig.sensitiveData.length > 0) {
        const sensitiveDataMap: Record<string, string> = {};
        
        browserConfig.sensitiveData.forEach(item => {
          sensitiveDataMap[item.key] = item.value;
        });
        
        apiConfig.sensitive_data = sensitiveDataMap;
        delete apiConfig.sensitiveData;
      }
      
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
      
      if (browserConfig.contextConfig) {
        apiConfig.context_config = {
          ...browserConfig.contextConfig,
          
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
    
    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BROWSER_USE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    };
    
    console.log(`Starting ${environment} automation task: ${processedTask.substring(0, 100)}${processedTask.length > 100 ? '...' : ''}`);
    const response = await fetch(`${BROWSER_USE_API_URL}/run-task`, options);
    const data = await response.json();
    
    if (!response.ok) {
      console.error(`Error from Browser Use API (${environment} mode):`, data);
      
      return new Response(
        JSON.stringify({ error: data.error || `Failed to start ${environment} automation task` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Task created successfully with ID: ${data.id}`);
    
    const { data: taskRecord, error: taskError } = await supabase
      .from('browser_automation_tasks')
      .insert({
        user_id: user.id,
        task_description: task,
        browser_task_id: data.id,
        environment: environment,
        status: 'running',
        browser_config: browserConfig || null
      })
      .select()
      .single();
    
    if (taskError) {
      console.error('Error logging task in database:', taskError);
    }
    
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
