/// <reference types="https://deno.land/x/deno/cli/types/dts/index.d.ts" />
// supabase/functions/fal-poll-status/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log(`Function "fal-poll-status" up and running!`)

const FAL_API_KEY = Deno.env.get('FAL_KEY');
const FAL_VIDEO_API_BASE = 'https://queue.fal.run/fal-ai/kling-video';
const FAL_TTS_API_BASE = 'https://queue.fal.run/fal-ai/playai/tts/dialog'; // Added TTS API Base

// Supabase client using service role key for backend operations
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const POLLING_TIMEOUT_MINUTES = 15;

interface FalStatusPayload {
  status: 'COMPLETED' | 'ERROR' | 'FAILED' | 'IN_PROGRESS' | 'IN_QUEUE';
  // Add other fields if needed based on actual status response
}

// Specific interface for Video result
interface FalVideoResultPayload {
  request_id: string;
  status: 'COMPLETED'; // Expect COMPLETED when fetching result
  result?: {
    video?: { url: string; content_type: string; };
  };
  error?: any;
  logs?: any[];
}

// Specific interface for Audio result
interface FalAudioResultPayload {
  request_id: string;
  status: 'COMPLETED'; // Expect COMPLETED when fetching result
  result?: {
    audio?: { url: string; content_type: string; }; // Reflects audio output schema
  };
  error?: any;
  logs?: any[];
}


