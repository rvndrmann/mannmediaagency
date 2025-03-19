
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
const BROWSER_USE_API_URL = "https://api.browser-use.com/api/v1/capture-website";

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
  
  logInfo(`[${requestId}] Capture Website request received`, {
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
    
    const url = requestData.url;
    
    if (!url) {
      logWarning(`[${requestId}] URL is required but not provided`, {});
      return new Response(
        JSON.stringify({ error: "URL is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    logInfo(`[${requestId}] Capturing screenshot for URL: ${url}`);
    
    // Call the Browser Use API to capture a screenshot
    let response;
    try {
      response = await fetch(BROWSER_USE_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${BROWSER_USE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: url,
          save_browser_data: true
        })
      });
    } catch (fetchError) {
      logError(`[${requestId}] Network error calling Browser Use API:`, fetchError);
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
      
      return new Response(
        JSON.stringify({ 
          error: `Error from Browser Use API: ${response.status}`, 
          details: errorText 
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Process successful response
    let screenshotResponse;
    try {
      screenshotResponse = await response.json();
      logInfo(`[${requestId}] Screenshot captured successfully`);
      logDebug(`[${requestId}] Screenshot response:`, screenshotResponse);
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
    
    const requestDuration = Date.now() - requestStart;
    logInfo(`[${requestId}] Request completed successfully in ${requestDuration}ms`);
    
    return new Response(
      JSON.stringify({
        success: true,
        image_url: screenshotResponse.image_url || screenshotResponse.screenshot,
        url: url
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const requestDuration = Date.now() - requestStart;
    logError(`[${requestId}] Unhandled error in capture-website function (${requestDuration}ms):`, error);
    
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
