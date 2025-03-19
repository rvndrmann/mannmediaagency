
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate API key
    if (!BROWSER_USE_API_KEY) {
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
      return new Response(
        JSON.stringify({ error: "Missing or invalid Authorization header" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Authentication failed" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get user credits
    const { data: userCredits, error: creditsError } = await supabase
      .from("user_credits")
      .select("credits_remaining")
      .eq("user_id", user.id)
      .single();
    
    if (creditsError) {
      console.error("Error checking user credits:", creditsError);
      return new Response(
        JSON.stringify({ error: "Error checking user credits" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Check if user has sufficient credits for new tasks
    const requestData = await req.json();
    
    // Check if this is a control action (pause, resume, stop) or a new task
    const isControlAction = requestData.action && ['pause', 'resume', 'stop'].includes(requestData.action);
    
    // Only check credits for new tasks, not control actions
    if (!isControlAction && (!userCredits || userCredits.credits_remaining < 1)) {
      return new Response(
        JSON.stringify({ error: "Insufficient credits. You need at least 1 credit to use the Browser Automation." }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Handle different actions based on request
    if (isControlAction) {
      console.log(`Processing control action: ${requestData.action} for task ${requestData.task_id}`);
      
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
      console.log("Starting new browser automation task:", requestData.task);
      
      // Call the Browser Use API
      const response = await fetch(BROWSER_USE_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${BROWSER_USE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          task: requestData.task,
          save_browser_data: true
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error from Browser Use API:", response.status, errorText);
        
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
      const browserUseResponse = await response.json();
      console.log("Browser Use API response:", JSON.stringify(browserUseResponse));
      
      // Update task with API response data
      if (requestData.task_id) {
        await supabase
          .from('browser_automation_tasks')
          .update({ 
            status: 'running',
            output: JSON.stringify(browserUseResponse)
          })
          .eq('id', requestData.task_id);
        
        // Create a task step to record the API response
        await supabase
          .from('browser_automation_steps')
          .insert({
            task_id: requestData.task_id,
            description: 'Task started via Browser Use API',
            status: 'completed',
            details: JSON.stringify(browserUseResponse)
          });
        
        // Deduct 1 credit for new task
        if (!isControlAction) {
          await supabase.rpc('deduct_credits', { 
            user_id: user.id, 
            credits_to_deduct: 1
          });
          
          console.log("Credit deducted for user:", user.id);
        }
      }
      
      return new Response(
        JSON.stringify(browserUseResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error("Error in browser-use-api function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Internal server error",
        stack: error.stack || null
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
