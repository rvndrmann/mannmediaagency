
import { serve } from "std/http/server.ts";
import { createClient } from '@supabase/supabase-js';

// Define types for the command
interface Command {
  feature: "product-shot-v1" | "product-shot-v2" | "image-to-video" | "product-video" | "default-image";
  action: "create" | "convert" | "save" | "use" | "list";
  parameters?: Record<string, any>;
}

// CORS headers for browser requests
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
    // Get supabase client using environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get request body
    const { command, userId } = await req.json();

    // Validate input
    if (!command || !command.feature || !command.action) {
      return new Response(
        JSON.stringify({ error: 'Invalid command structure' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Processing command: ${command.feature} - ${command.action}`, command.parameters);

    let result = null;

    // Process the command based on feature and action
    switch (command.feature) {
      case 'default-image':
        if (command.action === 'list') {
          // List default images for the user
          const { data, error } = await supabase
            .from('default_product_images')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

          if (error) throw error;
          result = { images: data };
        } 
        else if (command.action === 'use') {
          // Update last used timestamp for a default image
          if (!command.parameters?.imageId) {
            throw new Error('No image ID provided');
          }

          const { data, error } = await supabase
            .from('default_product_images')
            .update({ last_used_at: new Date().toISOString() })
            .eq('id', command.parameters.imageId)
            .eq('user_id', userId)
            .select()
            .single();

          if (error) throw error;
          result = { image: data };
        }
        else if (command.action === 'save') {
          // Save a new default image
          if (!command.parameters?.url || !command.parameters?.name) {
            throw new Error('Image URL and name are required');
          }

          const { data, error } = await supabase
            .from('default_product_images')
            .insert({
              url: command.parameters.url,
              name: command.parameters.name,
              context: command.parameters.context || 'product',
              user_id: userId
            })
            .select()
            .single();

          if (error) throw error;
          result = { image: data };
        }
        break;

      // Future implementations for other features
      case 'product-shot-v1':
      case 'product-shot-v2':
      case 'image-to-video':
      case 'product-video':
        // For now, just acknowledge the command
        result = { 
          acknowledged: true,
          message: `Command for ${command.feature} - ${command.action} received but not fully implemented yet.`
        };
        break;

      default:
        throw new Error(`Unsupported feature: ${command.feature}`);
    }

    // Return the result
    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing command:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
