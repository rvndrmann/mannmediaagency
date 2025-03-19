
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json'
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
  iframe_blocked?: boolean;
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
        { status: 500, headers: corsHeaders }
      );
    }

    // Create Supabase client for database operations
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Authenticate the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid Authorization header" }),
        { status: 401, headers: corsHeaders }
      );
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Authentication failed" }),
        { status: 401, headers: corsHeaders }
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
        { status: 500, headers: corsHeaders }
      );
    }
    
    // Check if user has sufficient credits
    if (!userCredits || userCredits.credits_remaining < 1) {
      return new Response(
        JSON.stringify({ error: "Insufficient credits. You need at least 1 credit to use the Computer Agent." }),
        { status: 403, headers: corsHeaders }
      );
    }
    
    // Parse request body
    const requestData: ManusRequest = await req.json();
    
    // Example of a valid response structure to show the AI
    const responseExample = {
      reasoning: "This is my reasoning for the next steps...",
      actions: [
        {
          type: "openNewTab",
          url: "https://example.com"
        }
      ]
    };
    
    // Make request to OpenAI API
    console.log("Sending request to OpenAI API");
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o", // Using the latest model
        messages: [
          {
            role: "system", 
            content: `You are an AI agent that helps users automate computer tasks in JSON format. 
            You are operating in a ${requestData.environment} environment.
            
            Your task is to: ${requestData.task}
            
            Based on the current state (URL and screenshot) and any previous actions, you should determine 
            the next step(s) to accomplish the task.
            
            BROWSER APPROACH: You are operating in a model where websites open in separate browser tabs:
            1. The user will interact with websites in separate browser tabs
            2. You can suggest to open websites and the system will open them in new tabs
            3. You analyze screenshots to understand what the user is seeing
            4. You provide guidance based on the screenshots and task context
            
            Use the following action types:
            - openNewTab: Open a URL in a new tab (provide url) - This is the PRIMARY navigation action
            - click: Suggest where to click (provide description)
            - type: Suggest text to type (provide description of where)
            - press: Suggest keys to press (provide keys array)
            - select: Suggest selection from a dropdown (provide details)
            
            IMPORTANT GUIDELINES:
            - When suggesting navigation, ALWAYS use "openNewTab" action
            - Be specific about what elements the user should interact with
            - Provide clear step-by-step guidance based on what you see in the screenshot
            - If you see a form, give specific instructions for filling it out
            - If you're unsure what's on screen, ask the user to take another screenshot
            
            RESPONSE FORMAT: Your response MUST be a valid JSON object with exactly these fields:
            1. "reasoning": A string explaining your thought process
            2. "actions": An array of action objects, each with a "type" field and appropriate parameters
            
            Example of valid JSON response format:
            ${JSON.stringify(responseExample, null, 2)}
            `
          },
          {
            role: "user",
            content: `Current task: ${requestData.task}
${requestData.current_url ? `Current URL: ${requestData.current_url}` : ""}

Please respond with valid JSON that includes a "reasoning" field and an "actions" array with at least one action that has a "type" property.`
          }
        ],
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
        { status: response.status, headers: corsHeaders }
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
            actions: [
              {
                type: "openNewTab",
                url: "https://www.google.com",
              }
            ]
          };
        }
      }
      
      // Validate the structure of the parsed response
      if (!parsedContent.reasoning) {
        console.warn("Response missing reasoning field, adding default");
        parsedContent.reasoning = "No reasoning provided";
      }
      
      if (!Array.isArray(parsedContent.actions)) {
        console.warn("Response has invalid or missing actions array, using default");
        parsedContent.actions = [
          {
            type: "openNewTab",
            url: "https://www.google.com"
          }
        ];
      } else if (parsedContent.actions.length === 0) {
        console.warn("Actions array is empty, adding default action");
        parsedContent.actions.push({
          type: "openNewTab",
          url: "https://www.google.com"
        });
      }
      
      // Ensure each action has a valid type
      parsedContent.actions = parsedContent.actions.map(action => {
        if (!action || typeof action !== 'object') {
          console.warn("Invalid action object, using default");
          return {
            type: "openNewTab",
            url: "https://www.google.com"
          };
        }
        
        if (!action.type) {
          console.warn("Action missing type, adding default type");
          action.type = "openNewTab";
          
          if (!action.url) {
            action.url = "https://www.google.com";
          }
        }
        
        return action;
      });
      
      manusResponse = {
        actions: parsedContent.actions || [],
        reasoning: parsedContent.reasoning || "No reasoning provided",
        state: {
          current_url: requestData.current_url,
          screenshot: requestData.screenshot
        }
      };
      
      // Validate and enhance action types
      manusResponse.actions = manusResponse.actions.map(action => {
        // If iframe is blocked, convert navigate actions to openNewTab
        if (requestData.iframe_blocked && action.type === "navigate" && action.url) {
          console.log("Converting navigate action to openNewTab due to iframe blocking");
          action.type = "openNewTab";
        }
        
        // Special handling for navigate and openNewTab actions - ensure URL is valid
        if ((action.type === "navigate" || action.type === "openNewTab") && action.url) {
          try {
            // Normalize URL
            if (!/^https?:\/\//i.test(action.url)) {
              action.url = `https://${action.url}`;
            }
            
            // Validate URL
            new URL(action.url);
          } catch (e) {
            // If URL is invalid, convert to a Google search
            console.warn("Invalid URL in action, converting to search:", action.url);
            action.url = `https://www.google.com/search?q=${encodeURIComponent(action.url)}`;
          }
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
      });
      
    } catch (error) {
      console.error("Error processing OpenAI response:", error);
      
      // Return a meaningful error response
      return new Response(
        JSON.stringify({ 
          error: "Failed to process OpenAI response", 
          details: error.message,
          raw_response: responseContent,
          reasoning: "The system encountered an error processing the AI response",
          actions: [
            {
              type: "openNewTab",
              url: "https://www.google.com"
            }
          ]
        }),
        { status: 500, headers: corsHeaders }
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
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Error in manus-computer-agent function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Internal server error",
        stack: error.stack || null,
        reasoning: "The system encountered an error processing your request",
        actions: [
          {
            type: "openNewTab",
            url: "https://www.google.com"
          }
        ]
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});
