
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.36.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create a Supabase client with the Auth context of the logged in user
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Get the user ID from the request body
    const { user_id_param } = await req.json();

    if (!user_id_param) {
      return new Response(
        JSON.stringify({ error: "Missing user_id_param parameter" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Query for analytics data
    const { data, error } = await supabaseClient
      .from("agent_interactions")
      .select("agent_type, user_message, assistant_response, metadata, has_attachments")
      .eq("user_id", user_id_param);

    if (error) {
      console.error("Error fetching data:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Process the data to create analytics
    const analyticsData = processAnalyticsData(data);

    // Return the analytics data
    return new Response(JSON.stringify(analyticsData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

// Process the agent interactions to create analytics
function processAnalyticsData(data: any[]) {
  // Initialize analytics structure
  const analytics = {
    agent_usage: {},
    total_interactions: data.length,
    total_conversations: 0, // Will need to be calculated
    avg_duration_ms: 0,     // Placeholder
    success_rate: 0,        // Placeholder
    total_handoffs: 0,      // Placeholder
    total_tool_calls: 0,    // Placeholder
    total_messages: data.length,
    model_usage: {},
  };

  // Calculate agent usage
  data.forEach((interaction) => {
    // Count agent types
    const agentType = interaction.agent_type || "unknown";
    analytics.agent_usage[agentType] = (analytics.agent_usage[agentType] || 0) + 1;

    // If we had metadata for handoffs and tool calls, we would count them here
    if (interaction.metadata) {
      if (interaction.metadata.is_handoff) {
        analytics.total_handoffs++;
      }
      if (interaction.metadata.tool_calls) {
        analytics.total_tool_calls += interaction.metadata.tool_calls.length || 0;
      }
      // Track model usage if available
      if (interaction.metadata.model) {
        const model = interaction.metadata.model;
        analytics.model_usage[model] = (analytics.model_usage[model] || 0) + 1;
      }
    }
  });

  // Estimate number of conversations (this would need to be refined based on actual data structure)
  // For now, let's just make a rough estimate based on total messages
  analytics.total_conversations = Math.max(1, Math.floor(data.length / 3));

  return analytics;
}
