
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

    // Get parameters from the request body
    const { conversation_id, user_id_param } = await req.json();

    if (!conversation_id || !user_id_param) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Get the conversation trace
    // In a real implementation, you would have a proper conversation_id field
    // For now, we'll just get the specific interaction and perhaps related ones
    const { data, error } = await supabaseClient
      .from("agent_interactions")
      .select("*")
      .eq("id", conversation_id)
      .eq("user_id", user_id_param);

    if (error) {
      console.error("Error fetching data:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // If no data found, check for related interactions using timestamp
    if (data.length === 0) {
      return new Response(JSON.stringify({ error: "Conversation not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    // Get related interactions based on timestamp
    const targetTime = new Date(data[0].timestamp).getTime();
    const timeWindow = 1800000; // 30 minutes in milliseconds

    const { data: relatedData, error: relatedError } = await supabaseClient
      .from("agent_interactions")
      .select("*")
      .eq("user_id", user_id_param)
      .gte("timestamp", new Date(targetTime - timeWindow).toISOString())
      .lte("timestamp", new Date(targetTime + timeWindow).toISOString())
      .order("timestamp", { ascending: true });

    if (relatedError) {
      console.error("Error fetching related data:", relatedError);
      return new Response(JSON.stringify({ error: relatedError.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Process and structure the conversation
    const conversation = {
      id: conversation_id,
      messages: relatedData.map((item) => ({
        id: item.id,
        role: item.user_message ? "user" : "assistant",
        content: item.user_message || item.assistant_response,
        agent_type: item.agent_type,
        timestamp: item.timestamp,
        has_attachments: item.has_attachments,
        metadata: item.metadata,
      })),
      start_time: relatedData.length > 0 ? relatedData[0].timestamp : data[0].timestamp,
      end_time: relatedData.length > 0 
        ? relatedData[relatedData.length - 1].timestamp 
        : data[0].timestamp,
    };

    // Return the conversation trace
    return new Response(JSON.stringify(conversation), {
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
