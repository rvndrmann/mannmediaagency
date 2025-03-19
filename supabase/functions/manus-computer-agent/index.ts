
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
    
    // Enhanced system prompt with more detailed instructions
    let systemPrompt = `You are an AI agent that helps users automate computer tasks. 
    You are operating in a ${requestData.environment} environment.
    
    Your task is to: ${requestData.task}
    
    Based on the current state (URL and screenshot) and any previous actions, you should determine 
    the next step(s) to accomplish the task.
    
    BROWSER LIMITATIONS: You are operating in a browser environment which has certain limitations:
    1. Many sites block iframe embedding through security policies (X-Frame-Options)
    2. You cannot access cross-origin DOM content due to CORS restrictions
    3. You are limited to simple navigation, form filling, and clicking actions
    
    CRITICAL: You MUST respond with a VALID JSON object containing:
    {
      "reasoning": "your thought process explanation", 
      "actions": [{"type": "action_type", ...action properties}]
    }
    
    DO NOT include any markdown formatting, explanations, or any text outside of the JSON structure.
    DO NOT wrap your response in code blocks or quotes. Just output pure JSON.
    
    Use the following action types:
    - click: Click at specific coordinates or on an element (provide x, y or selector)
    - type: Type text (provide text)
    - navigate: Go to a URL (provide url) - Use for iframe navigation
    - press: Press specific keys (provide keys array)
    - select: Select an option from a dropdown (provide selector and value)
    - openNewTab: Open a URL in a new tab (provide url) - Use when a site likely blocks iframe embedding
    
    IMPORTANT NAVIGATION GUIDELINES:
    ${requestData.iframe_blocked ? 
      `- The current site is detected as blocking iframe embedding. You should use "openNewTab" action instead of "navigate" 
      for this site and similar sites (e-commerce, social media, productivity apps).` : 
      `- If you see a blank or white page in the screenshot, the site is likely blocking iframe embedding. 
      In this case, recommend using "openNewTab" instead of "navigate".`}
    
    - Google, Bing, DuckDuckGo, Wikipedia and many government/educational sites typically work well in iframes
    - Social media, e-commerce, and productivity sites (like Canva, Facebook, Amazon) typically block iframe embedding
    - When in doubt about whether a site works in iframes, use "openNewTab" action
    
    DETECTION STRATEGIES:
    - If the screenshot shows a completely blank/white page, the site is likely blocking iframe embedding
    - If you see any security error messages or "Refused to connect" messages, use "openNewTab" 
    - If the previous navigation action seemed to fail (same blank screen), suggest opening in a new tab
    
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
    
    if (requestData.iframe_blocked) {
      userMessage += `IMPORTANT: The current site appears to be blocking iframe embedding. You should use "openNewTab" action instead of "navigate" for this site.\n`;
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
    
    // Add vision analysis instructions
    if (requestData.screenshot) {
      messages.push({ 
        role: "user", 
        content: `Analyze the screenshot carefully. 
        - If you see an empty or blank white page, the site likely blocks iframe embedding. Suggest "openNewTab" action instead.
        - If you see error messages, read and interpret them.
        - Pay attention to form elements, buttons, and interactive elements.
        - Note any visible text content that might help complete the task.
        - Determine if the page seems to be loading correctly or if it appears to be blocked/empty.`
      });
    }
    
    // Add explicit iframe blocking detection prompt
    if (requestData.iframe_blocked) {
      messages.push({
        role: "user",
        content: `Based on the status, this site is blocking iframe embedding. Consider:
        1. Recommend opening this site in a new tab with "openNewTab" action
        2. Suggest alternative sites that typically work in iframes
        3. Provide a reasoning that explains the iframe limitation to the user`
      });
    }
    
    // Final instruction to get appropriate response format
    messages.push({
      role: "user", 
      content: `Based on what you see, what actions should I take next to accomplish the task? 
      IMPORTANT: You MUST respond with ONLY a valid JSON object containing:
      {
        "reasoning": "your detailed thought process",
        "actions": [{"type": "action_type", ...other properties}]
      }
      
      DO NOT add any explanatory text outside the JSON structure.
      DO NOT use code blocks, quotes or any other formatting.
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
        model: "gpt-4o", // Using the current model instead of deprecated models
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
        // Ensure we have a valid action type
        if (!action.type) {
          console.warn("Action missing required 'type' property, skipping");
          return null;
        }
        
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
      }).filter(action => action !== null);
      
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
