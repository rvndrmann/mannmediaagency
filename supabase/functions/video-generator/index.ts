import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// Import the fal client
import { fal } from 'https://esm.sh/@fal-ai/client@^1.0.0'; 
import { corsHeaders } from '../_shared/cors.ts'

console.log(`Function "video-generator" up and running!`)

// Initialize fal client with credentials from environment variables
// FAL_KEY needs to be set in Supabase Function environment variables
const FAL_KEY = Deno.env.get('FAL_KEY');
if (FAL_KEY) {
  fal.config({
    credentials: FAL_KEY
  });
  console.log("fal.ai client configured.");
} else {
  console.error("FAL_KEY environment variable not set!");
}

interface VideoJobPayload {
  type: 'INSERT';
  table: string;
  record: {
    id: string; // DB Job ID
    scene_id: string;
    image_url?: string; 
    description?: string; // Used as prompt for video API
    status: string;
    // fal_request_id will be added by this function
  };
  schema: string;
  old_record: null | any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let dbJobId: string | null = null; // Keep track of DB job ID for error reporting

  try {
    const payload: VideoJobPayload = await req.json()
    console.log("Received video job payload:", JSON.stringify(payload, null, 2));

    if (payload.type !== 'INSERT' || payload.table !== 'video_generation_jobs' || payload.record.status !== 'pending') {
       console.log(`Ignoring event: type=${payload.type}, table=${payload.table}, status=${payload.record.status}`);
       return new Response(JSON.stringify({ message: 'Ignoring event, not a new pending video job' }), {
         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
         status: 200,
       })
    }
    
    if (!FAL_KEY) {
       throw new Error("FAL_KEY environment variable is not configured for the function.");
    }

    const job = payload.record;
    dbJobId = job.id; // Store DB job ID
    const sceneId = job.scene_id;

    // Prepare input for fal.ai video API
    const falModelId = 'fal-ai/kling-video/v1.6/standard/image-to-video'; // As confirmed
    if (!job.image_url) {
      throw new Error(`Missing image_url for video job ${dbJobId}`);
    }
    const falInput = {
      image_url: job.image_url,
      prompt: job.description || "", // Use description as prompt, default to empty string
      // Add other relevant parameters like duration, aspect_ratio if needed
    };

    // Create Supabase client (consider service role key)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )
    
    // 1. Update job status to 'submitting' (optional)
    console.log(`Updating job ${dbJobId} status to submitting...`);
    await supabaseClient
      .from('video_generation_jobs')
      .update({ status: 'submitting', updated_at: new Date().toISOString() })
      .eq('id', dbJobId);

    // 2. Submit to fal.ai queue
    console.log(`Submitting job ${dbJobId} to fal.ai model ${falModelId}...`);
    const webhookUrl = Deno.env.get('FAL_RESULT_WEBHOOK_URL'); // Use the same webhook handler? Needs logic there.
    
    const falResponse = await fal.queue.submit(falModelId, {
        input: falInput,
        ...(webhookUrl && { webhookUrl: `${webhookUrl}?type=video&jobId=${dbJobId}` }) // Pass type=video
    });

    const falRequestId = falResponse?.request_id;

    if (!falRequestId) {
        throw new Error("fal.ai submission did not return a request_id");
    }
    console.log(`fal.ai job submitted for DB job ${dbJobId}. Request ID: ${falRequestId}`);

    // 3. Update job status to 'queued' and store fal_request_id
    console.log(`Updating job ${dbJobId} status to queued with fal_request_id ${falRequestId}...`);
    const { error: finalUpdateError } = await supabaseClient
      .from('video_generation_jobs')
      .update({ 
          status: 'queued', 
          fal_request_id: falRequestId, 
          updated_at: new Date().toISOString() 
      })
      .eq('id', dbJobId);

     if (finalUpdateError) {
      console.error(`Error updating job ${dbJobId} status/fal_request_id:`, finalUpdateError);
    }

    // Result handling deferred to webhook handler or poller

    return new Response(JSON.stringify({ 
        message: "Job submitted to fal.ai queue successfully.",
        dbJobId: dbJobId, 
        falRequestId: falRequestId 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200, 
    })
  } catch (error) {
    console.error(`Error processing video job (DB ID: ${dbJobId}):`, error);
    
    // Attempt to mark the job as failed in the database
    if (dbJobId) {
        try {
             const supabaseClient = createClient(
                Deno.env.get('SUPABASE_URL') ?? '',
                Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? ''
             )
             await supabaseClient
                .from('video_generation_jobs')
                .update({ status: 'failed', error_message: error.message, updated_at: new Date().toISOString() })
                .eq('id', dbJobId);
        } catch (updateErr) {
             console.error(`Failed to update job ${dbJobId} status to failed after error:`, updateErr);
        }
    }
    
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500, 
    })
  }
})

/* 
To deploy:
1. Set FAL_KEY and optionally FAL_RESULT_WEBHOOK_URL environment variables in Supabase Function settings.
2. Deploy: `supabase functions deploy video-generator --no-verify-jwt` 
*/