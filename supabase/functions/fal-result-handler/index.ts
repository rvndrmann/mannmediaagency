import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log(`Function "fal-result-handler" up and running!`)

// Expected structure of the webhook payload from fal.ai (adjust based on actual payload)
// This is a guess based on common patterns; refer to fal.ai webhook docs.
interface FalWebhookPayload {
  request_id: string;
  status: 'COMPLETED' | 'ERROR'; // Or other statuses fal.ai might send
  result?: { // Present if status is COMPLETED
    images?: { url: string; content_type: string; }[]; // For image jobs
    video?: { url: string; content_type: string; }; // For video jobs
    // Add other potential result fields
  };
  error?: any; // Present if status is ERROR
  logs?: any[];
}

// Structure expected in the query parameters we added
interface QueryParams {
    type: 'image' | 'video';
    jobId: string; // The DB Job ID (agent_image_generation_jobs or agent_video_generation_jobs)
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // TODO: Add security verification if possible (e.g., check a secret header from fal.ai)

  let dbJobId: string | null = null;
  let jobType: 'image' | 'video' | null = null;

  try {
    // Extract DB Job ID and type from query parameters
    const url = new URL(req.url);
    const queryJobId = url.searchParams.get('jobId');
    const queryJobType = url.searchParams.get('type');

    if (!queryJobId || (queryJobType !== 'image' && queryJobType !== 'video')) {
        console.error("Missing or invalid query parameters 'jobId' or 'type'");
        throw new Error("Missing or invalid query parameters");
    }
    dbJobId = queryJobId;
    jobType = queryJobType;

    const payload: FalWebhookPayload = await req.json();
    console.log(`Received fal.ai result webhook for DB Job ID: ${dbJobId}, Type: ${jobType}`);
    console.log("Webhook Payload:", JSON.stringify(payload, null, 2));

    const falRequestId = payload.request_id;
    const falStatus = payload.status;
    const falResult = payload.result;
    const falError = payload.error;

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const targetTable = jobType === 'image' ? 'agent_image_generation_jobs' : 'agent_video_generation_jobs';
    const sceneUpdateColumn = jobType === 'image' ? 'image_url' : 'video_url';
    let finalStatus: string;
    let resultUrl: string | null = null;
    let errorMessage: string | null = null;

    if (falStatus === 'COMPLETED' && falResult) {
        finalStatus = 'completed';
        if (jobType === 'image' && falResult.images && falResult.images.length > 0) {
            resultUrl = falResult.images[0].url; // Assuming first image is the result
        } else if (jobType === 'video' && falResult.video) {
            resultUrl = falResult.video.url;
        } else {
            console.warn(`fal.ai status COMPLETED but no expected result found for job type ${jobType}`);
            finalStatus = 'failed'; // Mark as failed if result format is unexpected
            errorMessage = 'Completed successfully by fal.ai but result format was unexpected.';
        }
    } else {
        finalStatus = 'failed';
        errorMessage = typeof falError === 'string' ? falError : JSON.stringify(falError);
        console.error(`fal.ai job ${falRequestId} failed:`, errorMessage);
    }

    // 1. Update the job status in the DB job table
    console.log(`Updating ${targetTable} job ${dbJobId} status to ${finalStatus}...`);
    const { error: jobUpdateError } = await supabaseClient
      .from(targetTable)
      .update({ 
          status: finalStatus, 
          result_url: resultUrl, 
          error_message: errorMessage,
          updated_at: new Date().toISOString() 
      })
      .eq('id', dbJobId)
      // Optionally match fal_request_id for extra safety
      .eq('fal_request_id', falRequestId); 

    if (jobUpdateError) {
      console.error(`Error updating job ${dbJobId} in ${targetTable}:`, jobUpdateError);
      // Don't necessarily throw, as we might still want to update the scene if possible
    } else {
        console.log(`Successfully updated job ${dbJobId} in ${targetTable}.`);
    }

    // 2. Update the corresponding scene if the job was successful
    if (finalStatus === 'completed' && resultUrl) {
        // Fetch scene_id from the job table first
        const { data: jobData, error: jobFetchError } = await supabaseClient
            .from(targetTable)
            .select('scene_id')
            .eq('id', dbJobId)
            .single();

        if (jobFetchError || !jobData?.scene_id) {
            console.error(`Could not fetch scene_id for job ${dbJobId} to update scene table.`);
        } else {
            const sceneId = jobData.scene_id;
            console.log(`Updating scene ${sceneId} with result URL: ${resultUrl}`);
            const { error: sceneUpdateError } = await supabaseClient
                .from('canvas_scenes')
                .update({ 
                    [sceneUpdateColumn]: resultUrl, // Use dynamic column name
                    updated_at: new Date().toISOString() 
                })
                .eq('id', sceneId);

            if (sceneUpdateError) {
                console.error(`Error updating scene ${sceneId} with result URL:`, sceneUpdateError);
            } else {
                 console.log(`Successfully updated scene ${sceneId}.`);
            }
        }
    }

    return new Response(JSON.stringify({ message: `Webhook processed for job ${dbJobId}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error("Error processing fal.ai webhook:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500, 
    })
  }
})

/* 
To deploy:
1. Set SUPABASE_SERVICE_ROLE_KEY environment variable in Supabase Function settings.
2. Deploy: `supabase functions deploy fal-result-handler --no-verify-jwt` 
3. Configure this function's URL (e.g., https://<project_ref>.supabase.co/functions/v1/fal-result-handler) 
   as the FAL_RESULT_WEBHOOK_URL environment variable for the image-generator and video-generator functions.
*/