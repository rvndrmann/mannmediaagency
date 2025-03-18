
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Define API endpoints and environment variables
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || "";

interface ManusRequest {
  task: string;
  environment: string;
  screenshot?: string;
  current_url?: string;
  previous_actions?: ManusAction[];
}

interface ManusAction {
  type: string;
  x?: number;
  y?: number;
  text?: string;
  url?: string;
  element?: string;
  keys?: string[];
  button?: "left" | "right" | "middle";
  selector?: string;
  value?: string;
  options?: any;
}

interface ManusResponse {
  actions: ManusAction[];
  reasoning: string;
  state?: {
    current_url?: string;
    screenshot?: string;
    dom_state?: any;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate OpenAI API key
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key is not configured" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client for database operations
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Authenticate the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid Authorization header" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Authentication failed" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get user credits
    const { data: userCredits, error: creditsError } = await supabase
      .from("user_credits")
      .select("credits_remaining")
      .eq("user_id", user.id)
      .single();
    
    if (creditsError) {
      console.error("Error checking user credits:", creditsError);
      return new Response(
        JSON.stringify({ error: "Error checking user credits" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Check if user has sufficient credits
    if (!userCredits || userCredits.credits_remaining < 1) {
      return new Response(
        JSON.stringify({ error: "Insufficient credits. You need at least 1 credit to use the Computer Agent." }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Parse request body
    const requestData: ManusRequest = await req.json();
    
    // Prepare the context for OpenAI based on previous actions and current state
    let systemPrompt = `You are an AI agent that helps users automate computer tasks. 
    You are operating in a ${requestData.environment} environment.
    
    Your task is to: ${requestData.task}
    
    Based on the current state (URL and screenshot) and any previous actions, you should determine 
    the next step(s) to accomplish the task.
    
    Respond with:
    1. A brief reasoning explaining your thought process
    2. A list of specific computer actions to take
    
    Only use the following action types:
    - click: Click at specific coordinates or on an element (provide x, y or selector)
    - type: Type text (provide text)
    - navigate: Go to a URL (provide url)
    - press: Press specific keys (provide keys array)
    - select: Select an option from a dropdown (provide selector and value)
    
    Keep your actions concise and focused on the immediate next steps.`;

    let messages = [{ role: "system", content: systemPrompt }];
    
    // Add current state information
    let userMessage = `Current state:\n`;
    
    if (requestData.current_url) {
      userMessage += `URL: ${requestData.current_url}\n`;
    }
    
    if (requestData.screenshot) {
      userMessage += `Screenshot is available.\n`;
      
      // Add the screenshot as a base64 image for vision capabilities
      messages.push({
        role: "user",
        content: [
          { type: "text", text: userMessage },
          {
            type: "image_url",
            image_url: {
              url: requestData.screenshot,
              detail: "high"
            }
          }
        ]
      });
    } else {
      messages.push({ role: "user", content: userMessage });
    }
    
    // Add previous actions context if available
    if (requestData.previous_actions && requestData.previous_actions.length > 0) {
      let actionsMessage = `Previous actions:\n`;
      requestData.previous_actions.forEach((action, index) => {
        actionsMessage += `${index + 1}. Type: ${action.type}, `;
        
        if (action.x && action.y) actionsMessage += `Coords: (${action.x}, ${action.y}), `;
        if (action.text) actionsMessage += `Text: "${action.text}", `;
        if (action.url) actionsMessage += `URL: ${action.url}, `;
        if (action.keys) actionsMessage += `Keys: ${action.keys.join('+')}, `;
        if (action.selector) actionsMessage += `Selector: ${action.selector}, `;
        if (action.value) actionsMessage += `Value: ${action.value}, `;
        
        actionsMessage = actionsMessage.replace(/, $/, '\n');
      });
      
      messages.push({ role: "user", content: actionsMessage });
    }
    
    // Final instruction to get appropriate response format
    messages.push({
      role: "user", 
      content: `Based on what you see, what actions should I take next to accomplish the task? 
      Respond with a JSON object containing:
      1. "reasoning": A string explaining your thought process
      2. "actions": An array of action objects, each with "type" and other necessary properties`
    });

    // Make request to OpenAI API
    console.log("Sending request to OpenAI API");
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o", // Using the latest vision model to analyze screenshots
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });
    
    // Handle response from OpenAI API
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error from OpenAI API:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: `Error from OpenAI API: ${response.status}`, details: errorText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Parse response from OpenAI API
    const openAIResponse = await response.json();
    const responseContent = openAIResponse.choices[0].message.content;
    
    // Parse the JSON response from the content
    let manusResponse: ManusResponse;
    try {
      // The response might be a string containing JSON or directly a JSON object
      const parsedContent = typeof responseContent === 'string' 
        ? JSON.parse(responseContent) 
        : responseContent;
      
      manusResponse = {
        actions: parsedContent.actions || [],
        reasoning: parsedContent.reasoning || "No reasoning provided",
        state: {
          current_url: requestData.current_url,
          screenshot: requestData.screenshot
        }
      };
    } catch (error) {
      console.error("Error parsing OpenAI response:", error);
      
      // Attempt to extract actions and reasoning using regex if JSON parsing fails
      const actionsMatch = responseContent.match(/actions.*?[\[\{](.*?)[\]\}]/s);
      const reasoningMatch = responseContent.match(/reasoning.*?["'](.*?)["']/s);
      
      manusResponse = {
        actions: actionsMatch ? JSON.parse(`[${actionsMatch[1]}]`) : [],
        reasoning: reasoningMatch ? reasoningMatch[1] : "Failed to parse reasoning",
        state: {
          current_url: requestData.current_url,
          screenshot: requestData.screenshot
        }
      };
    }
    
    // If this is a new session (no previous actions), deduct 1 credit
    if (!requestData.previous_actions || requestData.previous_actions.length === 0) {
      await supabase
        .from("user_credits")
        .update({ credits_remaining: userCredits.credits_remaining - 1 })
        .eq("user_id", user.id);
        
      // Log the credit update
      await supabase
        .from("credit_update_logs")
        .insert({
          user_id: user.id,
          credits_before: userCredits.credits_remaining,
          credits_after: userCredits.credits_remaining - 1,
          status: "success",
          trigger_source: "manus_computer_agent"
        });
    }
    
    return new Response(
      JSON.stringify(manusResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error in manus-computer-agent function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
