
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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
    const { messages } = await req.json();
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!openAIApiKey || !supabaseUrl || !supabaseServiceKey) {
      throw new Error('Required environment variables are not set');
    }

    // Initialize Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    // Check user credits
    const { data: userCredits, error: creditsError } = await supabase
      .from('user_credits')
      .select('credits_remaining')
      .eq('user_id', user.id)
      .single();

    if (creditsError || !userCredits) {
      throw new Error('Failed to fetch user credits');
    }

    if (userCredits.credits_remaining < 1) {
      throw new Error('Insufficient credits');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages,
        temperature: 1,
        max_tokens: 2048,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'OpenAI API request failed');
    }

    // Create a TransformStream to process the response
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let totalWords = 0;
    let fullMessage = '';

    const transform = new TransformStream({
      async transform(chunk, controller) {
        const text = decoder.decode(chunk);
        const lines = text.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content;
              if (content) {
                fullMessage += content;
                // Count words in the new content
                const newWords = content.trim().split(/\s+/).filter(Boolean).length;
                totalWords += newWords;
                
                // Forward the chunk to the client
                controller.enqueue(encoder.encode(line + '\n'));
              }
            } catch (e) {
              console.error('Error parsing chunk:', e);
            }
          }
        }
      },
      async flush(controller) {
        // Calculate credits to charge (1 credit per 1000 words, minimum 1 credit)
        const creditsToCharge = Math.max(1, Math.ceil(totalWords / 1000));
        
        // Insert chat usage record
        const { error: usageError } = await supabase
          .from('chat_usage')
          .insert({
            user_id: user.id,
            words_count: totalWords,
            credits_charged: creditsToCharge,
            message_content: fullMessage
          });

        if (usageError) {
          console.error('Error recording chat usage:', usageError);
        }

        // Update user credits
        const { error: updateError } = await supabase
          .from('user_credits')
          .update({ 
            credits_remaining: userCredits.credits_remaining - creditsToCharge 
          })
          .eq('user_id', user.id);

        if (updateError) {
          console.error('Error updating user credits:', updateError);
        }

        controller.terminate();
      }
    });

    return new Response(response.body?.pipeThrough(transform), {
      headers: { 
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
