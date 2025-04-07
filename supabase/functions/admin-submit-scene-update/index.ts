import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts'; // Use the admin client
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Define the expected request body structure
interface UpdateRequestBody {
  project_id: string;
  scene_id: string;
  update_content: string;
  // update_type is missing from the frontend call, let's default it or make it optional
  update_type?: string;
}

console.log('Admin Submit Scene Update function initializing...');

serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Parse Request Body
    const body: UpdateRequestBody = await req.json();
    console.log('Received request body:', body);

    if (!body.project_id || !body.scene_id || !body.update_content) {
      return new Response(JSON.stringify({ error: 'Missing required fields: project_id, scene_id, update_content' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Create a Supabase client specific to this request's Authorization header
    // This allows us to check the user's authentication status and ID
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '', // Use anon key for user context client
      { global: { headers: { Authorization: authHeader } } }
    );

    // 3. Get the authenticated user ID
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error('Error getting user or no user found:', userError);
      return new Response(JSON.stringify({ error: 'Authentication failed' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = user.id;
    console.log('Authenticated user ID:', userId);

    // 4. Check if the user is an admin using the admin client
    // This assumes you have an 'admin_users' table with a 'user_id' column
    const { data: adminCheck, error: adminCheckError } = await supabaseAdmin
      .from('admin_users')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle(); // Use maybeSingle to handle null case gracefully

    if (adminCheckError) {
      console.error('Error checking admin status:', adminCheckError);
      return new Response(JSON.stringify({ error: 'Failed to verify admin status' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!adminCheck) {
      console.warn(`User ${userId} is not an admin.`);
      return new Response(JSON.stringify({ error: 'User is not authorized to perform this action' }), {
        status: 403, // Forbidden
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`User ${userId} verified as admin.`);

    // 5. Verify Foreign Keys using admin client
    console.log(`Verifying scene_id: ${body.scene_id}`);
    const { data: sceneCheck, error: sceneCheckError } = await supabaseAdmin
      .from('canvas_scenes')
      .select('id')
      .eq('id', body.scene_id)
      .maybeSingle();

    if (sceneCheckError) {
      console.error('Error verifying scene_id:', sceneCheckError);
      return new Response(JSON.stringify({ error: 'Failed to verify scene existence' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!sceneCheck) {
      console.error(`Scene ID ${body.scene_id} not found.`);
      return new Response(JSON.stringify({ error: `Scene ID ${body.scene_id} not found` }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    console.log(`Scene ID ${body.scene_id} verified.`);

    // Explicitly verify the user ID exists in auth.users table
    console.log(`Verifying user ID ${userId} exists in auth.users`);
    const { data: authUserCheck, error: authUserCheckError } = await supabaseAdmin
      .from('users') // Target the 'users' table within the 'auth' schema
      .select('id')
      .eq('id', userId)
      .maybeSingle(); // Use maybeSingle to handle null case

    if (authUserCheckError) {
        console.error('Error verifying user ID in auth.users:', authUserCheckError);
        return new Response(JSON.stringify({ error: 'Failed to verify user existence' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!authUserCheck) {
        console.error(`User ID ${userId} not found in auth.users.`);
        // This case should ideally not happen if auth.getUser() succeeded, but good to check.
        return new Response(JSON.stringify({ error: `User ID ${userId} not found` }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    console.log(`User ID ${userId} verified in auth.users.`);


    // 6. Insert the update using the admin client (bypasses RLS for insert)
    const insertData = {
      // project_id: body.project_id, // REMOVE THIS - Column doesn't exist in admin_scene_updates
      scene_id: body.scene_id,
      admin_user_id: userId, // Use the verified user ID
      update_content: body.update_content,
      update_type: body.update_type || 'other', // Default type if not provided
    };
    console.log('Inserting data into admin_scene_updates:', insertData);

    const { error: insertError } = await supabaseAdmin
      .from('admin_scene_updates')
      .insert(insertData);

    if (insertError) {
      // Log the full error object structure and specific potential properties
      console.error('Error inserting scene update (raw):', JSON.stringify(insertError, null, 2));
      console.error('Error details:', {
          message: insertError.message,
          code: insertError.code,
          details: insertError.details,
          hint: insertError.hint,
      });
      const errorMessage = insertError.message || 'Unknown database error during insert.';
      return new Response(JSON.stringify({ error: `Database error: ${errorMessage}` }), {
        status: 500, // Internal Server Error
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Scene update inserted successfully.');

    // 6. Return Success Response
    return new Response(JSON.stringify({ message: 'Scene update submitted successfully' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Unhandled error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});