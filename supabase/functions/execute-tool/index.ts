
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const BROWSER_USE_API_KEY = Deno.env.get('BROWSER_USE_API_KEY');

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Function to execute browser-use tool
async function executeBrowserUseTool(parameters: any) {
  if (!BROWSER_USE_API_KEY) {
    throw new Error("BROWSER_USE_API_KEY is not set in environment variables");
  }

  console.log("Executing browser-use tool with parameters:", parameters);
  
  try {
    // Call the browser-use API
    const response = await fetch('https://api.browser-use.com/api/v1/run-task', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BROWSER_USE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        task: parameters.task,
        save_browser_data: parameters.save_browser_data !== false
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Browser Use API Error Response:", errorText);
      throw new Error(`Browser Use API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    return {
      success: true,
      message: "Browser task submitted successfully",
      taskId: data.task_id || data.id
    };
  } catch (error) {
    console.error("Error executing browser-use tool:", error);
    throw error;
  }
}

// Function to execute product-video tool
async function executeProductVideoTool(parameters: any) {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set in environment variables");
  }
  
  console.log("Executing product-video tool with parameters:", parameters);
  
  // This would typically call a video generation API
  // For now, we'll simulate a successful response
  return {
    success: true,
    message: "Product video generation initiated",
    jobId: crypto.randomUUID()
  };
}

// Function to execute custom-video tool
async function executeCustomVideoTool(parameters: any) {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set in environment variables");
  }
  
  console.log("Executing custom-video tool with parameters:", parameters);
  
  // This would typically call a video generation API
  // For now, we'll simulate a successful response
  return {
    success: true,
    message: "Custom video generation initiated",
    jobId: crypto.randomUUID()
  };
}

serve(async (req: Request) => {
  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] New request received`);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { toolName, parameters, userId, traceId } = await req.json();
    
    if (!toolName || !parameters) {
      throw new Error("Invalid request: toolName and parameters are required");
    }

    console.log(`[${requestId}] Executing tool: ${toolName} with parameters:`, parameters);
    
    let result;
    
    // Execute the appropriate tool
    switch (toolName) {
      case 'browser-use':
        result = await executeBrowserUseTool(parameters);
        break;
      case 'product-video':
        result = await executeProductVideoTool(parameters);
        break;
      case 'custom-video':
        result = await executeCustomVideoTool(parameters);
        break;
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
    
    console.log(`[${requestId}] Tool execution result:`, result);
    
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error(`[${requestId}] Error:`, error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        message: "Error executing tool"
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
