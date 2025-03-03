
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Command = {
  feature: 'product-shot-v1' | 'product-shot-v2' | 'image-to-video' | 'product-video' | 'default-image';
  action: 'create' | 'modify' | 'list' | 'delete' | 'use' | 'save' | 'convert';
  parameters: Record<string, any>;
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { command } = await req.json() as { command: Command };
    
    console.log("Received command:", JSON.stringify(command, null, 2));
    
    // Create a Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Process the command
    let result;
    
    switch(command.feature) {
      case 'default-image':
        result = await handleDefaultImageCommand(supabase, command);
        break;
      case 'product-shot-v1':
      case 'product-shot-v2':
        result = await handleProductShotCommand(supabase, command);
        break;
      case 'image-to-video':
        result = await handleImageToVideoCommand(supabase, command);
        break;
      case 'product-video':
        result = await handleProductVideoCommand(supabase, command);
        break;
      default:
        throw new Error(`Unknown feature: ${command.feature}`);
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: `Successfully executed ${command.action} for ${command.feature}`,
      result 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error("Error processing command:", error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function handleDefaultImageCommand(supabase, command: Command) {
  const { action, parameters } = command;
  
  switch(action) {
    case 'list':
      const { data: images, error: listError } = await supabase
        .from('default_product_images')
        .select('*')
        .eq('user_id', parameters.userId)
        .order('created_at', { ascending: false });
        
      if (listError) throw listError;
      return { images };
      
    case 'save':
      const { data: savedImage, error: saveError } = await supabase
        .from('default_product_images')
        .insert({
          url: parameters.imageUrl,
          name: parameters.name || 'Default Image',
          context: parameters.context || 'product',
          user_id: parameters.userId,
        })
        .select()
        .single();
        
      if (saveError) throw saveError;
      return { image: savedImage };
      
    case 'use':
      const { data: usedImage, error: useError } = await supabase
        .from('default_product_images')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', parameters.imageId)
        .select()
        .single();
        
      if (useError) throw useError;
      return { image: usedImage };
      
    case 'delete':
      const { error: deleteError } = await supabase
        .from('default_product_images')
        .delete()
        .eq('id', parameters.imageId);
        
      if (deleteError) throw deleteError;
      return { deleted: true };
      
    default:
      throw new Error(`Unknown action for default-image: ${action}`);
  }
}

async function handleProductShotCommand(supabase, command: Command) {
  // Implement product shot command handling
  // This would integrate with your existing product shot generation logic
  console.log("Product shot command received:", command);
  return { status: "Not yet implemented" };
}

async function handleImageToVideoCommand(supabase, command: Command) {
  // Implement image to video conversion command handling
  console.log("Image to video command received:", command);
  return { status: "Not yet implemented" };
}

async function handleProductVideoCommand(supabase, command: Command) {
  // Implement product video command handling
  console.log("Product video command received:", command);
  return { status: "Not yet implemented" };
}
