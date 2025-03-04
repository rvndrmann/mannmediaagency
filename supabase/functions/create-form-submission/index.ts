
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    const { formId, formData, phoneNumber, imageUrls } = body;

    if (!formId || !formData) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Insert the submission
    const { data: submission, error: submissionError } = await supabase
      .from('form_submissions')
      .insert({
        form_id: formId,
        submission_data: formData,
        phone_number: phoneNumber || null
      })
      .select('id')
      .single();

    if (submissionError) {
      throw submissionError;
    }

    // Process images if any
    if (imageUrls && imageUrls.length > 0) {
      const imagePromises = imageUrls.map(url => {
        return supabase
          .from('form_submission_images')
          .insert({
            submission_id: submission.id,
            image_url: url
          });
      });

      await Promise.all(imagePromises);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Form submission created successfully',
        submissionId: submission.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error creating form submission:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to create form submission', 
        details: error.message 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
