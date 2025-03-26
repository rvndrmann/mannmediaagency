
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
    const { task, environment = "browser" } = await req.json();
    
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
    
    // Start a task using the Browser Use API
    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BROWSER_USE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        task: task,
        save_browser_data: true
      })
    };
    
    console.log(`Starting browser task: ${task}`);
    const response = await fetch(`${BROWSER_USE_API_URL}/run-task`, options);
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Error from Browser Use API:', data);
      
      return new Response(
        JSON.stringify({ error: data.error || 'Failed to start browser task' }),
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
        status: 'running'
      })
      .select()
      .single();
    
    if (taskError) {
      console.error('Error logging task in database:', taskError);
    }
    
    // Return task information
    return new Response(
      JSON.stringify({
        taskId: data.id,
        status: 'running',
        message: 'Browser automation task started successfully'
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
