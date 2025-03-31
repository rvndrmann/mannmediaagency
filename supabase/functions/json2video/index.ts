
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { projectId, payload } = await req.json();
    
    const json2videoApiKey = Deno.env.get('VITE_JSON2VIDEO_API_KEY') || Deno.env.get('JSON2VIDEO_API_KEY');
    
    if (!json2videoApiKey) {
      throw new Error("JSON2VIDEO_API_KEY is not configured");
    }
    
    if (!projectId || !payload) {
      throw new Error("Missing required parameters: projectId and payload");
    }
    
    console.log(`Creating final video for project ${projectId}`);
    console.log("JSON2Video payload:", JSON.stringify(payload));
    
    // Call the JSON2Video API
    const response = await fetch("https://api.json2video.com/v2/movies", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": json2videoApiKey
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`JSON2Video API error: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    
    // If the video generation is asynchronous, the API will return a job ID
    // We should save this and create a periodic check for the status
    const jobId = data.jobId || data.id;
    
    // For simplicity in this implementation, we'll simulate a direct response
    // In a real implementation, you would use the job ID to poll for status
    
    // Simulate video URL (in a real implementation, this would come from the API)
    const videoUrl = data.videoUrl || `https://api.json2video.com/v2/movies/${jobId}/video`;
    
    return new Response(
      JSON.stringify({
        success: true,
        jobId,
        videoUrl,
        message: "Final video assembly started"
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error in json2video function:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
