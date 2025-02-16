
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  console.log('Request received:', req.method);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { request_id } = await req.json();
    
    if (!request_id) {
      throw new Error('No request_id provided');
    }

    const { data: job, error: jobError } = await supabaseClient
      .from('video_generation_jobs')
      .select('*')
      .eq('request_id', request_id)
      .single();

    if (jobError) {
      throw jobError;
    }

    // Calculate progress based on elapsed time
    const createdAt = new Date(job.created_at);
    const now = new Date();
    const elapsedMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);
    const progress = Math.min(Math.round((elapsedMinutes / 7) * 100), 99);

    return new Response(
      JSON.stringify({
        status: job.status,
        progress: job.status === 'completed' ? 100 : progress,
        result_url: job.result_url,
        message: 'Video generation in progress. This typically takes 7 minutes.'
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        } 
      }
    );

  } catch (error) {
    console.error('Function error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      }),
      { 
        status: 400,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});
