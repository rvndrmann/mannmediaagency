
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.1";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Define API endpoints and environment variables
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || "";

interface BrowserRequest {
  task: string;
  screenshot?: string;
  current_url?: string;
  previous_actions?: BrowserAction[];
  session_id?: string;
}

interface BrowserAction {
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

interface BrowserResponse {
  actions: BrowserAction[];
  reasoning: string;
  state?: {
    current_url?: string;
    screenshot?: string;
    page_content?: string;
  };
  error?: string;
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
        JSON.stringify({ error: "Insufficient credits. You need at least 1 credit to use the Browser Automation." }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Parse request body
    const requestData: BrowserRequest = await req.json();
    
    // Enhanced system prompt with more detailed instructions
    let systemPrompt = `You are an AI agent that helps users automate browser tasks. Your goal is to analyze the current browser state and suggest the next actions to accomplish the user's task.
    
    Your task is to: ${requestData.task}
    
    Based on the current state (URL and screenshot) and any previous actions, determine the next step(s) to accomplish the task.
    
    CRITICAL: You MUST respond with a VALID JSON object containing:
    {
      "reasoning": "your thought process explanation", 
      "actions": [{"type": "action_type", ...action properties}]
    }
    
    DO NOT include any markdown formatting, explanations, or any text outside of the JSON structure.
    DO NOT wrap your response in code blocks or quotes. Just output pure JSON.
    
    Use the following action types:
    - click: Click at specific coordinates or on an element (provide x, y or selector)
    - type: Type text (provide text and optionally a selector)
    - openUrl: Go to a URL (provide url)
    - press: Press specific keys (provide keys array)
    - select: Select an option from a dropdown (provide selector and value)
    
    For click actions:
    - If you have a selector, prefer using it over coordinates
    - Example: {"type": "click", "selector": "#submit-button"}
    - Example: {"type": "click", "x": 200, "y": 300}
    
    For type actions:
    - Always provide the text to type
    - Optionally provide a selector to focus on first
    - Example: {"type": "type", "text": "Hello world", "selector": "#input-field"}
    
    For openUrl actions:
    - Provide a full URL including http(s)://
    - Example: {"type": "openUrl", "url": "https://www.google.com"}
    
    For press actions:
    - Provide an array of keys to press
    - Example: {"type": "press", "keys": ["Enter"]}
    - Example: {"type": "press", "keys": ["Control", "a"]}
    
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
      IMPORTANT: Respond with ONLY a valid JSON object containing:
      {
        "reasoning": "your detailed thought process",
        "actions": [{"type": "action_type", ...other properties}]
      }
      
      If you're unsure or can't complete the task, return a valid JSON with empty actions array and explain in the reasoning why.`
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
        model: "gpt-4o", // Updated to use the current model instead of the deprecated gpt-4-vision-preview
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
    let browserResponse: BrowserResponse;
    try {
      // Make sure we handle non-JSON responses gracefully
      let parsedContent;
      
      try {
        // Check if the response starts with text that might not be JSON
        const cleanedResponse = responseContent.trim();
        
        // Try to parse the response as JSON
        parsedContent = JSON.parse(cleanedResponse);
        console.log("Successful JSON parse:", JSON.stringify(parsedContent, null, 2));
        
      } catch (parseError) {
        console.error("Failed to parse OpenAI response as JSON:", parseError);
        console.log("Invalid JSON content:", responseContent);
        
        // Try to extract JSON using regex if the response contains text outside a JSON structure
        const jsonMatch = responseContent.match(/(\{[\s\S]*\})/);
        if (jsonMatch) {
          try {
            console.log("Attempting to extract JSON with regex:", jsonMatch[0]);
            parsedContent = JSON.parse(jsonMatch[0]);
            console.log("Successfully extracted JSON with regex");
          } catch (regexParseError) {
            console.error("Failed to extract JSON with regex:", regexParseError);
          }
        }
        
        // If we still don't have valid JSON, create a fallback response
        if (!parsedContent) {
          console.log("Using fallback response structure");
          parsedContent = {
            reasoning: "The AI model returned an invalid response format. " + 
                     "Original text: " + responseContent.substring(0, 100) + "...",
            actions: []
          };
        }
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
      
      browserResponse = {
        actions: parsedContent.actions || [],
        reasoning: parsedContent.reasoning || "No reasoning provided",
        state: {
          current_url: requestData.current_url
        }
      };
      
    } catch (error) {
      console.error("Error processing OpenAI response:", error);
      
      // Return a meaningful error response
      return new Response(
        JSON.stringify({ 
          error: "Failed to process OpenAI response", 
          details: error.message,
          raw_response: responseContent,
          reasoning: "The system encountered an error processing the AI response",
          actions: []
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // If this is a new session (no previous actions), deduct 1 credit
    if ((!requestData.previous_actions || requestData.previous_actions.length === 0) && 
        requestData.session_id) {
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
          trigger_source: "browser_automation"
        });
    }
    
    return new Response(
      JSON.stringify(browserResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error in browser-automation function:", error);
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
