
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const POLL_INTERVAL = 15000; // 15 seconds
const MAX_POLLS = 20; // Maximum number of status checks (5 minutes total)

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Processing new image generation request')
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const falApiKey = Deno.env.get('FAL_AI_API_KEY')
    
    if (!supabaseUrl || !supabaseKey || !falApiKey) {
      throw new Error('Missing required environment variables')
    }

    const adminClient = createClient(supabaseUrl, supabaseKey)

    // Authenticate user
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await adminClient.auth.getUser(token)
    if (userError || !user) {
      throw new Error('Invalid user token')
    }

    // Parse and validate request data
    const requestData = await req.json()
    const { 
      prompt, 
      image: dataUri, 
      imageSize = 'square_hd',
      numInferenceSteps = 8,
      guidanceScale = 3.5,
      outputFormat = 'png'
    } = requestData

    if (!dataUri || !prompt) {
      return new Response(
        JSON.stringify({ error: 'Image and prompt are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check user credits
    const { data: userCredits, error: creditsError } = await adminClient
      .from('user_credits')
      .select('credits_remaining')
      .eq('user_id', user.id)
      .single();

    if (creditsError || !userCredits || userCredits.credits_remaining < 0.2) {
      return new Response(
        JSON.stringify({ 
          error: `Insufficient credits. You have ${userCredits?.credits_remaining || 0} credits, but need 0.2 credits.`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create job record
    const { data: jobData, error: jobError } = await adminClient
      .from('image_generation_jobs')
      .insert([{
        user_id: user.id,
        prompt: prompt,
        status: 'processing',
        settings: {
          imageSize,
          numInferenceSteps,
          guidanceScale,
          outputFormat
        }
      }])
      .select()
      .single()

    if (jobError) {
      throw new Error('Failed to create image generation job: ' + jobError.message)
    }

    try {
      // Step 1: Submit initial request to Fal.ai with the correct endpoint
      console.log('Submitting request to Fal.ai API...');
      const submitResponse = await fetch('https://queue.fal.run/fal-ai/flux-subject', {
        method: 'POST',
        headers: {
          'Authorization': `Key ${falApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: prompt,
          image_url: dataUri,
          image_size: imageSize,
          num_inference_steps: numInferenceSteps,
          guidance_scale: guidanceScale,
          output_format: outputFormat,
          num_images: 1,
          enable_safety_checker: true
        })
      });

      if (!submitResponse.ok) {
        const errorText = await submitResponse.text();
        console.error('Fal.ai API error:', errorText);
        throw new Error(`Failed to submit request: ${errorText}`);
      }

      const submitData = await submitResponse.json();
      const requestId = submitData.request_id;
      
      if (!requestId) {
        throw new Error('No request ID received from API');
      }

      console.log('Request submitted successfully, request ID:', requestId);

      // Update job with request ID
      await adminClient
        .from('image_generation_jobs')
        .update({ request_id: requestId })
        .eq('id', jobData.id);

      // Step 2: Poll for status until complete
      let pollCount = 0;
      let result = null;

      while (pollCount < MAX_POLLS) {
        console.log(`Checking status (attempt ${pollCount + 1}/${MAX_POLLS})...`);
        const statusResponse = await fetch(
          `https://queue.fal.run/fal-ai/flux-subject/requests/${requestId}/status`,
          {
            headers: {
              'Authorization': `Key ${falApiKey}`
            }
          }
        );

        if (!statusResponse.ok) {
          throw new Error(`Failed to check status: ${await statusResponse.text()}`);
        }

        const statusData = await statusResponse.json();
        console.log('Status:', statusData.status);
        
        if (statusData.status === 'COMPLETED') {
          // Step 3: Get the final result
          console.log('Request completed, fetching result...');
          const resultResponse = await fetch(
            `https://queue.fal.run/fal-ai/flux-subject/requests/${requestId}`,
            {
              headers: {
                'Authorization': `Key ${falApiKey}`
              }
            }
          );

          if (!resultResponse.ok) {
            throw new Error(`Failed to get result: ${await resultResponse.text()}`);
          }

          result = await resultResponse.json();
          break;
        } else if (statusData.status === 'FAILED') {
          throw new Error('Image generation failed');
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
        pollCount++;
      }

      if (!result || !result.images?.[0]?.url) {
        throw new Error('Failed to get image URL from result');
      }

      console.log('Successfully generated image');

      // Update job with success
      await adminClient
        .from('image_generation_jobs')
        .update({ 
          status: 'completed',
          result_url: result.images[0].url
        })
        .eq('id', jobData.id);

      return new Response(
        JSON.stringify({ 
          imageUrl: result.images[0].url,
          requestId: requestId,
          seed: result.seed,
          hasNsfw: result.has_nsfw_concepts?.[0] || false
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (processError) {
      console.error('Process error:', processError);
      
      // Update job with failure
      await adminClient
        .from('image_generation_jobs')
        .update({ 
          status: 'failed',
          error_message: processError.message 
        })
        .eq('id', jobData.id);

      throw processError;
    }
  } catch (error) {
    console.error('Error in generate-product-image function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})
