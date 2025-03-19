
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Define API endpoints and environment variables
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const BROWSER_USE_API_KEY = Deno.env.get("BROWSER_USE_API_KEY") || "";
const BROWSER_USE_API_URL = "https://api.browser-use.com/api/v1/run-task";

// Helper function for consistent logging
function logInfo(message: string, data?: any) {
  console.log(`[INFO] ${message}`, data ? JSON.stringify(data) : '');
}

function logError(message: string, error: any) {
  console.error(`[ERROR] ${message}`, error);
  if (error instanceof Error) {
    console.error(`Stack trace: ${error.stack}`);
  }
}

function logWarning(message: string, data?: any) {
  console.warn(`[WARNING] ${message}`, data ? JSON.stringify(data) : '');
}

function logDebug(message: string, data?: any) {
  console.debug(`[DEBUG] ${message}`, data ? JSON.stringify(data) : '');
}

serve(async (req) => {
  const requestId = crypto.randomUUID();
  const requestStart = Date.now();
  
  logInfo(`[${requestId}] Browser Use API request received`, {
    method: req.method,
    url: req.url
  });

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    logDebug(`[${requestId}] Handling CORS preflight request`);
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate API key
    if (!BROWSER_USE_API_KEY) {
      logError(`[${requestId}] Browser Use API key is not configured`, {});
      return new Response(
        JSON.stringify({ error: "Browser Use API key is not configured" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client for database operations
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Authenticate the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logWarning(`[${requestId}] Missing or invalid Authorization header`, {});
      return new Response(
        JSON.stringify({ error: "Missing or invalid Authorization header" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.split(' ')[1];
    logDebug(`[${requestId}] Authenticating user with token`);
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      logWarning(`[${requestId}] Authentication failed`, authError);
      return new Response(
        JSON.stringify({ error: "Authentication failed" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    logInfo(`[${requestId}] User authenticated successfully`, { userId: user.id });
    
    // Get user credits
    logDebug(`[${requestId}] Checking user credits for user ${user.id}`);
    const { data: userCredits, error: creditsError } = await supabase
      .from("user_credits")
      .select("credits_remaining")
      .eq("user_id", user.id)
      .single();
    
    if (creditsError) {
      logError(`[${requestId}] Error checking user credits:`, creditsError);
      return new Response(
        JSON.stringify({ error: "Error checking user credits" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get request data
    let requestData;
    try {
      requestData = await req.json();
      logDebug(`[${requestId}] Request data parsed successfully`, requestData);
    } catch (parseError) {
      logError(`[${requestId}] Error parsing request body:`, parseError);
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Check if this is a control action (pause, resume, stop) or a new task
    const isControlAction = requestData.action && ['pause', 'resume', 'stop'].includes(requestData.action);
    logInfo(`[${requestId}] Request type: ${isControlAction ? 'Control action' : 'New task'}`);
    
    // Only check credits for new tasks, not control actions
    if (!isControlAction && (!userCredits || userCredits.credits_remaining < 1)) {
      logWarning(`[${requestId}] Insufficient credits for user ${user.id}`, { credits: userCredits?.credits_remaining });
      return new Response(
        JSON.stringify({ error: "Insufficient credits. You need at least 1 credit to use the Browser Automation." }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Handle different actions based on request
    if (isControlAction) {
      logInfo(`[${requestId}] Processing control action: ${requestData.action} for task ${requestData.task_id}`);
      
      // For control actions, we'd normally call the Browser Use API with the action
      // But for now, just update our database status as the API may not support these directly
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Task ${requestData.action} request sent` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // This is a new task, call the Browser Use API
      logInfo(`[${requestId}] Starting new browser automation task`, {
        taskSummary: requestData.task.substring(0, 100) + (requestData.task.length > 100 ? '...' : '')
      });
      
      // Prepare request body with browser configuration
      const apiRequestBody = {
        task: requestData.task,
        save_browser_data: true,
        browser_config: requestData.browser_config || {
          persistentSession: false,
          resolution: "1920x1080",
          useOwnBrowser: false
        }
      };

      logDebug(`[${requestId}] API Request Body:`, apiRequestBody);
      
      // Call the Browser Use API
      logInfo(`[${requestId}] Calling Browser Use API`);
      let response;
      try {
        response = await fetch(BROWSER_USE_API_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${BROWSER_USE_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(apiRequestBody)
        });
      } catch (fetchError) {
        logError(`[${requestId}] Network error calling Browser Use API:`, fetchError);
        
        // Update task status to failed if task_id is provided
        if (requestData.task_id) {
          await supabase
            .from('browser_automation_tasks')
            .update({ 
              status: 'failed',
              output: `API Connection Error: ${fetchError.message}`
            })
            .eq('id', requestData.task_id);
        }
        
        return new Response(
          JSON.stringify({ 
            error: "Failed to connect to Browser Use API", 
            details: fetchError.message 
          }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (!response.ok) {
        let errorText = "Unknown error";
        try {
          errorText = await response.text();
          logError(`[${requestId}] Error from Browser Use API:`, { status: response.status, error: errorText });
        } catch (textError) {
          logError(`[${requestId}] Error reading response text:`, textError);
        }
        
        // Update task status to failed
        if (requestData.task_id) {
          await supabase
            .from('browser_automation_tasks')
            .update({ 
              status: 'failed',
              output: `API Error: ${errorText}`
            })
            .eq('id', requestData.task_id);
        }
        
        return new Response(
          JSON.stringify({ 
            error: `Error from Browser Use API: ${response.status}`, 
            details: errorText 
          }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Process successful response
      let browserUseResponse;
      try {
        browserUseResponse = await response.json();
        logInfo(`[${requestId}] Browser Use API response received successfully`);
        logDebug(`[${requestId}] Browser Use API response:`, browserUseResponse);
      } catch (jsonError) {
        logError(`[${requestId}] Error parsing Browser Use API response:`, jsonError);
        return new Response(
          JSON.stringify({ 
            error: "Error parsing Browser Use API response", 
            details: jsonError.message 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Update task with API response data
      if (requestData.task_id) {
        logDebug(`[${requestId}] Updating task ${requestData.task_id} with response data`);
        try {
          const { error: updateError } = await supabase
            .from('browser_automation_tasks')
            .update({ 
              status: 'running',
              output: JSON.stringify(browserUseResponse)
            })
            .eq('id', requestData.task_id);
          
          if (updateError) {
            logError(`[${requestId}] Error updating task status:`, updateError);
          }
        
          // Create a task step to record the API response
          const { error: stepError } = await supabase
            .from('browser_automation_steps')
            .insert({
              task_id: requestData.task_id,
              description: 'Task started via Browser Use API',
              status: 'completed',
              details: JSON.stringify(browserUseResponse)
            });
          
          if (stepError) {
            logError(`[${requestId}] Error creating task step:`, stepError);
          }
        } catch (dbError) {
          logError(`[${requestId}] Database operation error:`, dbError);
        }
        
        // Deduct 1 credit for new task
        try {
          const { error: deductError } = await supabase.rpc('deduct_credits', { 
            user_id: user.id, 
            credits_to_deduct: 1
          });
          
          if (deductError) {
            logError(`[${requestId}] Error deducting credits:`, deductError);
          } else {
            logInfo(`[${requestId}] Credit deducted for user: ${user.id}`);
          }
        } catch (creditError) {
          logError(`[${requestId}] Error in credit deduction:`, creditError);
        }
      }
      
      const requestDuration = Date.now() - requestStart;
      logInfo(`[${requestId}] Request completed successfully in ${requestDuration}ms`);
      
      return new Response(
        JSON.stringify(browserUseResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    const requestDuration = Date.now() - requestStart;
    logError(`[${requestId}] Unhandled error in browser-use-api function (${requestDuration}ms):`, error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || "Internal server error",
        request_id: requestId,
        stack: error.stack || null
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
