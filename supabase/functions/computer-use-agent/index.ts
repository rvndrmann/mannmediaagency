import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.1";
import { decode as decodeJWT } from "https://deno.land/x/djwt@v2.8/mod.ts";
import { OpenAI } from "https://esm.sh/openai@4.24.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

interface ComputerUseRequest {
  taskDescription?: string;
  environment?: string;
  sessionId?: string;
  callId?: string;
  screenshot?: string;
  acknowledgedSafetyChecks?: Array<{
    id: string;
    code: string;
    message: string;
  }>;
  currentUrl?: string;
  previousResponseId?: string;
}

async function getUserIdFromRequest(req: Request): Promise<string | null> {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Missing or invalid Authorization header');
      return null;
    }

    const token = authHeader.split(' ')[1];
    
    try {
      const payload = (await decodeJWT(token))[1];
      if (payload && payload.sub) {
        console.log('Extracted user ID from JWT:', payload.sub);
        return payload.sub as string;
      }
    } catch (jwtError) {
      console.error('Error decoding JWT:', jwtError);
    }
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error) {
      console.error('Error getting user from token:', error);
      return null;
    }
    
    if (user) {
      console.log('Got user from Supabase auth:', user.id);
      return user.id;
    }
    
    return null;
  } catch (error) {
    console.error('Error in getUserIdFromRequest:', error);
    return null;
  }
}

async function startNewSession(
  taskDescription: string, 
  environment: string,
  userId: string,
  supabase: any,
  screenshot?: string
) {
  try {
    console.log("Starting new session with task:", taskDescription, "environment:", environment);
    
    const { data: session, error: sessionError } = await supabase
      .from('computer_automation_sessions')
      .insert({
        user_id: userId,
        task_description: taskDescription,
        environment: environment,
        status: 'in_progress'
      })
      .select()
      .single();
    
    if (sessionError) {
      throw new Error(`Error creating session: ${sessionError.message}`);
    }

    if (!OPENAI_API_KEY) {
      throw new Error("OpenAI API key is not configured");
    }
    
    const openai = new OpenAI({
      apiKey: OPENAI_API_KEY
    });
    
    const payload: any = {
      model: "computer-use-preview",
      tools: [{
        type: "computer_use_preview",
        display_width: 1920,
        display_height: 1080,
        environment: environment
      }],
      input: [
        {
          role: "user",
          content: taskDescription
        }
      ],
      reasoning: {
        generate_summary: "concise",
      },
      truncation: "auto"
    };

    if (screenshot) {
      console.log("Including initial screenshot in OpenAI request");
      payload.input.push({
        type: "input_image",
        image_url: {
          url: screenshot
        }
      });
    }

    console.log("Sending request to OpenAI API:", JSON.stringify(payload, null, 2));
    const response = await openai.chat.completions.create(payload);
    
    console.log("OpenAI response received. Response ID:", response.id);
    
    const output = processOpenAIResponse(response);
    
    await supabase
      .from('computer_automation_sessions')
      .update({ 
        openai_response_id: response.id,
        last_updated: new Date().toISOString()
      })
      .eq('id', session.id);
    
    if (output.length > 0) {
      const computerCall = output.find(item => item.type === "computer_call");
      const reasoningItems = output.filter(item => item.type === "reasoning");
      
      if (computerCall) {
        const action = computerCall.action;
        const pendingSafetyChecks = computerCall.pending_safety_checks || [];
        
        const { data: actionData, error: actionError } = await supabase
          .from('computer_automation_actions')
          .insert({
            session_id: session.id,
            action_type: action.type,
            action_details: action,
            reasoning: reasoningItems.length > 0 ? JSON.stringify(reasoningItems) : null,
            call_id: computerCall.call_id,
            status: 'pending'
          })
          .select()
          .single();
        
        if (actionError) {
          throw new Error(`Error creating action: ${actionError.message}`);
        }
        
        for (const safetyCheck of pendingSafetyChecks) {
          const { error: safetyCheckError } = await supabase
            .from('computer_automation_safety_checks')
            .insert({
              session_id: session.id,
              action_id: actionData.id,
              check_type: safetyCheck.code,
              check_message: safetyCheck.message
            });
          
          if (safetyCheckError) {
            console.error(`Error creating safety check: ${safetyCheckError.message}`);
          }
        }
      }
    }

    return {
      sessionId: session.id,
      responseId: response.id,
      output: output
    };
  } catch (error) {
    console.error("Error in startNewSession:", error);
    throw error;
  }
}

