import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// Import the fal client
import { fal } from 'https://esm.sh/@fal-ai/client@^1.0.0'; 
import { corsHeaders } from '../_shared/cors.ts'

console.log(`Function "image-generator" up and running!`)

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
  // Consider throwing an error or handling this case appropriately
}


interface ImageJobPayload {
  type: 'INSERT';
  table: string;
  record: {
    id: string; // DB Job ID
    scene_id: string;
    prompt: string;
    product_image_url?: string; 
    version: 'v1' | 'v2'; 
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
    const payload: ImageJobPayload = await req.json()
    console.log("Received image job payload:", JSON.stringify(payload, null, 2));

    if (payload.type !== 'INSERT' || payload.table !== 'image_generation_jobs' || payload.record.status !== 'pending') {
       console.log(`Ignoring event: type=${payload.type}, table=${payload.table}, status=${payload.record.status}`);
       return new Response(JSON.stringify({ message: 'Ignoring event, not a new pending image job' }), {
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
    const version = job.version;

    // Determine fal.ai model ID and input based on version
    let falModelId: string;
    let falInput: Record<string, any>;

    if (version === 'v1') {
      falModelId = 'fal-ai/flux-subject'; // As confirmed
      if (!job.prompt || !job.product_image_url) {
        throw new Error(`Missing prompt or product_image_url for v1 job ${dbJobId}`);
      }
      falInput = {
        prompt: job.prompt,
        image_url: job.product_image_url,
        // Add other relevant parameters for flux-subject if needed
      };
    } else if (version === 'v2') {
      falModelId = 'fal-ai/bria/product-shot'; // As confirmed
       if (!job.prompt || !job.product_image_url) { // bria needs scene_description (passed as prompt) and image_url
        throw new Error(`Missing prompt (scene_description) or product_image_url for v2 job ${dbJobId}`);
      }
      falInput = {
        scene_description: job.prompt, // Use job prompt as scene_description for bria
        image_url: job.product_image_url,
         // Add other relevant parameters for bria/product-shot if needed
         // e.g., placement_type, shot_size etc. - using defaults for now
      };
    } else {
      throw new Error(`Unsupported image generation version: ${version}`);
    }

    // Create Supabase client (consider service role key)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      // Use Service Role Key for backend operations like updating job status
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? '' 
    )
    
    // 1. Update job status to 'submitting' (optional intermediate state)
    console.log(`Updating job ${dbJobId} status to submitting...`);
    await supabaseClient
      .from('image_generation_jobs')
      .update({ status: 'submitting', updated_at: new Date().toISOString() })
      .eq('id', dbJobId);
      // We proceed even if this update fails initially

    // 2. Submit to fal.ai queue
    console.log(`Submitting job ${dbJobId} to fal.ai model ${falModelId}...`);
    // Define webhook URL (replace with your actual result handler function URL)
    // Needs to be configured in Supabase Function settings as well
    const webhookUrl = Deno.env.get('FAL_RESULT_WEBHOOK_URL'); 
    
    const falResponse = await fal.queue.submit(falModelId, {
        input: falInput,
        // Include webhookUrl if configured, otherwise results need polling
        ...(webhookUrl && { webhookUrl: `${webhookUrl}?type=image&jobId=${dbJobId}` }) // Pass DB job ID back
    });

    const falRequestId = falResponse?.request_id;

    if (!falRequestId) {
        throw new Error("fal.ai submission did not return a request_id");
    }
    console.log(`fal.ai job submitted for DB job ${dbJobId}. Request ID: ${falRequestId}`);

    // 3. Update job status to 'queued' and store fal_request_id
    console.log(`Updating job ${dbJobId} status to queued with fal_request_id ${falRequestId}...`);
    const { error: finalUpdateError } = await supabaseClient
      .from('image_generation_jobs')
      .update({ 
          status: 'queued', // Or 'processing' if fal starts immediately
          fal_request_id: falRequestId, 
          updated_at: new Date().toISOString() 
      })
      .eq('id', dbJobId);

     if (finalUpdateError) {
      // Log error but consider the submission successful
      console.error(`Error updating job ${dbJobId} status/fal_request_id:`, finalUpdateError);
    }

    // NOTE: Result handling (fetching result URL, updating scene) is now deferred 
    // to the webhook handler or a separate polling mechanism.

    return new Response(JSON.stringify({ 
        message: "Job submitted to fal.ai queue successfully.",
        dbJobId: dbJobId, 
        falRequestId: falRequestId 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200, // Indicate successful submission
    })
  } catch (error) {
    console.error(`Error processing image job (DB ID: ${dbJobId}):`, error);
    
    // Attempt to mark the job as failed in the database if we have an ID
    if (dbJobId) {
        try {
             const supabaseClient = createClient(
                Deno.env.get('SUPABASE_URL') ?? '',
                Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? ''
             )
             await supabaseClient
                .from('image_generation_jobs')
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
2. Deploy: `supabase functions deploy image-generator --no-verify-jwt` 
*/