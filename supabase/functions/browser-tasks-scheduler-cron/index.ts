
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.1";

// Create a Supabase client with the service role key
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function triggerScheduler() {
  console.log("Triggering browser-tasks-scheduler function");
  
  try {
    // Check for upcoming scheduled tasks first
    const { data: scheduledTasks, error: scheduledTasksError } = await supabase
      .from('scheduled_browser_tasks')
      .select('*')
      .or(`status.eq.pending,status.eq.active`)
      .lte('scheduled_time', new Date().toISOString());
    
    if (scheduledTasksError) {
      console.error("Error checking scheduled tasks:", scheduledTasksError);
    } else {
      console.log(`Found ${scheduledTasks?.length || 0} tasks that should be executed now`);
    }
    
    // Call the scheduler function
    const { data, error } = await supabase.functions.invoke("browser-tasks-scheduler", {
      method: "POST",
      body: { 
        scheduled: true,
        forceRun: true,
        timestamp: new Date().toISOString()
      }
    });

    if (error) {
      console.error("Error triggering scheduler:", error);
      return {
        success: false,
        message: `Failed to trigger browser-tasks-scheduler: ${error.message}`,
        timestamp: new Date().toISOString()
      };
    }

    console.log("Scheduler triggered successfully:", data);
    return {
      success: true,
      message: data.message || "Tasks processed successfully",
      tasksFound: scheduledTasks?.length || 0,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error("Exception while triggering scheduler:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
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
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString()
      }),
      { headers, status: 500 }
    );
  }
});
