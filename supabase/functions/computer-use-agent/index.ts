
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
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an AI assistant capable of controlling computers. You're going to help the user perform tasks in a ${environment} environment. When you need to interact with the computer, use the available computer_use_tool.`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: taskDescription
              },
              ...(screenshot ? [{
                type: "image_url",
                image_url: {
                  url: screenshot
                }
              }] : [])
            ]
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "computer_use_tool",
              description: "Perform actions on the computer",
              parameters: {
                type: "object",
                properties: {
                  action: {
                    type: "object",
                    properties: {
                      type: {
                        type: "string",
                        enum: ["keypress", "click", "moveMouse", "scroll", "typeText"],
                        description: "The type of action to perform"
                      },
                      x: {
                        type: "number",
                        description: "X coordinate for click or moveMouse actions"
                      },
                      y: {
                        type: "number",
                        description: "Y coordinate for click or moveMouse actions"
                      },
                      button: {
                        type: "string",
                        enum: ["left", "middle", "right"],
                        description: "Mouse button to use for click action"
                      },
                      text: {
                        type: "string",
                        description: "Text to type for typeText action"
                      },
                      keys: {
                        type: "array",
                        items: {
                          type: "string"
                        },
                        description: "Keys to press for keypress action"
                      },
                      scrollX: {
                        type: "number",
                        description: "Horizontal scroll amount"
                      },
                      scrollY: {
                        type: "number",
                        description: "Vertical scroll amount"
                      }
                    },
                    required: ["type"]
                  },
                  reasoning: {
                    type: "string",
                    description: "Explanation of why this action is being performed"
                  }
                },
                required: ["action", "reasoning"]
              }
            }
          }
        ],
        tool_choice: "auto"
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    
    // Process the response
    const output = processOpenAIResponse(data);
    
    // Save the first action if available
    if (output.length > 0) {
      const computerCall = output.find(item => item.type === "computer_call");
      const reasoningItems = output.filter(item => item.type === "reasoning");
      
      if (computerCall) {
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
    }

    return {
      sessionId: session.id,
      responseId: data.id,
      output: output
    };
  } catch (error) {
    console.error("Error in startNewSession:", error);
    throw error;
  }
}

function processOpenAIResponse(data) {
  const output = [];
  
  // Add any assistant text as a text item
  if (data.choices[0].message?.content) {
    output.push({
      type: "text",
      text: data.choices[0].message.content
    });
  }
  
  // Check for tool calls
  if (data.choices[0].message?.tool_calls && data.choices[0].message.tool_calls.length > 0) {
    const toolCall = data.choices[0].message.tool_calls[0];
    
    if (toolCall.function?.name === "computer_use_tool") {
      try {
        const args = JSON.parse(toolCall.function.arguments);
        
        // Add reasoning
        if (args.reasoning) {
          output.push({
            type: "reasoning",
            id: `reasoning-${Date.now()}`,
            summary: [
              {
                type: "summary_text",
                text: args.reasoning
              }
            ]
          });
        }
        
        // Add computer call
        output.push({
          type: "computer_call",
          id: `call-${Date.now()}`,
          call_id: toolCall.id,
          action: args.action,
          pending_safety_checks: [],
          status: "completed"
        });
      } catch (e) {
        console.error("Error parsing tool call arguments:", e);
      }
    }
  }
  
  return output;
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
    // First, get the previous action
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
    
    // Get session details
    const { data: sessionData, error: sessionError } = await supabase
      .from('computer_automation_sessions')
      .select('task_description, environment')
      .eq('id', sessionId)
      .single();
      
    if (sessionError) {
      throw new Error(`Error fetching session: ${sessionError.message}`);
    }
    
    // Make call to OpenAI
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an AI assistant capable of controlling computers. You're helping the user perform this task: "${sessionData.task_description}" in a ${sessionData.environment} environment. When you need to interact with the computer, use the available computer_use_tool.`
          },
          {
            role: "user", 
            content: [
              {
                type: "text",
                text: `I've performed the action you requested. Here's what I see now.${currentUrl ? ` Current URL: ${currentUrl}` : ''}`
              },
              {
                type: "image_url",
                image_url: {
                  url: screenshot
                }
              }
            ]
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "computer_use_tool",
              description: "Perform actions on the computer",
              parameters: {
                type: "object",
                properties: {
                  action: {
                    type: "object",
                    properties: {
                      type: {
                        type: "string",
                        enum: ["keypress", "click", "moveMouse", "scroll", "typeText"],
                        description: "The type of action to perform"
                      },
                      x: {
                        type: "number",
                        description: "X coordinate for click or moveMouse actions"
                      },
                      y: {
                        type: "number",
                        description: "Y coordinate for click or moveMouse actions"
                      },
                      button: {
                        type: "string",
                        enum: ["left", "middle", "right"],
                        description: "Mouse button to use for click action"
                      },
                      text: {
                        type: "string",
                        description: "Text to type for typeText action"
                      },
                      keys: {
                        type: "array",
                        items: {
                          type: "string"
                        },
                        description: "Keys to press for keypress action"
                      },
                      scrollX: {
                        type: "number",
                        description: "Horizontal scroll amount"
                      },
                      scrollY: {
                        type: "number",
                        description: "Vertical scroll amount"
                      }
                    },
                    required: ["type"]
                  },
                  reasoning: {
                    type: "string",
                    description: "Explanation of why this action is being performed"
                  }
                },
                required: ["action", "reasoning"]
              }
            }
          }
        ],
        tool_choice: "auto"
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    
    // Process the response
    const output = processOpenAIResponse(data);
    
    // Save new action if available
    if (output.length > 0) {
      const computerCall = output.find(item => item.type === "computer_call");
      const reasoningItems = output.filter(item => item.type === "reasoning");
      
      if (computerCall) {
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
    }

    return {
      sessionId,
      responseId: data.id,
      output
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
