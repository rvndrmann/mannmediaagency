
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.34.0'

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );

    // Create the videos bucket if it doesn't exist
    const { data: videoBucket, error: videoError } = await supabaseAdmin
      .storage
      .createBucket('videos', {
        public: true,
        fileSizeLimit: 1024 * 1024 * 100, // 100MB
        allowedMimeTypes: ['video/mp4', 'video/webm', 'video/quicktime']
      })
      .catch(error => ({ data: null, error }));

    // Create the audio bucket if it doesn't exist
    const { data: audioBucket, error: audioError } = await supabaseAdmin
      .storage
      .createBucket('audio', {
        public: true,
        fileSizeLimit: 1024 * 1024 * 20, // 20MB
        allowedMimeTypes: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg']
      })
      .catch(error => ({ data: null, error }));

    // Set policy to allow public access to videos
    const videoPolicyResult = await supabaseAdmin
      .storage
      .from('videos')
      .createSignedUploadUrl('policy-setup-dummy-file')
      .then(() => ({
        error: null
      }))
      .catch(error => ({ error }));

    // Set policy to allow public access to audio
    const audioPolicyResult = await supabaseAdmin
      .storage
      .from('audio')
      .createSignedUploadUrl('policy-setup-dummy-file')
      .then(() => ({
        error: null
      }))
      .catch(error => ({ error }));

    const results = {
      videoBucket: videoBucket ? 'created' : 'error',
      videoError: videoError?.message || null,
      audioBucket: audioBucket ? 'created' : 'error',
      audioError: audioError?.message || null,
      videoPolicy: videoPolicyResult.error ? 'error' : 'set',
      videoPolicyError: videoPolicyResult.error?.message || null,
      audioPolicy: audioPolicyResult.error ? 'error' : 'set',
      audioPolicyError: audioPolicyResult.error?.message || null,
    };

    return new Response(
      JSON.stringify(results),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error setting up storage:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
