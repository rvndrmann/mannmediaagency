
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { request_id, job_id } = await req.json()
    
    if (!request_id || !job_id) {
      throw new Error('Missing request_id or job_id parameter')
    }

    console.log('Checking status for request:', request_id, 'job:', job_id)
    
    // Create Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    )
    
    // Get FAL API key from environment variables
    const falApiKey = Deno.env.get('FAL_AI_API_KEY')
    if (!falApiKey) {
      throw new Error('FAL_AI_API_KEY is not configured')
    }

    // Get the video generation job details
    const { data: job, error: jobError } = await supabaseAdmin
      .from('video_generation_jobs')
      .select('*')
      .eq('id', job_id)
      .single()
    
    if (jobError) {
      throw new Error(`Failed to get job details: ${jobError.message}`)
    }
    
    if (!job) {
      throw new Error(`Job not found with ID: ${job_id}`)
    }

    // Check the status of the video generation request
    const response = await fetch(`https://queue.fal.run/fal-ai/kling-video/v1.6/standard/status/${request_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Key ${falApiKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to check status: ${errorText}`)
    }

    const data = await response.json()
    console.log('Status check response:', data)

    // Update the job status based on the response
    if (data.status === 'COMPLETED') {
      console.log('Video generation completed!')
      
      // Update the job with the result URL
      const { error: updateError } = await supabaseAdmin
        .from('video_generation_jobs')
        .update({
          status: 'completed',
          result_url: data.result.video_url,
          updated_at: new Date().toISOString()
        })
        .eq('id', job_id)
      
      if (updateError) {
        throw new Error(`Failed to update job status: ${updateError.message}`)
      }

      // Create a notification for the user
      await supabaseAdmin
        .from('user_notifications')
        .insert({
          user_id: job.user_id,
          title: 'Video Generation Complete',
          message: 'Your video from template has been created and is ready to view!',
          type: 'video_generation',
          related_id: job_id
        })

      return new Response(
        JSON.stringify({ 
          status: 'completed',
          result_url: data.result.video_url,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } 
    else if (data.status === 'FAILED') {
      console.error('Video generation failed:', data.error)
      
      const { error: updateError } = await supabaseAdmin
        .from('video_generation_jobs')
        .update({
          status: 'failed',
          error_message: data.error || 'Video generation failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', job_id)
      
      if (updateError) {
        throw new Error(`Failed to update job status: ${updateError.message}`)
      }
      
      return new Response(
        JSON.stringify({ 
          status: 'failed',
          error: data.error 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    else {
      // For PROCESSING or PENDING status
      console.log(`Video generation in progress. Status: ${data.status}`)
      
      // Progress calculation if available
      let progress = 0
      if (data.progress_percentage) {
        progress = Math.floor(data.progress_percentage)
      }
      
      // Update the job with progress
      const { error: updateError } = await supabaseAdmin
        .from('video_generation_jobs')
        .update({
          status: 'processing',
          progress: progress,
          last_checked_at: new Date().toISOString()
        })
        .eq('id', job_id)
      
      if (updateError) {
        console.error('Failed to update job progress:', updateError)
      }
      
      // Schedule another check after a delay
      setTimeout(async () => {
        try {
          // Call this function again to check the status
          await fetch(
            `${Deno.env.get('SUPABASE_URL')}/functions/v1/check-video-status-for-template`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ 
                request_id: request_id,
                job_id: job_id
              })
            }
          )
        } catch (err) {
          console.error('Error scheduling next check:', err)
        }
      }, 5000) // Check every 5 seconds
      
      return new Response(
        JSON.stringify({ 
          status: 'processing',
          progress: progress
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  } catch (err) {
    console.error('Error:', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
