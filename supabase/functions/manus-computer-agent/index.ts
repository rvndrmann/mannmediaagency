
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
    
    IMPORTANT: You MUST respond with a valid JSON object containing these fields:
    {
      "reasoning": "your thought process explanation", 
      "actions": [{"type": "action_type", ...action properties}]
    }
    
    Only use the following action types:
    - click: Click at specific coordinates or on an element (provide x, y or selector)
    - type: Type text (provide text)
    - navigate: Go to a URL (provide url)
    - press: Press specific keys (provide keys array)
    - select: Select an option from a dropdown (provide selector and value)
    
    If you're unable to perform the task or don't know what to do next, still respond with valid JSON:
    {
      "reasoning": "explanation of the limitation",
      "actions": []
    }
    
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
      IMPORTANT: You MUST respond with a valid JSON object containing:
      {
        "reasoning": "your detailed thought process",
        "actions": [{"type": "action_type", ...other properties}]
      }
      
      Even if you're unsure or can't complete the task, return a valid JSON with empty actions array.`
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
        model: "gpt-4o", // Using the vision-enabled model
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000,
        response_format: { type: "json_object" } // Ensure we get a valid JSON response
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
    
    // Log the entire response for debugging
    console.log("OpenAI API response:", JSON.stringify(openAIResponse, null, 2));
    
    const responseContent = openAIResponse.choices[0].message.content;
    console.log("Raw response content:", responseContent);
    
    // Parse the JSON response from the content
    let manusResponse: ManusResponse;
    try {
      // The response should be a valid JSON string now
      let parsedContent;
      
      try {
        parsedContent = JSON.parse(responseContent);
      } catch (parseError) {
        console.error("Failed to parse OpenAI response as JSON:", parseError);
        console.log("Invalid JSON content:", responseContent);
        
        // Fallback with a safe default response if parsing fails
        return new Response(
          JSON.stringify({
            reasoning: "Failed to parse AI response. The system encountered an error.",
            actions: [],
            error: "JSON parsing error: " + parseError.message
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Validate the structure of the parsed response
      if (!parsedContent.reasoning) {
        console.warn("Response missing reasoning field, adding default");
        parsedContent.reasoning = "No reasoning provided";
      }
      
      if (!Array.isArray(parsedContent.actions)) {
        console.warn("Response has invalid or missing actions array, using empty array");
        parsedContent.actions = [];
      }
      
      manusResponse = {
        actions: parsedContent.actions || [],
        reasoning: parsedContent.reasoning || "No reasoning provided",
        state: {
          current_url: requestData.current_url,
          screenshot: requestData.screenshot
        }
      };
      
      // Validate that the actions have the correct structure
      manusResponse.actions = manusResponse.actions.map(action => {
        // Ensure we have a valid action type
        if (!action.type) {
          console.warn("Action missing required 'type' property, skipping");
          return null;
        }
        
        // Return a cleansed action object
        return {
          type: action.type,
          ...(action.x !== undefined && { x: action.x }),
          ...(action.y !== undefined && { y: action.y }),
          ...(action.text !== undefined && { text: action.text }),
          ...(action.url !== undefined && { url: action.url }),
          ...(action.keys !== undefined && { keys: action.keys }),
          ...(action.selector !== undefined && { selector: action.selector }),
          ...(action.value !== undefined && { value: action.value }),
          ...(action.button !== undefined && { button: action.button }),
          ...(action.element !== undefined && { element: action.element }),
          ...(action.options !== undefined && { options: action.options })
        };
      }).filter(action => action !== null);
      
    } catch (error) {
      console.error("Error processing OpenAI response:", error);
      
      // Return a meaningful error response
      return new Response(
        JSON.stringify({ 
          error: "Failed to process OpenAI response", 
          details: error.message,
          raw_response: responseContent 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
      JSON.stringify({ 
        error: error.message || "Internal server error",
        stack: error.stack || null,
        reasoning: "The system encountered an error processing your request",
        actions: []
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
