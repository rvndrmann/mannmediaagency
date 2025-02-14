
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
    const { prompt, imageJobId } = await req.json();
    
    if (!prompt || !imageJobId) {
      throw new Error('Prompt and imageJobId are required');
    }

    console.log('Generating metadata for prompt:', prompt);

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

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
            content: `You are a professional product marketing specialist. Generate metadata for product images. 
            Format your response as a JSON object with these fields:
            {
              "seo_title": "60 chars max, compelling title",
              "seo_description": "160 chars max description optimized for SEO",
              "keywords": "10-15 relevant comma-separated keywords",
              "instagram_hashtags": "20-30 relevant space-separated hashtags (include # symbol)",
              "product_context": "2-3 sentences about the product and its key features"
            }`
          },
          {
            role: 'user',
            content: `Generate optimized metadata for this product image prompt: "${prompt}"`
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate metadata with OpenAI');
    }

    const completion = await response.json();
    const metadata = JSON.parse(completion.choices[0].message.content);

    // Update the database with generated metadata
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error: upsertError } = await supabase
      .from('product_image_metadata')
      .upsert({
        image_job_id: imageJobId,
        ...metadata,
        regeneration_count: 0,
      });

    if (upsertError) {
      throw upsertError;
    }

    return new Response(JSON.stringify(metadata), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-product-metadata:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
