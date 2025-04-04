import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { OpenAI } from "https://deno.land/x/openai@v4.52.7/mod.ts";
import { corsHeaders } from "../_shared/cors.ts";
// Supabase client no longer needed here for fetching scene data

// Ensure OPENAI_API_KEY and SUPABASE_URL/SUPABASE_ANON_KEY are set in Supabase Edge Function secrets
const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
// No longer need Supabase URL/Key for fetching within this function
if (!openaiApiKey) {
console.error("Missing required environment variable OPENAI_API_KEY.");
}

const openai = new OpenAI({ apiKey: openaiApiKey });
// Remove Supabase client initialization

// Helper function to delay execution
// sleep function no longer needed as we removed Assistant polling

serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // TODO: Add authentication check here if needed

    // Read required data directly from the request body
    const { sceneScript, voiceOverText, customInstruction, context } = await req.json();

    // Validate required inputs (script or voice-over should exist)
    if (!sceneScript && !voiceOverText) {
       return new Response(JSON.stringify({ error: "Missing sceneScript or voiceOverText in request body" }), {
         headers: { ...corsHeaders, "Content-Type": "application/json" },
         status: 400,
       });
    }
     if (!openaiApiKey) {
       return new Response(JSON.stringify({ error: "OpenAI API key not configured on server" }), {
         headers: { ...corsHeaders, "Content-Type": "application/json" },
         status: 500,
       });
     }
    // No need to fetch scene data from DB anymore

    // Custom instruction is already extracted above

    // Construct the prompt for Chat Completion
    const systemPrompt = `You are an expert image prompt generator. Given scene details and specific instructions, create a single, detailed, and effective image prompt suitable for an AI image generator like Midjourney or DALL-E. Focus on visual elements, style, lighting, mood, and composition based on the provided context. Output ONLY the image prompt text, with no additional commentary or explanation.`;

    // Log the received custom instruction
    console.log(`Received customInstruction: ${customInstruction || "[Not Provided]"}`);

    const userPrompt = `
Generate an image prompt based on the following scene details and instructions:

Scene Script:
---
${sceneScript || "No script provided."}
---

Voice Over Text:
---
${voiceOverText || "No voice over text provided."}
---

${context ? `Additional Context:\n---\n${context}\n---` : ''}

Specific Instructions:
---
${customInstruction || "Generate a standard cinematic image prompt based on the script and voice-over."}
---

Output only the generated image prompt text.
`;

    // Log the final prompt being sent to OpenAI
    console.log("--- Sending User Prompt to OpenAI ---");
    console.log(userPrompt);
    console.log("------------------------------------");

    // Call OpenAI Chat Completion API
    const chatCompletion = await openai.chat.completions.create({
      model: "gpt-4o", // Or your preferred model
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7, // Adjust as needed
      max_tokens: 200, // Limit response length if desired
      n: 1,
      stop: null,
    });

    const generatedPrompt = chatCompletion.choices[0]?.message?.content?.trim();

    if (!generatedPrompt) {
      throw new Error("AI did not return a valid image prompt.");
    }

    // Return the generated prompt
    return new Response(JSON.stringify({ imagePrompt: generatedPrompt }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
    // Removed extra closing brace that was here

  } catch (error: unknown) {
    console.error("Error in generate-image-prompt function:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});