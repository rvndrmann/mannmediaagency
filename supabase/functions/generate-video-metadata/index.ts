import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VideoMetadata {
  seo_title: string;
  seo_description: string;
  keywords: string;
  instagram_hashtags: string;
  video_context: string;
}

function validateMetadata(metadata: VideoMetadata): void {
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

  if (!metadata.video_context || metadata.video_context.trim().length === 0) {
    throw new Error('Video context cannot be empty');
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, videoJobId, additionalContext, customTitleTwist } = await req.json();
    
    if (!prompt || !videoJobId) {
      throw new Error('Prompt and videoJobId are required');
    }

    console.log('Starting video metadata generation process for:', videoJobId);
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
      .from('video_metadata')
      .select('metadata_regeneration_count')
      .eq('video_job_id', videoJobId)
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
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a professional video marketing specialist. Generate metadata for video content with these STRICT requirements:

1. SEO Title:
   - MUST be under 60 characters
   - Be compelling and optimized for video content
   - Focus on key value proposition

2. SEO Description:
   - MUST be under 160 characters
   - Optimize for video SEO
   - Include key benefits or features

3. Keywords:
   - EXACTLY 10-15 relevant comma-separated keywords
   - No spaces after commas
   - Focus on search relevance

4. Instagram Hashtags:
   - EXACTLY 20-30 relevant hashtags
   - Include # symbol
   - Space-separated
   - Mix of popular and niche tags

5. Video Context:
   - 2-3 concise sentences about the content
   - Focus on key features and value

Your response MUST be a valid JSON object with these EXACT fields:
{
  "seo_title": "...",
  "seo_description": "...",
  "keywords": "keyword1,keyword2,keyword3,...",
  "instagram_hashtags": "#hashtag1 #hashtag2 #hashtag3 ...",
  "video_context": "..."
}

DO NOT include any additional text or formatting outside of the JSON object.
VERIFY all length requirements before responding.`
          },
          {
            role: 'user',
            content: `Generate optimized metadata for this video content. Main prompt: "${prompt}"${additionalContext ? ` Additional context: ${additionalContext}` : ''}${customTitleTwist ? ` Custom title twist: ${customTitleTwist}` : ''}`
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
    console.log('OpenAI response:', completion);
    
    let metadata: VideoMetadata;
    try {
      metadata = JSON.parse(completion.choices[0].message.content);
      validateMetadata(metadata);
    } catch (error) {
      console.error('Failed to parse or validate OpenAI response:', error);
      throw new Error(`Invalid metadata format: ${error.message}`);
    }

    console.log('Successfully validated metadata:', metadata);

    // Upsert metadata and return the complete record
    const { data: updatedMetadata, error: upsertError } = await supabase
      .from('video_metadata')
      .upsert({
        video_job_id: videoJobId,
        seo_title: metadata.seo_title,
        seo_description: metadata.seo_description,
        keywords: metadata.keywords,
        instagram_hashtags: metadata.instagram_hashtags,
        video_context: metadata.video_context,
        additional_context: additionalContext,
        custom_title_twist: customTitleTwist,
        metadata_regeneration_count: regenerationCount + 1,
        updated_at: new Date().toISOString()
      })
      .select('*')
      .single();

    if (upsertError) {
      console.error('Database upsert error:', upsertError);
      throw upsertError;
    }

    console.log('Video metadata generation completed successfully');

    return new Response(JSON.stringify(updatedMetadata), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-video-metadata:', error);
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
