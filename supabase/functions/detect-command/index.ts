
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(
  SUPABASE_URL || "",
  SUPABASE_SERVICE_ROLE_KEY || ""
);

// CORS headers for cross-origin requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Maps automation actions to specific commands
const actionCommandMap: Record<string, any> = {
  generate_photo: {
    feature: "product-shot-v1",
    params: {
      autoGenerate: true
    }
  },
  generate_video: {
    feature: "image-to-video",
    params: {
      autoGenerate: true
    }
  }
};

async function fetchAutomationRules() {
  try {
    const { data: rules, error } = await supabase
      .from('automation_rules')
      .select(`
        *,
        prompt:ai_prompts (*)
      `)
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (error) {
      console.error('Error fetching automation rules:', error);
      return [];
    }

    return rules || [];
  } catch (err) {
    console.error('Failed to fetch automation rules:', err);
    return [];
  }
}

async function checkMessageMatchesRule(message: string, rule: any) {
  // Check if any trigger keywords are present in the message
  const hasTriggerKeyword = rule.trigger_keywords.some((keyword: string) => 
    message.toLowerCase().includes(keyword.toLowerCase())
  );

  if (!hasTriggerKeyword) {
    return false;
  }

  // Check if any negative keywords are present in the message
  const hasNegativeKeyword = rule.negative_keywords && rule.negative_keywords.some((keyword: string) => 
    message.toLowerCase().includes(keyword.toLowerCase())
  );

  if (hasNegativeKeyword) {
    return false;
  }

  return true;
}

async function processRuleWithOpenAI(message: string, rule: any) {
  if (!rule.prompt || !rule.prompt.prompt_template) {
    console.log('Rule has no associated prompt template:', rule.name);
    return null;
  }

  try {
    // Call OpenAI to analyze the message with the prompt template
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: rule.prompt.prompt_template,
          },
          {
            role: "user",
            content: message,
          },
        ],
        temperature: 0.2,
        max_tokens: 300,
      }),
    });

    const data = await response.json();
    
    if (!data.choices || data.choices.length === 0) {
      console.error('Unexpected OpenAI response:', data);
      return null;
    }

    const content = data.choices[0].message.content;
    
    // If AI says NO_MATCH, this rule doesn't apply
    if (content.includes("NO_MATCH")) {
      console.log(`OpenAI concluded rule ${rule.name} doesn't match the message`);
      return null;
    }

    // Try to extract structured parameters from the AI response
    try {
      // Look for JSON format in the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const extractedParams = jsonMatch 
        ? JSON.parse(jsonMatch[0])
        : {};
      
      console.log('Extracted parameters:', extractedParams);
      return {
        rule,
        params: extractedParams
      };
    } catch (parseError) {
      console.error('Error parsing parameters from AI response:', parseError);
      console.log('Original AI response:', content);
      
      // Even if we can't parse parameters, the rule matched
      return {
        rule,
        params: {}
      };
    }
  } catch (err) {
    console.error('Error processing rule with OpenAI:', err);
    return null;
  }
}

async function logAutomationExecution(ruleId: string, userId: string, message: string, action: string, success: boolean, metadata: any = {}) {
  try {
    const { error } = await supabase
      .from('automation_history')
      .insert({
        rule_id: ruleId,
        user_id: userId,
        user_message: message,
        action_taken: action,
        success,
        metadata
      });

    if (error) {
      console.error('Error logging automation execution:', error);
    }
  } catch (err) {
    console.error('Failed to log automation execution:', err);
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Parse request
    const requestData = await req.json();
    const { message, activeContext, userCredits } = requestData;
    
    if (!message) {
      return new Response(
        JSON.stringify({ 
          error: "No message provided",
          use_langflow: true 
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400 
        }
      );
    }

    console.log("Command detection request:", { message: message.slice(0, 100) + "...", activeContext });

    // Step 1: Fetch automation rules from the database
    const automationRules = await fetchAutomationRules();
    console.log(`Fetched ${automationRules.length} automation rules`);

    // Early return if no rules found
    if (!automationRules || automationRules.length === 0) {
      console.log('No automation rules found, using Langflow');
      return new Response(
        JSON.stringify({ use_langflow: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user ID from auth context for history logging
    const auth = req.headers.get('Authorization')?.split('Bearer ')[1];
    let userId = 'anonymous';
    
    if (auth) {
      try {
        const { data: { user }, error } = await supabase.auth.getUser(auth);
        if (!error && user) {
          userId = user.id;
        }
      } catch (err) {
        console.error('Error getting user ID:', err);
      }
    }

    // Step 2: Check each rule for basic keyword match
    for (const rule of automationRules) {
      const basicMatch = await checkMessageMatchesRule(message, rule);
      
      if (basicMatch) {
        console.log(`Rule '${rule.name}' matched keywords`);
        
        // Check if user has enough credits
        const creditsRequired = rule.required_credits || 1;
        if (userCredits && userCredits.credits_remaining < creditsRequired) {
          return new Response(
            JSON.stringify({
              error: "INSUFFICIENT_CREDITS",
              message: `This action requires ${creditsRequired} credits, but you only have ${userCredits.credits_remaining}.`
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        // Step 3: Process with OpenAI to confirm intent and extract parameters
        const result = await processRuleWithOpenAI(message, rule);
        
        if (result) {
          // Step 4: Map the rule action to a specific command
          const commandTemplate = actionCommandMap[rule.action];
          
          if (!commandTemplate) {
            console.log(`No command template found for action '${rule.action}'`);
            continue;
          }
          
          // Create command by combining template with extracted parameters
          const command = {
            ...commandTemplate,
            parameters: {
              ...commandTemplate.params,
              ...result.params,
              prompt: result.params.product 
                ? `${result.params.product} ${result.params.style || ''} ${result.params.background || ''} ${result.params.color || ''}`
                : message
            }
          };
          
          // Step 5: Log the automation execution
          await logAutomationExecution(
            rule.id, 
            userId, 
            message, 
            rule.action, 
            true, 
            { command }
          );
          
          // Step 6: Return the command to be executed
          return new Response(
            JSON.stringify({
              command,
              message: `I'll create a ${result.params.product || 'product'} image for you.`,
              use_langflow: false
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // If no automation rule matched, fallback to Langflow
    console.log('No matching automation rule found, using Langflow');
    return new Response(
      JSON.stringify({ use_langflow: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in detect-command function:", error);
    return new Response(
      JSON.stringify({ error: error.message, use_langflow: true }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});
