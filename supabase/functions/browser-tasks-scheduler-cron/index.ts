
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.1";

// Create a Supabase client with the service role key
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function triggerScheduler() {
  console.log("Triggering browser-tasks-scheduler function");
  
  try {
    const { data, error } = await supabase.functions.invoke("browser-tasks-scheduler", {
      method: "POST",
      body: { scheduled: true }
    });

    if (error) {
      console.error("Error triggering scheduler:", error);
      return {
        success: false,
        message: `Failed to trigger browser-tasks-scheduler: ${error.message}`
      };
    }

    console.log("Scheduler triggered successfully:", data);
    return {
      success: true,
      message: data.message || "Tasks processed successfully"
    };
  } catch (error) {
    console.error("Exception while triggering scheduler:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

serve(async (req) => {
  // CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json"
  };
  
  // Handle OPTIONS request for CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers });
  }
  
  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, message: "Method not allowed" }), 
      { headers, status: 405 }
    );
  }
  
  try {
    const result = await triggerScheduler();
    
    return new Response(
      JSON.stringify(result),
      { headers, status: result.success ? 200 : 500 }
    );
  } catch (error) {
    console.error("Cron error:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error"
      }),
      { headers, status: 500 }
    );
  }
});
