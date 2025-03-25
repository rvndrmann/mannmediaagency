
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const BROWSER_USE_API_KEY = Deno.env.get('BROWSER_USE_API_KEY');

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] New tool execution request received`);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { toolName, parameters, userId, traceId } = await req.json();
    
    if (!toolName) {
      throw new Error("Tool name is required");
    }
    
    if (!parameters) {
      throw new Error("Parameters are required");
    }
    
    console.log(`[${requestId}] Executing tool: ${toolName} with parameters:`, JSON.stringify(parameters));
    
    // Execute the appropriate tool based on the name
    let result;
    
    switch (toolName) {
      case "browser":
      case "browser-use":
        result = await executeBrowserUse(parameters, userId, traceId, requestId);
        break;
      case "product-video":
        result = await executeProductVideo(parameters, userId, requestId);
        break;
      case "custom-video":
        result = await executeCustomVideo(parameters, userId, requestId);
        break;
      default:
        throw new Error(`Unsupported tool: ${toolName}`);
    }
    
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error(`[${requestId}] Error:`, error);
    return new Response(
      JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred"
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});

async function executeBrowserUse(parameters: any, userId: string, traceId: string, requestId: string) {
  if (!BROWSER_USE_API_KEY) {
    throw new Error("BROWSER_USE_API_KEY is not set in environment variables");
  }
  
  console.log(`[${requestId}] Executing browser-use with task: ${parameters.task}`);
  
  try {
    // Call the Browser Use API
    const response = await fetch("https://api.browser-use.com/api/v1/run-task", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${BROWSER_USE_API_KEY}`
      },
      body: JSON.stringify({
        task: parameters.task,
        save_browser_data: parameters.save_browser_data !== false
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[${requestId}] Browser Use API error (${response.status}): ${errorText}`);
      throw new Error(`Browser Use API error: ${response.status}`);
    }
    
    const browserUseResponse = await response.json();
    console.log(`[${requestId}] Browser Use API response:`, JSON.stringify(browserUseResponse));
    
    return {
      success: true,
      message: `Browser task started successfully. Task ID: ${browserUseResponse.task_id}`,
      taskId: browserUseResponse.task_id
    };
  } catch (error) {
    console.error(`[${requestId}] Error executing browser-use:`, error);
    throw error;
  }
}

async function executeProductVideo(parameters: any, userId: string, requestId: string) {
  console.log(`[${requestId}] Executing product-video with product: ${parameters.product_name}`);
  
  // Mock implementation for now
  return {
    success: true,
    message: `Product video generation started for ${parameters.product_name}`,
    jobId: crypto.randomUUID()
  };
}

async function executeCustomVideo(parameters: any, userId: string, requestId: string) {
  console.log(`[${requestId}] Executing custom-video with title: ${parameters.title}`);
  
  // Mock implementation for now
  return {
    success: true,
    message: `Custom video generation started for: ${parameters.title}`,
    jobId: crypto.randomUUID()
  };
}
