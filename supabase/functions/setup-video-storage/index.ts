
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1';

// Define buckets to create
const BUCKETS = [
  { name: 'videos', public: true },
  { name: 'audio', public: true }
];

Deno.serve(async (req) => {
  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );

    const results = [];

    for (const bucket of BUCKETS) {
      try {
        // Check if bucket exists
        const { data: existingBuckets } = await supabaseClient.storage.listBuckets();
        const bucketExists = existingBuckets.some(b => b.name === bucket.name);
        
        if (!bucketExists) {
          // Create bucket
          const { data, error } = await supabaseClient.storage.createBucket(
            bucket.name,
            { public: bucket.public }
          );
          
          if (error) throw error;
          
          results.push({
            bucket: bucket.name,
            status: 'created',
            data
          });
          
          // Add policies to allow public access if public bucket
          if (bucket.public) {
            // Add policy for anonymous users to download files
            const { error: policyError } = await supabaseClient.rpc('create_storage_policy', {
              bucket_name: bucket.name,
              policy_name: `${bucket.name}_public_select`,
              definition: `bucket_id = '${bucket.name}'`,
              action: 'SELECT'
            });
            
            if (policyError) throw policyError;
          }
        } else {
          results.push({
            bucket: bucket.name,
            status: 'already exists'
          });
        }
      } catch (bucketError) {
        results.push({
          bucket: bucket.name,
          status: 'error',
          error: bucketError.message
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
