
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, imageJobId, additionalContext, customTitleTwist } = await req.json();
    
    if (!prompt || !imageJobId) {
      throw new Error('Prompt and imageJobId are required');
    }

    console.log('Starting metadata generation process for:', imageJobId);

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check existing metadata and regeneration count
    const { data: existingMetadata } = await supabase
      .from('product_image_metadata')
      .select('metadata_regeneration_count')
      .eq('image_job_id', imageJobId)
      .maybeSingle();

    const regenerationCount = existingMetadata?.metadata_regeneration_count || 0;
    if (regenerationCount >= 3) {
      throw new Error('Maximum regeneration limit reached for this metadata');
    }

    console.log('Regeneration count check passed:', regenerationCount);

    // Generate metadata using OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a professional product marketing specialist. Generate metadata for product images. Format your response as a valid JSON object with these fields: seo_title (60 chars max, compelling title), seo_description (160 chars max description optimized for SEO), keywords (10-15 relevant comma-separated keywords), instagram_hashtags (20-30 relevant space-separated hashtags including # symbol), product_context (2-3 sentences about the product and its key features)'
          },
          {
            role: 'user',
            content: `Generate optimized metadata for this product image. Main prompt: "${prompt}"${additionalContext ? ` Additional context: ${additionalContext}` : ''}${customTitleTwist ? ` Custom title twist: ${customTitleTwist}` : ''}`
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', await response.text());
      throw new Error('Failed to generate metadata with OpenAI');
    }

    const completion = await response.json();
    let metadata;
    
    try {
      metadata = JSON.parse(completion.choices[0].message.content);
    } catch (error) {
      console.error('Failed to parse OpenAI response:', completion.choices[0].message.content);
      throw new Error('Invalid metadata format received from OpenAI');
    }

    console.log('Successfully generated metadata, updating database');

    // Update the database with generated metadata
    // Note: Removed metadata_regeneration_count from upsert to let triggers handle it
    const { error: upsertError } = await supabase
      .from('product_image_metadata')
      .upsert({
        image_job_id: imageJobId,
        seo_title: metadata.seo_title,
        seo_description: metadata.seo_description,
        keywords: metadata.keywords,
        instagram_hashtags: metadata.instagram_hashtags,
        product_context: metadata.product_context,
      });

    if (upsertError) {
      console.error('Database update error:', upsertError);
      throw upsertError;
    }

    console.log('Metadata generation completed successfully');

    return new Response(JSON.stringify(metadata), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-product-metadata:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        code: error.code || 'UNKNOWN_ERROR'
      }), {
        status: error.code === '23505' ? 409 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
