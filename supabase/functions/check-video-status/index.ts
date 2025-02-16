
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

interface RequestBody {
  request_id: string;
}

serve(async (req) => {
  const startTime = new Date().toISOString();
  console.log(`[${startTime}] check-video-status function started`);
  console.log('Request method:', req.method);
  
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    console.log('Initializing Supabase client...');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    console.log('Received request body:', body);

    const { request_id }: RequestBody = body;
    if (!request_id) {
      console.error('No request_id provided in request body');
      throw new Error('No request_id provided');
    }

    console.log(`[${new Date().toISOString()}] Checking status for request_id: ${request_id}`);
    const falApiKey = Deno.env.get('FAL_AI_API_KEY');
    console.log('FAL API Key available:', !!falApiKey, 'Length:', falApiKey?.length);

    // Use only the status endpoint
    const falApiUrl = `https://queue.fal.run/fal-ai/kling-video/requests/${request_id}/status`;
    console.log('Calling FAL API Status URL:', falApiUrl);

    const statusResponse = await fetch(falApiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Key ${falApiKey}`,
        'Content-Type': 'application/json'
      },
    });

    console.log('FAL API Status Response status:', statusResponse.status);
    console.log('FAL API Status Response headers:', Object.fromEntries(statusResponse.headers.entries()));

    if (!statusResponse.ok) {
      const errorText = await statusResponse.text();
      console.error('Failed to fetch status, response:', errorText);
      throw new Error(`Failed to fetch status: ${errorText}`);
    }

    const statusResult = await statusResponse.json();
    console.log('FAL API Status Response body:', JSON.stringify(statusResult, null, 2));

    let status = 'processing';
    let progress = 0;

    // Calculate progress based on status
    if (statusResult.status === 'completed') {
      status = 'completed';
      progress = 100;
      console.log('Video processing completed! Status will be updated to completed.');
    } else if (statusResult.status === 'processing') {
      // Get the job to calculate elapsed time-based progress
      const { data: currentJob } = await supabaseClient
        .from('video_generation_jobs')
        .select('created_at')
        .eq('request_id', request_id)
        .single();

      if (currentJob) {
        const createdAt = new Date(currentJob.created_at);
        const elapsedMinutes = (Date.now() - createdAt.getTime()) / (1000 * 60);
        
        if (elapsedMinutes <= 2) {
          progress = Math.min(Math.round((elapsedMinutes / 2) * 30), 30);
        } else if (elapsedMinutes <= 5) {
          progress = Math.min(30 + Math.round(((elapsedMinutes - 2) / 3) * 40), 70);
        } else {
          progress = Math.min(70 + Math.round(((elapsedMinutes - 5) / 2) * 29), 99);
        }
      }
    }

    // Update job status and progress in database
    console.log(`Updating job status to ${status} with progress ${progress}`);
    const { error: updateError } = await supabaseClient
      .from('video_generation_jobs')
      .update({ 
        status,
        progress,
        updated_at: new Date().toISOString()
      })
      .eq('request_id', request_id);

    if (updateError) {
      console.error('Error updating job:', updateError);
      throw updateError;
    }

    console.log('Successfully updated job status');
    return new Response(
      JSON.stringify({ status, progress }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error(`[${new Date().toISOString()}] Function error:`, errorMessage);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace available');
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