function processOpenAIResponse(response: any) {
  console.log("Processing OpenAI response:", JSON.stringify(response, null, 2));
  const output = [];
  
  if (response.reasoning?.summary) {
    output.push({
      type: "reasoning",
      id: `reasoning-${Date.now()}`,
      summary: response.reasoning.summary
    });
  }
  
  if (response.output) {
    for (const item of response.output) {
      if (item.type === "text") {
        output.push({
          type: "text",
          text: item.text
        });
      } else if (item.type === "computer_interaction") {
        output.push({
          type: "computer_call",
          id: `call-${Date.now()}`,
          call_id: item.id || `interaction-${Date.now()}`,
          action: {
            type: item.action.type,
            ...(item.action.x !== undefined && { x: item.action.x }),
            ...(item.action.y !== undefined && { y: item.action.y }),
            ...(item.action.button !== undefined && { button: item.action.button }),
            ...(item.action.text !== undefined && { text: item.action.text }),
            ...(item.action.keys !== undefined && { keys: item.action.keys }),
            ...(item.action.scrollX !== undefined && { scrollX: item.action.scrollX }),
            ...(item.action.scrollY !== undefined && { scrollY: item.action.scrollY }),
            ...(item.action.url !== undefined && { url: item.action.url }),
            ...(item.action.element_id !== undefined && { element_id: item.action.element_id }),
          },
          pending_safety_checks: item.pending_safety_checks || [],
          status: "ready"
        });
      }
    }
  }
  
  return output;
}

