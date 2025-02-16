
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Metadata {
  seo_title: string;
  seo_description: string;
  keywords: string;
  instagram_hashtags: string;
  product_context: string;
}

function validateMetadata(metadata: Metadata): void {
  if (metadata.seo_title.length > 60) {
    throw new Error('SEO title must not exceed 60 characters');
  }

  if (metadata.seo_description.length > 160) {
    throw new Error('SEO description must not exceed 160 characters');
  }

  const keywordCount = metadata.keywords.split(',').length;
  if (keywordCount < 10 || keywordCount > 15) {
    throw new Error('Keywords must contain between 10 and 15 items');
  }

  const hashtagCount = metadata.instagram_hashtags.split(' ').length;
  if (hashtagCount < 20 || hashtagCount > 30) {
    throw new Error('Instagram hashtags must contain between 20 and 30 items');
  }

  if (!metadata.product_context || metadata.product_context.trim().length === 0) {
    throw new Error('Product context cannot be empty');
  }
}

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
    console.log('Prompt:', prompt);
    console.log('Additional Context:', additionalContext);
    console.log('Custom Title Twist:', customTitleTwist);

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
    const { data: existingMetadata, error: fetchError } = await supabase
      .from('product_image_metadata')
      .select('metadata_regeneration_count')
      .eq('image_job_id', imageJobId)
      .maybeSingle();

    if (fetchError) {
      throw fetchError;
    }

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
            content: `You are a professional product marketing specialist. Generate product metadata with these STRICT requirements:

1. SEO Title (Maximum 60 characters):
   - Create a compelling, SEO-optimized title
   - Focus on the product's key benefit
   - Example: "Premium Leather Wallet - Handcrafted Italian Design" (48 chars)

2. SEO Description (Maximum 160 characters):
   - Write a concise, benefit-focused description
   - Include key features and value proposition
   - Example: "Discover our handcrafted Italian leather wallet, featuring 8 card slots and RFID protection. Premium quality meets elegant design."

3. Keywords (EXACTLY 10-15 items):
   - Comma-separated without spaces
   - Focus on product features and benefits
   - Example: "leather wallet,handcrafted wallet,italian leather,RFID wallet,luxury wallet,mens wallet,premium wallet,card holder,bifold wallet,leather goods"

4. Instagram Hashtags (EXACTLY 25 hashtags):
   - Space-separated with # symbol
   - Mix of popular and niche tags
   - MUST include EXACTLY 25 hashtags, no more, no less
   - Example: "#leathergoods #handcrafted #luxuryaccessories #handmadeleather #italianleather #leathercraft #luxurywallet #premiumwallet #handstitched #leatherwork #minimalwallet #leatheraccessories #walletdesign #mensfashion #leatherwallet #luxurylifestyle #handmadewallet #sustainable #artisancraft #giftforhim #EDCwallet #walletessentials #businessaccessories #rfidwallet #leathergifts"

5. Product Context (2-3 sentences):
   - Describe key features and benefits
   - Focus on unique selling points
   - Example: "This handcrafted Italian leather wallet combines timeless elegance with modern functionality. Features RFID protection and 8 card slots in a slim, minimalist design perfect for the sophisticated professional."

Your response MUST be a valid JSON object with these EXACT fields. Do not include any text outside the JSON.
Follow the length requirements strictly.`
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
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error('Failed to generate metadata with OpenAI');
    }

    const completion = await response.json();
    console.log('Raw OpenAI response:', completion);
    console.log('Message content:', completion.choices[0].message.content);
    
    let metadata: Metadata;
    try {
      metadata = JSON.parse(completion.choices[0].message.content);
      validateMetadata(metadata);
    } catch (error) {
      console.error('Failed to parse or validate OpenAI response:', error);
      console.error('Raw content:', completion.choices[0].message.content);
      throw new Error(`Invalid metadata format: ${error.message}`);
    }

    console.log('Successfully validated metadata:', metadata);

    // First, try to update existing record
    const { error: updateError } = await supabase
      .from('product_image_metadata')
      .update({
        seo_title: metadata.seo_title,
        seo_description: metadata.seo_description,
        keywords: metadata.keywords,
        instagram_hashtags: metadata.instagram_hashtags,
        product_context: metadata.product_context,
        metadata_regeneration_count: (regenerationCount || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('image_job_id', imageJobId);

    // If no record exists, insert a new one
    if (updateError) {
      const { error: insertError } = await supabase
        .from('product_image_metadata')
        .insert({
          image_job_id: imageJobId,
          seo_title: metadata.seo_title,
          seo_description: metadata.seo_description,
          keywords: metadata.keywords,
          instagram_hashtags: metadata.instagram_hashtags,
          product_context: metadata.product_context,
          metadata_regeneration_count: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('Database insert error:', insertError);
        throw insertError;
      }
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
