
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

// CORS headers for cross-origin requests
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
    const { input, attachments, agentType, userId, usePerformanceModel, enableDirectToolExecution, tracingDisabled, contextData, metadata, runId, groupId } = await req.json();

    console.log("Received request:", { 
      agentType, 
      inputLength: input?.length, 
      attachmentsCount: attachments?.length || 0,
      hasContextData: !!contextData
    });

    // Simple response for testing - in production this would connect to an actual AI service
    // We're mocking the response for now to test the UI flow
    const responseText = `I'm the ${agentType || 'assistant'} agent responding to your message: "${input}".
    
This is a placeholder response to verify that the communication between the frontend and backend is working correctly. In a production environment, this would be an actual AI-generated response.

Based on your settings:
- Performance model: ${usePerformanceModel ? 'Enabled' : 'Disabled'}
- Direct tool execution: ${enableDirectToolExecution ? 'Enabled' : 'Disabled'}
- Tracing: ${tracingDisabled ? 'Disabled' : 'Enabled'}

If you're seeing this message, it means your frontend is successfully connecting to the Supabase function!`;

    // Simulate a delay to mimic AI processing time
    await new Promise(resolve => setTimeout(resolve, 1000));

    return new Response(
      JSON.stringify({
        completion: responseText,
        handoffRequest: null // No handoff for now
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  } catch (error) {
    console.error("Error processing request:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || "An unknown error occurred" 
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
        status: 400
      }
    );
  }
});
