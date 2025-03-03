
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") as string;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Command interface based on our system
interface Command {
  feature: "product-shot-v1" | "product-shot-v2" | "image-to-video" | "product-video" | "default-image";
  action: "create" | "convert" | "save" | "use" | "list";
  parameters?: Record<string, any>;
  confidence?: number;
}

interface AutomationRule {
  id: string;
  name: string;
  description: string | null;
  trigger_keywords: string[];
  negative_keywords: string[];
  action: string;
  prompt_id: string;
  is_active: boolean;
  priority: number;
  required_credits: number;
}

interface AIPrompt {
  id: string;
  category: string;
  name: string;
  prompt_template: string;
  variables: Record<string, string>;
  requires_context: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return new Response(
        JSON.stringify({
          command: null,
          message: "Invalid request format",
          use_langflow: true,
          error: "Request parsing error"
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { message, activeContext, userCredits } = requestBody;
    
    if (!message) {
      console.error('Missing required field: message');
      return new Response(
        JSON.stringify({
          command: null,
          message: null,
          use_langflow: true,
          error: "Missing message"
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing message:', message.length > 100 ? `${message.substring(0, 100)}...` : message);
    console.log('Active context:', activeContext);
    console.log('User credits:', userCredits?.credits_remaining || 'Not provided');

    // Initialize Supabase client with service role key for admin operations
    let supabase;
    try {
      supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    } catch (supabaseError) {
      console.error('Error initializing Supabase client:', supabaseError);
      return new Response(
        JSON.stringify({
          command: null,
          message: null,
          use_langflow: true,
          error: "Supabase client initialization error"
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the JWT token from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.warn('No Authorization header provided');
      // We'll continue without user authentication for now
    }
    
    let user = null;
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        // Get user from token
        const { data: userData, error: userError } = await supabase.auth.getUser(token);
        if (!userError && userData?.user) {
          user = userData.user;
          console.log('Authenticated user:', user.id);
        } else {
          console.warn('Invalid user token or user not found:', userError);
        }
      } catch (authError) {
        console.error('Authentication error:', authError);
        // Continue as anonymous
      }
    }

    try {
      // Get active automation rules
      let rules;
      try {
        const { data, error } = await supabase
          .from('automation_rules')
          .select('*')
          .eq('is_active', true)
          .order('priority', { ascending: false });

        if (error) {
          console.error('Error fetching automation rules:', error);
          throw new Error('Failed to fetch automation rules');
        }
        
        rules = data || [];
      } catch (rulesError) {
        console.error('Error in rules fetch:', rulesError);
        return new Response(
          JSON.stringify({
            command: null,
            message: null,
            use_langflow: true,
            error: "Rules fetch error"
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // If we have no rules, skip to Langflow
      if (!rules || rules.length === 0) {
        console.log('No active automation rules found, proceeding to Langflow');
        return new Response(
          JSON.stringify({
            command: null,
            message: null,
            use_langflow: true
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Found ${rules.length} active automation rules`);

      // Check for rule matches based on keywords
      const matchedRules = rules.filter((rule: AutomationRule) => {
        // Check if any trigger keyword is present
        const hasTrigger = rule.trigger_keywords?.some(keyword => 
          message.toLowerCase().includes(keyword.toLowerCase())
        );
        
        // Check if any negative keyword is present
        const hasNegative = rule.negative_keywords?.some(keyword => 
          message.toLowerCase().includes(keyword.toLowerCase())
        );
        
        return hasTrigger && !hasNegative;
      });

      console.log(`Matched ${matchedRules.length} rules based on keywords`);

      // If we have rule matches, we need to verify with OpenAI
      let command: Command | null = null;
      let detectedIntent = null;
      
      if (matchedRules.length > 0) {
        const bestMatchedRule = matchedRules[0]; // Get highest priority rule
        
        try {
          // Get the prompt for this rule
          let prompt;
          try {
            const { data, error } = await supabase
              .from('ai_prompts')
              .select('*')
              .eq('id', bestMatchedRule.prompt_id)
              .single();
              
            if (error || !data) {
              console.error('Error fetching prompt:', error);
              throw new Error('Failed to fetch associated prompt');
            }
            
            prompt = data;
          } catch (promptError) {
            console.error('Prompt fetch error:', promptError);
            // Continue without the specific prompt
          }
          
          // Check if user has enough credits
          if (userCredits?.credits_remaining < bestMatchedRule.required_credits) {
            console.log('User has insufficient credits');
            return new Response(
              JSON.stringify({
                command: null,
                message: `I'm sorry, but you need at least ${bestMatchedRule.required_credits} credits to perform this action. You currently have ${userCredits?.credits_remaining || 0} credits.`,
                detected_rule: bestMatchedRule.name,
                error: "INSUFFICIENT_CREDITS"
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          // Now use OpenAI to help with intent detection
          if (OPENAI_API_KEY) {
            console.log('Using OpenAI to detect intent for: ', bestMatchedRule.name);
            
            // Create a system message based on the rule and context
            const systemMessage = `
You are an AI that detects user intents. Your task is to determine if the user message is asking for the following action:
"${bestMatchedRule.name}: ${bestMatchedRule.description || 'No description'}"

The user is currently using the ${activeContext || "AI Agent"} tool.

If you detect this intent, extract relevant parameters in JSON format. If not, respond with "NO_MATCH".
`;

            // Set up OpenAI request
            let openAIResponse;
            try {
              openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${OPENAI_API_KEY}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  model: 'gpt-4o-mini',
                  messages: [
                    { role: 'system', content: systemMessage },
                    { role: 'user', content: message }
                  ],
                  temperature: 0.3,
                }),
              });
              
              if (!openAIResponse.ok) {
                const errorText = await openAIResponse.text();
                console.error('OpenAI API error:', errorText);
                throw new Error(`OpenAI API error: ${openAIResponse.statusText}`);
              }
              
            } catch (openaiError) {
              console.error('OpenAI request error:', openaiError);
              // Continue with simpler detection method
              openAIResponse = null;
            }

            if (openAIResponse) {
              let openAIData;
              try {
                openAIData = await openAIResponse.json();
              } catch (jsonError) {
                console.error('Error parsing OpenAI response:', jsonError);
                openAIData = null;
              }
              
              if (openAIData?.choices?.[0]?.message?.content) {
                const aiResponseText = openAIData.choices[0].message.content;
                console.log('OpenAI detection response:', aiResponseText);

                // Check if we have a match
                if (!aiResponseText.includes('NO_MATCH')) {
                  detectedIntent = bestMatchedRule.name;
                  
                  // Try to extract parameters as JSON
                  let parameters = {};
                  try {
                    // Look for JSON structure in the response
                    const jsonMatch = aiResponseText.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                      parameters = JSON.parse(jsonMatch[0]);
                    }
                  } catch (err) {
                    console.warn('Could not parse parameters from OpenAI response:', err);
                  }
                  
                  // Map the rule action to our command format
                  const actionMap: Record<string, any> = {
                    'generate_photo': { feature: 'product-shot-v1', action: 'create' },
                    'generate_video': { feature: 'image-to-video', action: 'convert' },
                    'generate_metadata': { feature: 'default-image', action: 'save' },
                    'create_story': { feature: 'product-video', action: 'create' },
                    'none': { feature: 'default-image', action: 'list' }
                  };
                  
                  const mappedAction = actionMap[bestMatchedRule.action] || 
                                     { feature: 'product-shot-v1', action: 'create' };
                  
                  // Build the command object
                  command = {
                    ...mappedAction,
                    parameters: {
                      ...parameters,
                      autoGenerate: true,
                      ruleName: bestMatchedRule.name
                    },
                    confidence: 0.9
                  };
                  
                  // Record this automation in history
                  if (user) {
                    try {
                      await supabase
                        .from('automation_history')
                        .insert({
                          rule_id: bestMatchedRule.id,
                          user_message: message,
                          detected_intent: detectedIntent,
                          action_taken: bestMatchedRule.action,
                          success: true,
                          user_id: user.id,
                          credits_used: bestMatchedRule.required_credits,
                          metadata: { command, parameters }
                        });
                    } catch (historyError) {
                      console.error('Error recording automation history:', historyError);
                      // Non-critical error, continue
                    }
                  }
                } else {
                  console.log('OpenAI did not detect a match, falling back to Langflow');
                }
              }
            }
          } else {
            console.warn('OpenAI API Key not configured, using simpler detection method');
            
            // Use simple keyword matching as fallback
            detectedIntent = bestMatchedRule.name;
            
            // Map the rule action to our command format
            const actionMap: Record<string, any> = {
              'generate_photo': { feature: 'product-shot-v1', action: 'create' },
              'generate_video': { feature: 'image-to-video', action: 'convert' },
              'generate_metadata': { feature: 'default-image', action: 'save' },
              'create_story': { feature: 'product-video', action: 'create' },
              'none': { feature: 'default-image', action: 'list' }
            };
            
            const mappedAction = actionMap[bestMatchedRule.action] || 
                               { feature: 'product-shot-v1', action: 'create' };
            
            // Build a simple command
            command = {
              ...mappedAction,
              parameters: {
                prompt: message,
                autoGenerate: true,
                ruleName: bestMatchedRule.name
              },
              confidence: 0.7
            };
            
            // Record this automation
            if (user) {
              try {
                await supabase
                  .from('automation_history')
                  .insert({
                    rule_id: bestMatchedRule.id,
                    user_message: message,
                    detected_intent: detectedIntent,
                    action_taken: bestMatchedRule.action,
                    success: true,
                    user_id: user.id,
                    credits_used: bestMatchedRule.required_credits,
                    metadata: { command }
                  });
              } catch (historyError) {
                console.error('Error recording automation history:', historyError);
                // Non-critical error, continue
              }
            }
          }
        } catch (ruleProcessingError) {
          console.error('Error processing rule:', ruleProcessingError);
          // If rule processing fails, we'll continue to Langflow
        }
      }

      // If we detected a command, respond with it
      if (command) {
        return new Response(
          JSON.stringify({
            command,
            message: `I've detected you want to ${detectedIntent}. I'll help you with that right away.`,
            detected_rule: detectedIntent,
            use_langflow: false
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } catch (automationError) {
      console.error('Error in automation processing:', automationError);
      // We'll just log this and continue to Langflow
    }
    
    // Fall back to Langflow for regular chat
    return new Response(
      JSON.stringify({
        command: null,
        message: null,
        use_langflow: true
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in detect-command function:', error);
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        command: null,
        message: "Sorry, there was an error processing your request.",
        use_langflow: true // Fall back to Langflow on error
      }),
      {
        status: 200, // Use 200 even for errors to avoid UI disruption
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
