
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
    const { storyId, additionalContext, customTitleTwist } = await req.json();
    
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

    if (storyError) throw storyError;

    // Prepare prompt for ChatGPT
    const prompt = `Given this story content: ${story.story}
    Additional context: ${additionalContext || ''}
    Custom title twist: ${customTitleTwist || ''}

    Please generate the following in a JSON format:
    1. SEO-friendly title incorporating the custom twist
    2. Compelling meta description (max 160 characters)
    3. Relevant keywords separated by commas
    4. Instagram hashtags (max 30)
    5. Thumbnail design prompt with bold text placement suggestions

    Format the response as a valid JSON object with these keys:
    {
      "seo_title": "",
      "seo_description": "",
      "keywords": "",
      "instagram_hashtags": "",
      "thumbnail_prompt": ""
    }`;

    // Call ChatGPT API
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a skilled SEO and social media expert.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    const gptData = await openAIResponse.json();
    const metadata = JSON.parse(gptData.choices[0].message.content);

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

    if (insertError) throw insertError;

    return new Response(JSON.stringify(metadata), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
