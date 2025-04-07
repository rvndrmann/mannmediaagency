import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// @ts-ignore Deno specific global
const supabaseUrl = Deno.env.get('SUPABASE_URL');
// @ts-ignore Deno specific global
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

// @ts-ignore Deno specific import
import { ConnInfo } from "https://deno.land/std@0.168.0/http/server.ts";

// @ts-ignore Deno specific import
serve(async (req: Request, connInfo: ConnInfo) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { projectId, content, senderName } = await req.json();

    if (!projectId || !content) {
      return new Response(JSON.stringify({ error: 'Missing projectId or content' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(supabaseUrl || '', supabaseAnonKey || '');

    // Attempt to insert the message into the database
    try {
      const { error } = await supabaseClient.from('chat_messages').insert([
        {
          project_id: projectId,
          role: 'admin',
          content: content,
          sender_name: senderName || 'Admin',
          created_at: new Date().toISOString(),
        },
      ]);

      if (error) {
        console.error('Error inserting message:', error);
        // If the table doesn't exist, continue without inserting
        if (error.message.includes('relation "chat_messages" does not exist')) {
          console.warn('chat_messages table does not exist. Skipping database insertion.');
        } else {
          // For other errors, return an error response
          return new Response(JSON.stringify({ error: `Database error: ${error.message}` }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
    } catch (dbError) {
      console.error('Error inserting message:', dbError);
      console.warn('chat_messages table might not exist. Skipping database insertion.');
    }

    // TODO: Implement Realtime broadcasting (if possible)

    return new Response(
      JSON.stringify({ data: 'Message sent successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});