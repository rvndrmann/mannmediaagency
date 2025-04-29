// supabase/functions/leonardo-upload-init-image/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

console.log('leonardo-upload-init-image function started');

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Ensure it's a POST request
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Retrieve the API key from environment variables
    const leonardoApiKey = Deno.env.get('LEONARDO_API_KEY');
    if (!leonardoApiKey) {
      console.error('LEONARDO_API_KEY environment variable not set.');
      return new Response(JSON.stringify({ error: 'Internal Server Error: API key not configured.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse the multipart/form-data
    const formData = await req.formData();
    const imageFile = formData.get('image') as File | null;
    const extension = formData.get('extension') as string | null; // e.g., 'png', 'jpg'

    if (!imageFile) {
      return new Response(JSON.stringify({ error: 'Missing image file in form data' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

     if (!extension) {
      return new Response(JSON.stringify({ error: 'Missing extension in form data' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prepare data for Leonardo API
    const leonardoFormData = new FormData();
    leonardoFormData.append('image', imageFile, imageFile.name);
    leonardoFormData.append('extension', extension);

    console.log(`Uploading init image to Leonardo.ai... Extension: ${extension}`);

    // Call Leonardo API
    const leonardoUrl = 'https://cloud.leonardo.ai/api/rest/v1/init-image';
    const response = await fetch(leonardoUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${leonardoApiKey}`,
        'Accept': 'application/json',
        // Content-Type is set automatically by fetch for FormData
      },
      body: leonardoFormData,
    });

    console.log(`Leonardo API response status: ${response.status}`);
    const responseBody = await response.json();
    console.log('Leonardo API response body:', JSON.stringify(responseBody, null, 2));


    if (!response.ok) {
      console.error('Leonardo API error:', responseBody);
      const errorMessage = responseBody?.error || `Leonardo API request failed with status ${response.status}`;
      return new Response(JSON.stringify({ error: 'Failed to upload image to Leonardo.ai', details: errorMessage }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract the init image ID
    const initImageId = responseBody?.uploadInitImage?.id;

    if (!initImageId) {
      console.error('Could not find init image ID in Leonardo response:', responseBody);
      return new Response(JSON.stringify({ error: 'Failed to parse init image ID from Leonardo response' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Successfully uploaded init image. ID: ${initImageId}`);

    // Return the initImageId
    return new Response(JSON.stringify({ initImageId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in leonardo-upload-init-image function:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'; // Check if error is an Error instance
    return new Response(JSON.stringify({ error: errorMessage }), { // Use the extracted message
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});