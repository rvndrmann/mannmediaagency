
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Define API endpoints
const MANUS_API_ENDPOINT = "https://api.openmanus.app/v1/agent";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

interface ManusRequest {
  task: string;
  environment: string;
  screenshot?: string;
  current_url?: string;
  previous_actions?: any[];
  api_key?: string;
}

interface ManusResponse {
  actions: any[];
  reasoning: string;
  state?: {
    current_url?: string;
    screenshot?: string;
    dom_state?: any;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
    
    // Check if user has sufficient credits
    if (!userCredits || userCredits.credits_remaining < 1) {
      return new Response(
        JSON.stringify({ error: "Insufficient credits. You need at least 1 credit to use the Computer Agent." }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Parse request body
    const requestData: ManusRequest = await req.json();
    
    // Get API key from request or from Supabase secrets
    const apiKey = requestData.api_key || Deno.env.get("MANUS_API_KEY");
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "No API key provided for OpenManus" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Prepare the request for the Manus API
    const manusPayload = {
      ...requestData,
    };
    
    // If api_key is in the request, delete it from payload
    delete manusPayload.api_key;
    
    // Make request to Manus API
    console.log("Sending request to Manus API");
    const response = await fetch(MANUS_API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify(manusPayload),
    });
    
    // Handle response from Manus API
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error from Manus API:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: `Error from Manus API: ${response.status}`, details: errorText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Parse response from Manus API
    const manusResponse = await response.json() as ManusResponse;
    
    // If this is a new session (no previous actions), deduct 1 credit
    if (!requestData.previous_actions || requestData.previous_actions.length === 0) {
      await supabase
        .from("user_credits")
        .update({ credits_remaining: userCredits.credits_remaining - 1 })
        .eq("user_id", user.id);
        
      // Log the credit update
      await supabase
        .from("credit_update_logs")
        .insert({
          user_id: user.id,
          credits_before: userCredits.credits_remaining,
          credits_after: userCredits.credits_remaining - 1,
          status: "success",
          trigger_source: "manus_computer_agent"
        });
    }
    
    return new Response(
      JSON.stringify(manusResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error in manus-computer-agent function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
