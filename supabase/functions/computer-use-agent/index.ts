
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

interface ComputerUseRequest {
  taskDescription: string;
  environment: string;
  sessionId?: string;
  screenshot?: string;
  callId?: string;
  acknowledgedSafetyChecks?: Array<{
    id: string;
    code: string;
    message: string;
  }>;
  currentUrl?: string;
}

async function startNewSession(
  taskDescription: string, 
  environment: string,
  userId: string,
  supabase: any,
  screenshot?: string
) {
  try {
    // Create a new session in the database
    const { data: session, error: sessionError } = await supabase
      .from('computer_automation_sessions')
      .insert({
        user_id: userId,
        task_description: taskDescription,
        environment: environment
      })
      .select()
      .single();
    
    if (sessionError) {
      throw new Error(`Error creating session: ${sessionError.message}`);
    }

    // Make initial call to OpenAI
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "computer-use-preview",
        tools: [
          {
            type: "computer_use_preview",
            display_width: 1024,
            display_height: 768,
            environment: environment
          }
        ],
        input: [
          {
            role: "user",
            content: taskDescription
          },
          ...(screenshot ? [{
            type: "input_image",
            image_url: screenshot
          }] : [])
        ],
        reasoning: {
          generate_summary: "concise"
        },
        truncation: "auto"
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    
    // Process the response and save actions
    const computerCalls = data.output.filter((item: any) => item.type === "computer_call");
    const reasoningItems = data.output.filter((item: any) => item.type === "reasoning");
    
    if (computerCalls.length > 0) {
      const computerCall = computerCalls[0];
      const action = computerCall.action;
      const pendingSafetyChecks = computerCall.pending_safety_checks || [];
      
      // Save the action to the database
      const { data: actionData, error: actionError } = await supabase
        .from('computer_automation_actions')
        .insert({
          session_id: session.id,
          action_type: action.type,
          action_details: action,
          reasoning: reasoningItems.length > 0 ? JSON.stringify(reasoningItems) : null
        })
        .select()
        .single();
      
      if (actionError) {
        throw new Error(`Error creating action: ${actionError.message}`);
      }
      
      // Save any safety checks
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

    return {
      sessionId: session.id,
      responseId: data.id,
      output: data.output
    };
  } catch (error) {
    console.error("Error in startNewSession:", error);
    throw error;
  }
}

async function continueSession(
  sessionId: string,
  callId: string,
  screenshot: string,
  acknowledgedSafetyChecks: any[] = [],
  currentUrl?: string,
  supabase: any
) {
  try {
    // First, get the previous response ID
    const { data: actions, error: actionsError } = await supabase
      .from('computer_automation_actions')
      .select()
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (actionsError) {
      throw new Error(`Error fetching actions: ${actionsError.message}`);
    }
    
    if (!actions || actions.length === 0) {
      throw new Error("No previous actions found for this session");
    }
    
    // Update the previous action with the screenshot
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
    
    // Make call to OpenAI with computer_call_output
    const requestBody: any = {
      model: "computer-use-preview",
      tools: [
        {
          type: "computer_use_preview",
          display_width: 1024,
          display_height: 768,
          environment: actions[0].action_details.environment || "browser"
        }
      ],
      input: [
        {
          call_id: callId,
          type: "computer_call_output",
          output: {
            type: "input_image",
            image_url: screenshot
          }
        }
      ],
      truncation: "auto"
    };
    
    // Add currentUrl if provided
    if (currentUrl) {
      requestBody.input[0].current_url = currentUrl;
    }
    
    // Add acknowledged safety checks if any
    if (acknowledgedSafetyChecks && acknowledgedSafetyChecks.length > 0) {
      requestBody.input[0].acknowledged_safety_checks = acknowledgedSafetyChecks;
      
      // Update the safety checks in the database
      for (const check of acknowledgedSafetyChecks) {
        const { error: updateCheckError } = await supabase
          .from('computer_automation_safety_checks')
          .update({
            acknowledged: true,
            acknowledged_at: new Date().toISOString(),
            acknowledged_by: (await supabase.auth.getUser()).data.user.id
          })
          .eq('id', check.id);
        
        if (updateCheckError) {
          console.error(`Error updating safety check: ${updateCheckError.message}`);
        }
      }
    }
    
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    
    // Process the response and save actions
    const computerCalls = data.output.filter((item: any) => item.type === "computer_call");
    const reasoningItems = data.output.filter((item: any) => item.type === "reasoning");
    
    if (computerCalls.length > 0) {
      const computerCall = computerCalls[0];
      const action = computerCall.action;
      const pendingSafetyChecks = computerCall.pending_safety_checks || [];
      
      // Save the action to the database
      const { data: actionData, error: actionError } = await supabase
        .from('computer_automation_actions')
        .insert({
          session_id: sessionId,
          action_type: action.type,
          action_details: action,
          reasoning: reasoningItems.length > 0 ? JSON.stringify(reasoningItems) : null
        })
        .select()
        .single();
      
      if (actionError) {
        throw new Error(`Error creating action: ${actionError.message}`);
      }
      
      // Save any safety checks
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
      // If there are no more computer calls, mark the session as completed
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

    return {
      sessionId,
      responseId: data.id,
      output: data.output
    };
  } catch (error) {
    console.error("Error in continueSession:", error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
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
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get user ID from auth
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Parse request
    const request = await req.json() as ComputerUseRequest;
    
    let result;
    if (!request.sessionId) {
      // Starting a new session
      result = await startNewSession(
        request.taskDescription, 
        request.environment, 
        user.id,
        supabase,
        request.screenshot
      );
    } else {
      // Continuing an existing session
      if (!request.callId || !request.screenshot) {
        return new Response(
          JSON.stringify({ error: "Missing required parameters for session continuation" }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      result = await continueSession(
        request.sessionId,
        request.callId,
        request.screenshot,
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
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
