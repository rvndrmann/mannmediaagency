
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
    const { job_id, template_id, image_url } = await req.json()
    console.log('Received request:', { job_id, template_id, image_url })

    if (!job_id || !template_id || !image_url) {
      throw new Error('Missing required parameters: job_id, template_id, or image_url')
    }

    const falApiKey = Deno.env.get('FAL_AI_API_KEY')
    if (!falApiKey) {
      throw new Error('FAL_AI_API_KEY is not configured')
    }

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

    // Get template details
    const { data: template, error: templateError } = await supabaseAdmin
      .from('video_templates')
      .select('*')
      .eq('id', template_id)
      .single()

    if (templateError || !template) {
      throw new Error(`Template not found: ${templateError?.message || 'Unknown error'}`)
    }

    // Get job details
    const { data: job, error: jobError } = await supabaseAdmin
      .from('video_generation_jobs')
      .select('*')
      .eq('id', job_id)
      .single()

    if (jobError || !job) {
      throw new Error(`Job not found: ${jobError?.message || 'Unknown error'}`)
    }

    // Check if the user has enough credits
    const { data: userCredits, error: creditsError } = await supabaseAdmin
      .from('user_credits')
      .select('credits_remaining')
      .eq('user_id', job.user_id)
      .single()

    if (creditsError) {
      throw new Error(`Failed to check user credits: ${creditsError.message}`)
    }

    if (!userCredits || userCredits.credits_remaining < template.credits_cost) {
      await supabaseAdmin
        .from('video_generation_jobs')
        .update({
          status: 'failed',
          error_message: 'Insufficient credits',
          updated_at: new Date().toISOString()
        })
        .eq('id', job_id)

      throw new Error(`Insufficient credits. Required: ${template.credits_cost}, Available: ${userCredits?.credits_remaining || 0}`)
    }

    // Deduct credits
    const { error: deductError } = await supabaseAdmin
      .from('user_credits')
      .update({
        credits_remaining: userCredits.credits_remaining - template.credits_cost,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', job.user_id)

    if (deductError) {
      throw new Error(`Failed to deduct credits: ${deductError.message}`)
    }

    // Log credit usage
    await supabaseAdmin
      .from('credit_update_logs')
      .insert({
        user_id: job.user_id,
        credits_before: userCredits.credits_remaining,
        credits_after: userCredits.credits_remaining - template.credits_cost,
        status: 'success',
        trigger_source: 'template_video'
      })

    // Initialize video generation with Fal.ai
    console.log('Initializing video generation with Fal.ai using template:', template.name)
    const response = await fetch(
      'https://queue.fal.run/fal-ai/kling-video/v1.6/standard/image-to-video',
      {
        method: 'POST',
        headers: {
          'Authorization': `Key ${falApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          image_url: image_url,
          prompt: template.prompt_template,
          negative_prompt: "",
          num_frames: 24,
          duration: parseInt(template.duration),
          aspect_ratio: template.aspect_ratio
        })
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Fal.ai API error:', errorText)
      
      // Update job with failure status
      await supabaseAdmin
        .from('video_generation_jobs')
        .update({
          status: 'failed',
          error_message: `Failed to initiate video generation: ${errorText}`,
          last_checked_at: new Date().toISOString()
        })
        .eq('id', job_id)
      
      // Refund credits
      await supabaseAdmin
        .from('user_credits')
        .update({
          credits_remaining: userCredits.credits_remaining,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', job.user_id)
      
      throw new Error(`Failed to generate video: ${errorText}`)
    }

    const data = await response.json()
    console.log('Fal.ai response:', data)

    if (!data.request_id) {
      throw new Error('No request_id received from Fal.ai')
    }

    // Update the job with the request_id and initial status
    const { error: updateError } = await supabaseAdmin
      .from('video_generation_jobs')
      .update({
        request_id: data.request_id,
        status: 'in_queue',
        last_checked_at: new Date().toISOString(),
        settings: { 
          ...job.settings, 
          template_id: template.id, 
          template_name: template.name,
          credits_cost: template.credits_cost
        }
      })
      .eq('id', job_id)

    if (updateError) {
      throw updateError
    }

    // Start the status checking process
    await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/check-video-status-for-template`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          request_id: data.request_id,
          job_id: job_id
        })
      }
    )

    return new Response(
      JSON.stringify({ 
        status: 'in_queue',
        request_id: data.request_id,
        job_id: job_id,
        template: template.name
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (err) {
    console.error('Error:', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
