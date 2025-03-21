
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// Define response type with proper CORS headers
type ResponseOptions = {
  status?: number;
  statusText?: string;
  headers?: Headers;
};

// Create a response with CORS headers
function createResponse(body: unknown, options: ResponseOptions = {}) {
  const headers = new Headers(options.headers);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    headers.set(key, value);
  });

  return new Response(JSON.stringify(body), {
    ...options,
    headers,
  });
}

// Connect to Supabase
const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
const supabaseServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
const openaiApiKey = Deno.env.get("OPENAI_API_KEY") as string;

// Handler for the request
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
    });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceRole);
    
    const { stageId, action } = await req.json();
    
    if (!stageId) {
      return createResponse(
        { error: "Missing stageId parameter" },
        { status: 400 }
      );
    }
    
    // Fetch the processing stage
    const { data: stage, error: stageError } = await supabase
      .from("order_processing_stages")
      .select("*")
      .eq("id", stageId)
      .single();
      
    if (stageError) {
      return createResponse(
        { error: `Failed to fetch stage: ${stageError.message}` },
        { status: 500 }
      );
    }
    
    // Fetch the order
    const { data: order, error: orderError } = await supabase
      .from("custom_orders")
      .select("*, custom_order_media(*)")
      .eq("id", stage.order_id)
      .single();
      
    if (orderError) {
      return createResponse(
        { error: `Failed to fetch order: ${orderError.message}` },
        { status: 500 }
      );
    }
    
    // Update stage status to in_progress
    if (action === "start") {
      const { error: updateError } = await supabase
        .from("order_processing_stages")
        .update({ status: "in_progress" })
        .eq("id", stageId);
        
      if (updateError) {
        return createResponse(
          { error: `Failed to update stage: ${updateError.message}` },
          { status: 500 }
        );
      }
    }
    
    // Use OpenAI to process the stage based on the stage_name
    let prompt = "";
    
    switch (stage.stage_name) {
      case "script_writing":
        prompt = `You are creating a script for a custom order with the following details:\n\n${order.remark}\n\nCreate a professional script that will be used to create a video. Format it with scenes and dialogue.`;
        break;
      case "scene_description":
        prompt = `Based on this script:\n\n${stage.input_data?.script || "No script available"}\n\nBreak it down into detailed scene descriptions for each part of the video. For each scene, describe the visuals, camera angles, and any text overlays.`;
        break;
      case "voiceover_generation":
        prompt = `Create voiceover text for this script:\n\n${stage.input_data?.script || "No script available"}\n\nYour output should be formatted as dialogue for a professional voice actor to read.`;
        break;
      case "image_generation":
        prompt = `Based on these scene descriptions:\n\n${stage.input_data?.scene_descriptions || "No scene descriptions available"}\n\nCreate detailed image prompts for each scene that can be used with an AI image generator.`;
        break;
      case "music_generation":
        prompt = `Recommend background music for a video with this script:\n\n${stage.input_data?.script || "No script available"}\n\nSuggest specific music styles, tempos, and moods that would complement this content.`;
        break;
      case "video_assembly":
        prompt = `Create an assembly plan for a video with:\n- Script: ${stage.input_data?.script || "No script available"}\n- Scene descriptions: ${stage.input_data?.scene_descriptions || "No scene descriptions"}\n- Image prompts: ${stage.input_data?.image_prompts || "No image prompts"}\n\nProvide a step-by-step plan for how all these elements should be assembled into a cohesive video.`;
        break;
      default:
        prompt = `Process the ${stage.stage_name} stage for order ${order.id} with the following input data:\n\n${JSON.stringify(stage.input_data, null, 2)}`;
    }
    
    // Call OpenAI API
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an AI assistant specialized in ${stage.stage_name} for video production. Provide detailed, professional output for each stage of video creation.`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });
    
    const openaiData = await openaiResponse.json();
    
    if (!openaiResponse.ok) {
      return createResponse(
        { error: `OpenAI API error: ${JSON.stringify(openaiData)}` },
        { status: 500 }
      );
    }
    
    // Extract content from the OpenAI response
    const content = openaiData.choices[0].message.content;
    
    // Process the result based on the stage
    let outputData = {};
    
    switch (stage.stage_name) {
      case "script_writing":
        outputData = { script: content };
        break;
      case "scene_description":
        outputData = { scene_descriptions: content };
        break;
      case "voiceover_generation":
        outputData = { voiceover_text: content };
        break;
      case "image_generation":
        outputData = { image_prompts: content };
        break;
      case "music_generation":
        outputData = { music_recommendations: content };
        break;
      case "video_assembly":
        outputData = { assembly_plan: content };
        break;
      default:
        outputData = { result: content };
    }
    
    // Update the stage with the output data and mark as completed
    if (action === "process") {
      const { error: updateError } = await supabase
        .from("order_processing_stages")
        .update({ 
          status: "completed", 
          output_data: outputData,
          completed_at: new Date().toISOString()
        })
        .eq("id", stageId);
        
      if (updateError) {
        return createResponse(
          { error: `Failed to update stage: ${updateError.message}` },
          { status: 500 }
        );
      }
    }
    
    return createResponse({
      success: true,
      stage: stage.stage_name,
      outputData,
      message: `Successfully processed ${stage.stage_name} stage`
    });
    
  } catch (error) {
    console.error("Error processing request:", error);
    return createResponse(
      { error: error.message },
      { status: 500 }
    );
  }
});
