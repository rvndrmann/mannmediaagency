
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.26.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Parse request body
    const { formId, formData, phoneNumber, imageUrls } = await req.json();

    // Validate required data
    if (!formId || !formData) {
      return new Response(
        JSON.stringify({ error: "Form ID and form data are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if form exists and is active
    const { data: formExists, error: formError } = await supabaseClient
      .from("custom_order_forms")
      .select("id, is_active")
      .eq("id", formId)
      .single();

    if (formError || !formExists) {
      return new Response(
        JSON.stringify({ error: "Form not found or inactive" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!formExists.is_active) {
      return new Response(
        JSON.stringify({ error: "This form is no longer active" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Insert form submission
    const { data, error } = await supabaseClient
      .from("form_submissions")
      .insert({
        form_id: formId,
        submission_data: {
          ...formData,
          image_urls: imageUrls || []
        },
        phone_number: phoneNumber
      })
      .select()
      .single();

    if (error) {
      console.error("Error saving form submission:", error);
      return new Response(
        JSON.stringify({ error: "Failed to save form submission" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
