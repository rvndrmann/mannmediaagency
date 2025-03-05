
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

interface RequestBody {
  formId: string;
  formData: any;
  phoneNumber: string | null;
  imageUrls?: string[];
}

serve(async (req: Request) => {
  try {
    // Create a Supabase client with the Auth context of the logged in user
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const requestData: RequestBody = await req.json();
    const { formId, formData, phoneNumber, imageUrls = [] } = requestData;

    if (!formId) {
      return new Response(
        JSON.stringify({ error: "Form ID is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Ensure formData is properly stringified for database storage
    const submissionData = typeof formData === 'string' 
      ? formData 
      : JSON.stringify(formData);

    // Insert the form submission
    const { data, error } = await supabase
      .from("form_submissions")
      .insert({
        form_id: formId,
        submission_data: submissionData,
        phone_number: phoneNumber,
      })
      .select()
      .single();

    if (error) {
      console.error("Error saving form submission:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Handle any additional processing here, like storing image URLs or sending notifications

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in form submission function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
