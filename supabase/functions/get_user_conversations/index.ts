
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

    // Query for agent interactions
    const { data, error } = await supabaseClient
      .from("agent_interactions")
      .select("*")
      .eq("user_id", user_id_param)
      .order("timestamp", { ascending: false });

    if (error) {
      console.error("Error fetching data:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Group interactions into conversations
    const conversations = processConversations(data);

    // Return the conversations data
    return new Response(JSON.stringify(conversations), {
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

// Process agent interactions into conversations
function processConversations(data: any[]) {
  // For now, let's simplify by grouping interactions by time
  // In a real implementation, you would have a proper conversation_id field
  const conversations = [];
  const timeThreshold = 1800000; // 30 minutes in milliseconds - conversations break if gap is larger

  // Sort by timestamp (oldest first)
  const sortedData = [...data].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  let currentConversation = null;
  let agentTypes = new Set();
  let lastTimestamp = 0;

  for (const interaction of sortedData) {
    const currentTime = new Date(interaction.timestamp).getTime();
    
    // Start a new conversation if this is the first one or if time gap is large
    if (!currentConversation || (currentTime - lastTimestamp > timeThreshold)) {
      if (currentConversation) {
        // Save the previous conversation before starting a new one
        conversations.push({
          ...currentConversation,
          agent_types: Array.from(agentTypes),
          end_time: new Date(lastTimestamp).toISOString(),
        });
      }
      
      // Start a new conversation
      currentConversation = {
        conversation_id: interaction.id, // Use the first interaction id as conversation id
        start_time: interaction.timestamp,
        message_count: 1,
        model_used: (interaction.metadata?.model || "unknown"),
      };
      
      agentTypes = new Set();
      if (interaction.agent_type) {
        agentTypes.add(interaction.agent_type);
      }
    } else {
      // Continue the current conversation
      currentConversation.message_count++;
      if (interaction.agent_type) {
        agentTypes.add(interaction.agent_type);
      }
      
      // Update model if available
      if (interaction.metadata?.model && currentConversation.model_used === "unknown") {
        currentConversation.model_used = interaction.metadata.model;
      }
    }
    
    lastTimestamp = currentTime;
  }

  // Add the last conversation if exists
  if (currentConversation) {
    conversations.push({
      ...currentConversation,
      agent_types: Array.from(agentTypes),
      end_time: new Date(lastTimestamp).toISOString(),
    });
  }

  return conversations;
}
