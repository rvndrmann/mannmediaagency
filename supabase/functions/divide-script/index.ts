import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { OpenAI } from "https://deno.land/x/openai@v4.52.7/mod.ts"; // Use Deno compatible OpenAI library
import { corsHeaders } from "../_shared/cors.ts";

// Ensure OPENAI_API_KEY is set in Supabase Edge Function secrets
const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
if (!openaiApiKey) {
  console.error("OPENAI_API_KEY environment variable not set.");
  // Consider throwing an error or returning a specific error response
}

const openai = new OpenAI({ apiKey: openaiApiKey });

serve(async (req: Request) => { // Add type for req
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // TODO: Add authentication check here if needed (e.g., check Supabase Auth header)

    const { script } = await req.json();
    if (!script) {
      return new Response(JSON.stringify({ error: "Missing script in request body" }), {
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


    // Construct the prompt for the AI
    const prompt = `
You are an AI assistant that divides a script into logical scenes and generates relevant data for each scene.

Below is the full script:
---
${script}
---

INSTRUCTIONS:
1. Analyze the script and divide it into logical scenes based on changes in location, time, or significant shifts in action/topic.
2. Create a JSON object containing a single key "scenes".
3. The value of "scenes" should be an array of objects, where each object represents one logical scene you identified.
4. Each scene object must have the following keys:
   - "scene_script": The text content of the script for this specific scene. Keep it concise and focused on the scene's action/dialogue.
   - "image_prompt": A descriptive image prompt suitable for generating a visual for this scene. Start with "Create a realistic, cinematic scene of...". Include key actions, characters (if any), setting, and mood.

Output must be ONLY the valid JSON object, with no introductory text or explanations. Ensure the JSON is properly formatted.

Example JSON structure:
{
  "scenes": [
    {
      "scene_script": "Text content for the first logical scene...",
      "image_prompt": "Create a realistic, cinematic scene of..."
    },
    {
      "scene_script": "Text content for the second logical scene...",
      "image_prompt": "Create a realistic, cinematic scene of..."
    }
    // ... more scenes
  ]
}
`;

    // Call OpenAI Chat Completion API
    const chatCompletion = await openai.chat.completions.create({
      model: "gpt-4o", // Or your preferred model
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.5,
    });

    const aiResponseContent = chatCompletion.choices[0]?.message?.content;

    if (!aiResponseContent) {
      throw new Error("AI response content is empty.");
    }

    // Parse and return the response (already validated as JSON by OpenAI)
    // No need to re-parse here if response_format is json_object
    // const parsedResponse = JSON.parse(aiResponseContent);

    return new Response(aiResponseContent, { // Return the raw JSON string
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: unknown) { // Type the error as unknown
    console.error("Error in divide-script function:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});