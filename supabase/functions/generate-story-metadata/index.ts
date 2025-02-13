
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MetadataResponse {
  seo_title: string;
  seo_description: string;
  keywords: string;
  instagram_hashtags: string;
  thumbnail_prompt: string;
}

function validateMetadata(data: any): data is MetadataResponse {
  const required = ['seo_title', 'seo_description', 'keywords', 'instagram_hashtags', 'thumbnail_prompt'];
  return required.every(key => typeof data[key] === 'string');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { storyId, additionalContext, customTitleTwist } = await req.json();
    console.log(`Generating metadata for story ${storyId}`);
    
    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Get story content
    const { data: story, error: storyError } = await supabase
      .from('stories')
      .select('story')
      .eq('stories id', storyId)
      .single();

    if (storyError) {
      console.error('Error fetching story:', storyError);
      throw storyError;
    }

    if (!story?.story) {
      throw new Error('Story content not found');
    }

    // Prepare system message for better SEO and social media expertise
    const systemMessage = `You are an expert SEO and social media specialist with deep knowledge of content optimization, 
    keyword research, and social media trends. Your task is to analyze content and generate optimized metadata that will 
    maximize visibility and engagement across different platforms.

    You must respond with a valid JSON object containing EXACTLY these fields:
    {
      "seo_title": "string (60-70 chars)",
      "seo_description": "string (max 160 chars)",
      "keywords": "string (comma-separated)",
      "instagram_hashtags": "string (space-separated hashtags)",
      "thumbnail_prompt": "string"
    }`;

    // Prepare user message with detailed requirements
    const userMessage = `Generate metadata for the following content:

Story Content: ${story.story}
${additionalContext ? `Additional Context: ${additionalContext}` : ''}
${customTitleTwist ? `Custom Title Twist: ${customTitleTwist}` : ''}

Requirements:
1. SEO Title (60-70 characters, must include custom twist if provided)
2. SEO Description (max 160 characters, compelling and actionable)
3. Keywords (10-15 relevant terms, comma-separated)
4. Instagram Hashtags (20-30 trending and relevant hashtags)
5. Thumbnail Design Prompt (include text placement and visual elements)`;

    console.log('Calling OpenAI API...');
    
    // Call ChatGPT API
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4-mini',
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!openAIResponse.ok) {
      const error = await openAIResponse.json();
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
    }

    const gptData = await openAIResponse.json();
    console.log('OpenAI response:', JSON.stringify(gptData));
    
    if (!gptData.choices?.[0]?.message?.content) {
      throw new Error('Invalid response from OpenAI API');
    }

    // Parse and validate the response
    let metadata: MetadataResponse;
    try {
      const content = gptData.choices[0].message.content;
      console.log('Attempting to parse content:', content);
      metadata = JSON.parse(content.trim());
      if (!validateMetadata(metadata)) {
        console.error('Invalid metadata format:', metadata);
        throw new Error('Invalid metadata format');
      }
    } catch (error) {
      console.error('Error parsing metadata:', error);
      throw new Error('Failed to parse metadata response');
    }

    // Validate metadata fields
    if (metadata.seo_description.length > 160) {
      metadata.seo_description = metadata.seo_description.substring(0, 157) + '...';
    }

    console.log('Successfully generated metadata:', metadata);

    // Store metadata in database
    const { error: insertError } = await supabase
      .from('story_metadata')
      .upsert({
        story_id: storyId,
        seo_title: metadata.seo_title,
        seo_description: metadata.seo_description,
        keywords: metadata.keywords,
        instagram_hashtags: metadata.instagram_hashtags,
        thumbnail_prompt: metadata.thumbnail_prompt,
        additional_context: additionalContext,
        custom_title_twist: customTitleTwist,
      }, {
        onConflict: 'story_id'
      });

    if (insertError) {
      console.error('Error inserting metadata:', insertError);
      throw insertError;
    }

    return new Response(JSON.stringify(metadata), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-story-metadata function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
