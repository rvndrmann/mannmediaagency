import { serve } from "std/http/server.ts";
import { createClient } from '@supabase/supabase-js';

// Define types for the command
interface Command {
  feature: "product-shot-v1" | "product-shot-v2" | "image-to-video" | "product-video" | "default-image";
  action: "create" | "convert" | "save" | "use" | "list";
  parameters?: Record<string, any>;
}

interface RequestBody {
  command: Command;
}

serve(async (req) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });
  }

  try {
    // Get the API token from the Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing or invalid Authorization header' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Create Supabase client with service role key from env
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from token
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Parse request body
    const { command } = await req.json() as RequestBody;

    // Handle command based on feature and action
    let result;
    
    // Default image commands
    if (command.feature === 'default-image') {
      // Handle default image commands
      switch (command.action) {
        case 'list':
          // List all default images for the user
          const { data, error } = await supabase
            .from('default_product_images')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
            
          if (error) throw error;
          result = { images: data };
          break;
          
        case 'save':
          // Save an image as default
          if (!command.parameters?.url || !command.parameters?.name) {
            throw new Error('Missing required parameters: url and name');
          }
          
          const { data: saveData, error: saveError } = await supabase
            .from('default_product_images')
            .insert({
              url: command.parameters.url,
              name: command.parameters.name,
              context: command.parameters.context || 'product',
              user_id: user.id
            })
            .select()
            .single();
            
          if (saveError) throw saveError;
          result = { success: true, image: saveData };
          break;
          
        case 'use':
          // Update last_used_at timestamp for a default image
          if (!command.parameters?.id) {
            throw new Error('Missing required parameter: id');
          }
          
          const { data: updateData, error: updateError } = await supabase
            .from('default_product_images')
            .update({ last_used_at: new Date().toISOString() })
            .eq('id', command.parameters.id)
            .eq('user_id', user.id)
            .select()
            .single();
            
          if (updateError) throw updateError;
          result = { success: true, image: updateData };
          break;
          
        default:
          throw new Error(`Unknown action for default-image feature: ${command.action}`);
      }
    } else {
      return new Response(JSON.stringify({ error: 'Unsupported feature or action' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error processing command:', error);
    
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});