async function continueSession(
  sessionId: string,
  callId: string,
  screenshot: string,
  previousResponseId: string,
  acknowledgedSafetyChecks: any[] = [],
  currentUrl?: string,
  supabase: any
) {
  try {
    console.log("Continuing session:", sessionId, "callId:", callId);
    
    const { data: sessionData, error: sessionError } = await supabase
      .from('computer_automation_sessions')
      .select('task_description, environment, openai_response_id')
      .eq('id', sessionId)
      .single();
      
    if (sessionError) {
      throw new Error(`Error fetching session: ${sessionError.message}`);
    }
    
    const { data: actions, error: actionsError } = await supabase
      .from('computer_automation_actions')
      .select()
      .eq('session_id', sessionId)
      .eq('call_id', callId)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (actionsError) {
      throw new Error(`Error fetching actions: ${actionsError.message}`);
    }
    
    if (actions && actions.length > 0) {
      const { error: updateError } = await supabase
        .from('computer_automation_actions')
        .update({
          screenshot_url: screenshot,
          status: 'executed',
          executed_at: new Date().toISOString()
        })
        .eq('id', actions[0].id);
      
      if (updateError) {
        console.error(`Error updating action: ${updateError.message}`);
      }
    }
    
    if (!OPENAI_API_KEY) {
      throw new Error("OpenAI API key is not configured");
    }
    
    const openai = new OpenAI({
      apiKey: OPENAI_API_KEY
    });
    
    const payload: any = {
      model: "computer-use-preview",
      previous_response_id: previousResponseId,
      tools: [{
        type: "computer_use_preview",
        display_width: 1920,
        display_height: 1080,
        environment: sessionData.environment
      }],
      input: [
        {
          call_id: callId,
          type: "computer_call_output",
          output: {
            type: "input_image",
            image_url: {
              url: screenshot
            }
          }
        }
      ],
      truncation: "auto"
    };
    
    if (currentUrl) {
      console.log("Including current URL in OpenAI request:", currentUrl);
      payload.input[0].output.current_url = currentUrl;
    }
    
    if (acknowledgedSafetyChecks && acknowledgedSafetyChecks.length > 0) {
      console.log("Including acknowledged safety checks:", acknowledgedSafetyChecks.map(check => check.code).join(', '));
      
      payload.input.push({
        role: "user",
        content: `I acknowledge the following safety concerns: ${acknowledgedSafetyChecks.map(check => check.message).join(', ')}`
      });
    }

    console.log("Sending request to OpenAI API:", JSON.stringify(payload, null, 2));
    const response = await openai.chat.completions.create(payload);
    
    console.log("OpenAI response received. Response ID:", response.id);
    
    await supabase
      .from('computer_automation_sessions')
      .update({ 
        openai_response_id: response.id,
        last_updated: new Date().toISOString()
      })
      .eq('id', sessionId);
    
    const output = processOpenAIResponse(response);
    
    if (output.length > 0) {
      const computerCall = output.find(item => item.type === "computer_call");
      const reasoningItems = output.filter(item => item.type === "reasoning");
      
      if (computerCall) {
        const action = computerCall.action;
        const pendingSafetyChecks = computerCall.pending_safety_checks || [];
        
        const { data: actionData, error: actionError } = await supabase
          .from('computer_automation_actions')
          .insert({
            session_id: sessionId,
            action_type: action.type,
            action_details: action,
            reasoning: reasoningItems.length > 0 ? JSON.stringify(reasoningItems) : null,
            call_id: computerCall.call_id,
            status: 'pending'
          })
          .select()
          .single();
        
        if (actionError) {
          throw new Error(`Error creating action: ${actionError.message}`);
        }
        
        for (const safetyCheck of pendingSafetyChecks) {
          const { error: safetyCheckError } = await supabase
            .from('computer_automation_safety_checks')
            .insert({
              session_id: sessionId,
              action_id: actionData.id,
              check_type: safetyCheck.code,
              check_message: safetyCheck.message
            });
          
          if (safetyCheckError) {
            console.error(`Error creating safety check: ${safetyCheckError.message}`);
          }
        }
      } else {
        const { error: sessionUpdateError } = await supabase
          .from('computer_automation_sessions')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', sessionId);
        
        if (sessionUpdateError) {
          console.error(`Error updating session: ${sessionUpdateError.message}`);
        }
      }
    }

    return {
      sessionId,
      responseId: response.id,
      output
    };
  } catch (error) {
    console.error("Error in continueSession:", error);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  if (!OPENAI_API_KEY) {
    return new Response(
      JSON.stringify({ error: "OpenAI API key is not configured" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const userId = await getUserIdFromRequest(req);
    
    if (!userId) {
      console.error("Authentication failed: No valid user ID found in request");
      return new Response(
        JSON.stringify({ error: "Authentication required. Please sign in to use this feature." }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log("Authenticated user:", userId);
    
    const request = await req.json() as ComputerUseRequest;
    
    let result;
    
    if (!request.sessionId) {
      if (!request.taskDescription || !request.environment) {
        return new Response(
          JSON.stringify({ error: "Missing required parameters for starting a new session" }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const { data: userCredits, error: creditsError } = await supabase
        .from("user_credits")
        .select("credits_remaining")
        .eq("user_id", userId)
        .single();
      
      if (creditsError) {
        console.error("Error fetching user credits:", creditsError);
        return new Response(
          JSON.stringify({ error: "Error fetching user credits" }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (!userCredits || userCredits.credits_remaining < 1) {
        return new Response(
          JSON.stringify({ error: "Insufficient credits. You need at least 1 credit to use the Computer Agent." }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      await supabase
        .from("user_credits")
        .update({ credits_remaining: userCredits.credits_remaining - 1 })
        .eq("user_id", userId);
      
      result = await startNewSession(
        request.taskDescription, 
        request.environment, 
        userId,
        supabase,
        request.screenshot
      );
    } else {
      if (!request.callId || !request.screenshot || !request.previousResponseId) {
        return new Response(
          JSON.stringify({ error: "Missing required parameters for session continuation" }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      result = await continueSession(
        request.sessionId,
        request.callId,
        request.screenshot,
        request.previousResponseId,
        request.acknowledgedSafetyChecks,
        request.currentUrl,
        supabase
      );
    }
    
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error in computer-use-agent function:", error);
    
    const errorMessage = error.message || "Unknown error";
    const isOpenAIError = errorMessage.includes("OpenAI") || 
                          errorMessage.includes("API") ||
                          error.status === 429 ||
                          error.status === 401;
    
    const status = isOpenAIError ? (error.status || 500) : 500;
    const errorResponse = {
      error: errorMessage,
      details: error.details || null,
      type: isOpenAIError ? "openai_error" : "server_error"
    };
    
    return new Response(
      JSON.stringify(errorResponse),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
