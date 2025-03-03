
import { serve } from "std/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Note: detect-command is now a passthrough function. Command detection has been moved to Langflow.");
    console.log("This function remains for backward compatibility and will simply return a null command.");
    
    // Return a null command to indicate no separate detection
    return new Response(
      JSON.stringify({ command: null }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in detect-command function:', error);
    
    return new Response(
      JSON.stringify({ 
        command: null,
        error: error.message
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 // Send 200 to client even on internal errors for graceful degradation
      }
    );
  }
});
