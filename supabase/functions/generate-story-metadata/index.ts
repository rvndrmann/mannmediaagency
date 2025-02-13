
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
    
    // Get Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

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
    const systemMessage = `You are an expert SEO and social media specialist. Generate ONLY a JSON object with exactly these fields and nothing else:
{
  "seo_title": "(60-70 chars title that MUST incorporate the provided custom title twist if one is given)",
  "seo_description": "(max 160 chars description)",
  "keywords": "(10-15 comma-separated terms)",
  "instagram_hashtags": "(20-30 space-separated hashtags)",
  "thumbnail_prompt": "(visual design prompt)"
}`;

    // Prepare user message with detailed requirements
    const userMessage = `Analyze this content and generate metadata:

Story Content: ${story.story}
${additionalContext ? `Additional Context: ${additionalContext}` : ''}
${customTitleTwist ? `IMPORTANT - Custom Title Twist: The SEO title MUST incorporate this twist: ${customTitleTwist}` : ''}

${customTitleTwist ? 'Remember to incorporate the Custom Title Twist into the SEO title while keeping it engaging and SEO-friendly.' : ''}`;

    console.log('Calling OpenAI API...');
    
    // Call ChatGPT API with the correct model
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
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
    console.log('Raw OpenAI response:', JSON.stringify(gptData));
    
    if (!gptData.choices?.[0]?.message?.content) {
      throw new Error('Invalid response from OpenAI API');
    }

    // Parse and validate the response
    let metadata: MetadataResponse;
    try {
      const content = gptData.choices[0].message.content.trim();
      console.log('Content to parse:', content);
      
      // Attempt to extract JSON if it's wrapped in other text
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON object found in response');
      }
      
      const jsonString = jsonMatch[0];
      console.log('Extracted JSON:', jsonString);
      
      metadata = JSON.parse(jsonString);
      
      if (!validateMetadata(metadata)) {
        console.error('Invalid metadata format:', metadata);
        throw new Error('Invalid metadata format');
      }
    } catch (error) {
      console.error('Error parsing metadata:', error);
      throw new Error(`Failed to parse metadata response: ${error.message}`);
    }

    // Validate metadata fields
    if (metadata.seo_description.length > 160) {
      metadata.seo_description = metadata.seo_description.substring(0, 157) + '...';
    }

    console.log('Successfully generated metadata:', metadata);

    // Store metadata in database using service role key to bypass RLS
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
