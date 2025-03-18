
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.1";

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Enable REPLICA IDENTITY FULL for image_generation_jobs
    const imageGenReplicaQuery = `ALTER TABLE public.image_generation_jobs REPLICA IDENTITY FULL;`;
    await supabase.rpc('query', { query_text: imageGenReplicaQuery });
    
    // Add image_generation_jobs to the publication
    const imageGenPublicationQuery = `
      ALTER PUBLICATION supabase_realtime 
      ADD TABLE public.image_generation_jobs;
    `;
    await supabase.rpc('query', { query_text: imageGenPublicationQuery });
    
    // Enable REPLICA IDENTITY FULL for video_generation_jobs
    const videoGenReplicaQuery = `ALTER TABLE public.video_generation_jobs REPLICA IDENTITY FULL;`;
    await supabase.rpc('query', { query_text: videoGenReplicaQuery });
    
    // Add video_generation_jobs to the publication
    const videoGenPublicationQuery = `
      ALTER PUBLICATION supabase_realtime 
      ADD TABLE public.video_generation_jobs;
    `;
    await supabase.rpc('query', { query_text: videoGenPublicationQuery });
    
    // Return success
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Realtime enabled for media generation tables" 
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  } catch (error) {
    console.error("Error enabling realtime:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Unknown error occurred" 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
