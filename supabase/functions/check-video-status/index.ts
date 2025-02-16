
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  request_id: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the request ID from the request body
    const { request_id }: RequestBody = await req.json();
    if (!request_id) {
      throw new Error('No request_id provided');
    }

    // Check status with FAL.AI
    const response = await fetch(`https://rest.fal.run/fal-ai/ltx-video/image-to-video/${request_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Key ${Deno.env.get('FAL_AI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();
    console.log('FAL.AI Status Response:', result);

    if (!response.ok) {
      throw new Error(result.error || 'Failed to check video status');
    }

    // Update the job status in our database
    const status = result.status === 'COMPLETED' ? 'completed' : 
                  result.status === 'FAILED' ? 'failed' : 'processing';

    const { error: updateError } = await supabaseClient.rpc(
      'update_video_generation_status',
      { 
        p_request_id: request_id,
        p_status: status,
        p_result_url: result.video_url
      }
    );

    if (updateError) {
      console.error('Update error:', updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({ 
        status,
        video_url: result.video_url
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
