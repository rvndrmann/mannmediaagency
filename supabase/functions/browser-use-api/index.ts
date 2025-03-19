
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
      return new Response(
        JSON.stringify({ error: "Browser Use API key is not configured" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Parse request JSON
    const requestBody = await req.json();
    const { task_id, url_check_only } = requestBody;
    
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
    
    console.log(`Using authentication: Bearer ${apiKey.substring(0, 4)}...`);
    
    // Call the Browser Use API
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
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