serve(async (_req: Request) => {
  if (!FAL_API_KEY) {
    console.error("FAL_KEY environment variable not set!");
    return new Response(JSON.stringify({ error: "FAL_KEY not configured" }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  try {
    console.log("Starting fal-poll-status run...");
    const fifteenMinutesAgo = new Date(Date.now() - POLLING_TIMEOUT_MINUTES * 60 * 1000).toISOString();

    // --- VIDEO POLLING LOGIC ---
    console.log("Polling for VIDEO jobs...");
    try {
        const { data: queuedVideoJobs, error: fetchVideoError } = await supabaseAdmin
          .from('agent_video_generation_jobs')
          .select('id, fal_request_id, created_at, updated_at, scene_id') // Ensure scene_id is selected
          .eq('status', 'queued');

        if (fetchVideoError) {
          console.error("Error fetching queued video jobs:", fetchVideoError);
          // Continue to voiceover polling even if video fetching fails
        } else if (!queuedVideoJobs || queuedVideoJobs.length === 0) {
          console.log("No queued video jobs found to poll.");
        } else {
          console.log(`Found ${queuedVideoJobs.length} queued video jobs to check.`);
          for (const job of queuedVideoJobs) {
            const dbJobId = job.id;
            const falRequestId = job.fal_request_id;
            const jobTimestamp = new Date(job.updated_at || job.created_at);

            if (!falRequestId) {
              console.warn(`Video Job ${dbJobId} is queued but missing fal_request_id. Marking as failed.`);
              await updateVideoJobStatus(dbJobId, 'failed', null, 'Missing fal_request_id for polling.');
              continue;
            }

            if (jobTimestamp < new Date(fifteenMinutesAgo)) {
              console.log(`Video Job ${dbJobId} (fal: ${falRequestId}) timed out. Marking as failed.`);
              await updateVideoJobStatus(dbJobId, 'failed', null, `Polling timed out after ${POLLING_TIMEOUT_MINUTES} minutes.`);
              continue;
            }

            console.log(`Polling status for video job ${dbJobId} (fal: ${falRequestId})...`);
            const statusUrl = `${FAL_VIDEO_API_BASE}/requests/${falRequestId}/status`;
            let falStatus: FalStatusPayload['status'] | null = null;
            let statusCheckError: string | null = null;

            try {
              const statusResponse = await fetch(statusUrl, { headers: { 'Authorization': `Key ${FAL_API_KEY}` } });
              if (!statusResponse.ok) { const errorBody = await statusResponse.text(); throw new Error(`Status check failed: ${statusResponse.status} ${errorBody}`); }
              const statusResult: FalStatusPayload = await statusResponse.json();
              falStatus = statusResult.status;
              console.log(`Status for video job ${dbJobId} (fal: ${falRequestId}): ${falStatus}`);
            } catch (err) {
              console.error(`Error checking status for video job ${dbJobId} (fal: ${falRequestId}):`, err);
              statusCheckError = err instanceof Error ? err.message : String(err);
            }

            if (falStatus === 'COMPLETED') {
              console.log(`Video Job ${dbJobId} (fal: ${falRequestId}) completed. Fetching result...`);
              try {
                const resultUrl = `${FAL_VIDEO_API_BASE}/requests/${falRequestId}`;
                const resultResponse = await fetch(resultUrl, { headers: { 'Authorization': `Key ${FAL_API_KEY}` } });
                if (!resultResponse.ok) { const errorBody = await resultResponse.text(); throw new Error(`Result fetch failed: ${resultResponse.status} ${errorBody}`); }
                const resultPayload: FalVideoResultPayload = await resultResponse.json();

                if (resultPayload.result?.video?.url) {
                  const videoUrl = resultPayload.result.video.url;
                  console.log(`Successfully fetched video URL for job ${dbJobId}: ${videoUrl}`);
                  await updateVideoJobStatus(dbJobId, 'completed', videoUrl, null);
                  await updateSceneWithVideoResult(job.scene_id, videoUrl); // Use scene_id from job data
                } else {
                  console.warn(`Video Job ${dbJobId} COMPLETED but result payload missing video URL:`, resultPayload);
                  await updateVideoJobStatus(dbJobId, 'failed', null, 'Completed but result format unexpected (missing video URL).');
                }
              } catch (err) {
                console.error(`Error fetching result for completed video job ${dbJobId} (fal: ${falRequestId}):`, err);
                await updateVideoJobStatus(dbJobId, 'failed', null, `Failed to fetch result after completion: ${err instanceof Error ? err.message : String(err)}`);
              }
            } else if (falStatus === 'ERROR' || falStatus === 'FAILED') {
              console.error(`Video Job ${dbJobId} (fal: ${falRequestId}) failed on fal.ai with status: ${falStatus}.`);
              await updateVideoJobStatus(dbJobId, 'failed', null, `fal.ai processing failed with status: ${falStatus}`);
            } else if (falStatus === 'IN_QUEUE' || falStatus === 'IN_PROGRESS') {
              console.log(`Video Job ${dbJobId} (fal: ${falRequestId}) is still ${falStatus}. Will check again later.`);
            } else if (statusCheckError) {
              console.log(`Status check failed for video job ${dbJobId}. Will retry next time.`);
              // Optionally mark as failed after several retries, but for now just log
            } else {
              console.warn(`Video Job ${dbJobId} (fal: ${falRequestId}) has unexpected status: ${falStatus}. Treating as pending.`);
            }
          } // End loop video jobs
        }
    } catch (videoPollingError) {
        console.error("An error occurred during the video polling section:", videoPollingError);
        // Log the error but allow the function to continue to voiceover polling
    }
    // --- END VIDEO POLLING LOGIC ---


    // --- VOICEOVER POLLING LOGIC ---
    console.log("Polling for VOICEOVER jobs...");
    try {
        const { data: queuedVoiceoverJobs, error: fetchVoiceoverError } = await supabaseAdmin
          .from('scene_voiceover_requests')
          .select('id, fal_request_id, created_at, updated_at, scene_id') // Select necessary fields
          .eq('status', 'queued');

        if (fetchVoiceoverError) {
          console.error("Error fetching queued voiceover jobs:", fetchVoiceoverError);
          // Do not stop the function, just log the error for this section
        } else if (!queuedVoiceoverJobs || queuedVoiceoverJobs.length === 0) {
          console.log("No queued voiceover jobs found to poll.");
        } else {
          console.log(`Found ${queuedVoiceoverJobs.length} queued voiceover jobs to check.`);
          for (const job of queuedVoiceoverJobs) {
            const dbJobId = job.id;
            const falRequestId = job.fal_request_id;
            const jobTimestamp = new Date(job.updated_at || job.created_at);

            if (!falRequestId) {
              console.warn(`Voiceover Job ${dbJobId} is queued but missing fal_request_id. Marking as failed.`);
              await updateVoiceoverJobStatus(dbJobId, 'failed', null, 'Missing fal_request_id for polling.');
              continue;
            }

            if (jobTimestamp < new Date(fifteenMinutesAgo)) {
              console.log(`Voiceover Job ${dbJobId} (fal: ${falRequestId}) timed out. Marking as failed.`);
              await updateVoiceoverJobStatus(dbJobId, 'failed', null, `Polling timed out after ${POLLING_TIMEOUT_MINUTES} minutes.`);
              continue;
            }

            console.log(`Polling status for voiceover job ${dbJobId} (fal: ${falRequestId})...`);
            const statusUrl = `${FAL_TTS_API_BASE}/requests/${falRequestId}/status`;
            let falStatus: FalStatusPayload['status'] | null = null;
            let statusCheckError: string | null = null;

            try {
              const statusResponse = await fetch(statusUrl, { headers: { 'Authorization': `Key ${FAL_API_KEY}` } });
              if (!statusResponse.ok) { const errorBody = await statusResponse.text(); throw new Error(`Status check failed: ${statusResponse.status} ${errorBody}`); }
              const statusResult: FalStatusPayload = await statusResponse.json();
              falStatus = statusResult.status;
              console.log(`Status for voiceover job ${dbJobId} (fal: ${falRequestId}): ${falStatus}`);
            } catch (err) {
              console.error(`Error checking status for voiceover job ${dbJobId} (fal: ${falRequestId}):`, err);
              statusCheckError = err instanceof Error ? err.message : String(err);
            }

            if (falStatus === 'COMPLETED') {
              console.log(`Voiceover Job ${dbJobId} (fal: ${falRequestId}) completed. Fetching result...`);
              try {
                const resultUrl = `${FAL_TTS_API_BASE}/requests/${falRequestId}`;
                const resultResponse = await fetch(resultUrl, { headers: { 'Authorization': `Key ${FAL_API_KEY}` } });
                if (!resultResponse.ok) { const errorBody = await resultResponse.text(); throw new Error(`Result fetch failed: ${resultResponse.status} ${errorBody}`); }
                const resultPayload: FalAudioResultPayload = await resultResponse.json();

                if (resultPayload.result?.audio?.url) {
                  const audioUrl = resultPayload.result.audio.url;
                  console.log(`Successfully fetched audio URL for job ${dbJobId}: ${audioUrl}`);
                  await updateVoiceoverJobStatus(dbJobId, 'completed', audioUrl, null);
                  await updateSceneWithAudioResult(job.scene_id, audioUrl); // Use scene_id from job data
                } else {
                  console.warn(`Voiceover Job ${dbJobId} COMPLETED but result payload missing audio URL:`, resultPayload);
                  await updateVoiceoverJobStatus(dbJobId, 'failed', null, 'Completed but result format unexpected (missing audio URL).');
                }
              } catch (err) {
                console.error(`Error fetching result for completed voiceover job ${dbJobId} (fal: ${falRequestId}):`, err);
                await updateVoiceoverJobStatus(dbJobId, 'failed', null, `Failed to fetch result after completion: ${err instanceof Error ? err.message : String(err)}`);
              }
            } else if (falStatus === 'ERROR' || falStatus === 'FAILED') {
              console.error(`Voiceover Job ${dbJobId} (fal: ${falRequestId}) failed on fal.ai with status: ${falStatus}.`);
              await updateVoiceoverJobStatus(dbJobId, 'failed', null, `fal.ai processing failed with status: ${falStatus}`);
            } else if (falStatus === 'IN_QUEUE' || falStatus === 'IN_PROGRESS') {
              console.log(`Voiceover Job ${dbJobId} (fal: ${falRequestId}) is still ${falStatus}. Will check again later.`);
            } else if (statusCheckError) {
              console.log(`Status check failed for voiceover job ${dbJobId}. Will retry next time.`);
              // Optionally mark as failed after several retries, but for now just log
            } else {
              console.warn(`Voiceover Job ${dbJobId} (fal: ${falRequestId}) has unexpected status: ${falStatus}. Treating as pending.`);
            }
          } // End loop voiceover jobs
        }
    } catch (voiceoverPollingError) {
        console.error("An error occurred during the voiceover polling section:", voiceoverPollingError);
        // Log the error but allow the function to finish if possible
    }
    // --- END VOICEOVER POLLING LOGIC ---


    console.log("fal-poll-status run finished.");
    return new Response(JSON.stringify({ message: "Polling cycle completed." }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error("Critical error in fal-poll-status function:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
})

// --- VIDEO HELPER FUNCTIONS ---
async function updateVideoJobStatus(dbJobId: string, status: string, resultUrl: string | null, errorMessage: string | null) {
    console.log(`Updating video job ${dbJobId} status to ${status}...`);
    const { error } = await supabaseAdmin
      .from('agent_video_generation_jobs')
      .update({ status: status, result_url: resultUrl, error_message: errorMessage, updated_at: new Date().toISOString() })
      .eq('id', dbJobId);
    if (error) console.error(`Failed to update video job ${dbJobId} status to ${status}:`, error);
    else console.log(`Successfully updated video job ${dbJobId} status.`);
}

async function updateSceneWithVideoResult(sceneId: string | null, videoUrl: string) {
    if (!sceneId) {
        console.error(`Cannot update scene with video result: scene_id is missing.`);
        return;
    }
    console.log(`Updating scene ${sceneId} with video URL: ${videoUrl}`);
    const { error } = await supabaseAdmin
        .from('canvas_scenes')
        .update({ video_url: videoUrl, updated_at: new Date().toISOString() }) // Assumes column name is video_url
        .eq('id', sceneId);
    if (error) console.error(`Error updating scene ${sceneId} with video URL:`, error);
    else console.log(`Successfully updated scene ${sceneId} with video.`);
}
// --- END VIDEO HELPER FUNCTIONS ---


// --- VOICEOVER HELPER FUNCTIONS ---
async function updateVoiceoverJobStatus(dbJobId: string, status: string, resultUrl: string | null, errorMessage: string | null) {
    console.log(`Updating voiceover job ${dbJobId} status to ${status}...`);
    const { error } = await supabaseAdmin
      .from('scene_voiceover_requests') // Target the correct table
      .update({ status: status, result_url: resultUrl, error_message: errorMessage, updated_at: new Date().toISOString() })
      .eq('id', dbJobId);
    if (error) console.error(`Failed to update voiceover job ${dbJobId} status to ${status}:`, error);
    else console.log(`Successfully updated voiceover job ${dbJobId} status.`);
}

async function updateSceneWithAudioResult(sceneId: string | null, audioUrl: string) {
    if (!sceneId) {
        console.error(`Cannot update scene with audio result: scene_id is missing.`);
        return;
    }
    console.log(`Updating scene ${sceneId} with audio URL: ${audioUrl}`);
    const { error } = await supabaseAdmin
        .from('canvas_scenes')
        .update({ voiceover_audio_url: audioUrl, updated_at: new Date().toISOString() }) // Target the correct column
        .eq('id', sceneId);
    if (error) console.error(`Error updating scene ${sceneId} with audio URL:`, error);
    else console.log(`Successfully updated scene ${sceneId} with audio.`);
}
// --- END VOICEOVER HELPER FUNCTIONS ---