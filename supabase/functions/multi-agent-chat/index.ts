// Add Supabase client import
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "./cors.ts";
// Assuming canvas-tools.ts might contain MCP interaction logic later
// import { formatCanvasProjectInfo, getCanvasTools } from "./canvas-tools.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || "";
const VIDEO_PROJECT_ASSISTANT_ID = Deno.env.get("VIDEO_PROJECT_ASSISTANT_ID") || "";
// Add Supabase Env Vars
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

if (!OPENAI_API_KEY) console.error("FATAL: OPENAI_API_KEY environment variable not set.");
if (!VIDEO_PROJECT_ASSISTANT_ID) console.error("FATAL: VIDEO_PROJECT_ASSISTANT_ID environment variable not set.");
if (!SUPABASE_URL) console.error("FATAL: SUPABASE_URL environment variable not set.");
if (!SUPABASE_SERVICE_ROLE_KEY) console.error("FATAL: SUPABASE_SERVICE_ROLE_KEY environment variable not set.");


// --- Tool Implementation ---
// Initialize Supabase client within the function scope or globally if safe
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function get_project_details_tool(projectId: string): Promise<string> {
  console.log(`[TOOL] Executing get_project_details for project: ${projectId}`);
  try {
    // Fetch project details and associated scenes
    // Adjust table names ('canvas_projects', 'scenes') and columns as per your schema
    const { data: projectData, error: projectError } = await supabaseAdmin
      .from('canvas_projects') // Adjust table name
      .select(`
        *,
        scenes ( * )
      `)
      .eq('id', projectId)
      .single(); // Use single() if projectId is unique

    if (projectError) {
      console.error(`[TOOL ERROR] Supabase error fetching project ${projectId}:`, projectError);
      return JSON.stringify({ error: `Failed to fetch project: ${projectError.message}` });
    }

    if (!projectData) {
      return JSON.stringify({ error: "Project not found" });
    }

    // Format details as needed for the assistant (e.g., limit scene details)
    const formattedDetails = {
        ...projectData,
        scenes: projectData.scenes?.map((scene: any) => ({ id: scene.id, title: scene.title })) || [] // Example formatting
    };

    return JSON.stringify(formattedDetails);

  } catch (err) {
    console.error(`[TOOL ERROR] Unexpected error in get_project_details_tool for ${projectId}:`, err);
    return JSON.stringify({ error: `Unexpected error: ${err.message}` });
  }
}

async function update_project_title_tool(projectId: string, newTitle: string): Promise<string> {
  console.log(`[TOOL] Executing update_project_title for project: ${projectId} with title: ${newTitle}`);
  try {
    // Update the project title
    // Adjust table name ('canvas_projects') and column ('title') as per your schema
    const { data, error } = await supabaseAdmin
      .from('canvas_projects') // Adjust table name
      .update({ title: newTitle }) // Adjust column name
      .eq('id', projectId)
      .select() // Select to confirm the update
      .single(); // Assuming update on unique ID

    if (error) {
      console.error(`[TOOL ERROR] Supabase error updating title for project ${projectId}:`, error);
      return JSON.stringify({ error: `Failed to update title: ${error.message}` });
    }

    if (!data) {
        // This might happen if the project ID didn't exist
         return JSON.stringify({ error: "Project not found or update failed." });
    }

    return JSON.stringify({ success: true, message: `Project title updated to "${newTitle}"`, updatedProject: data });

  } catch (err) { // <-- Added (err) parameter
    console.error(`[TOOL ERROR] Unexpected error in update_project_title_tool for ${projectId}:`, err);
    return JSON.stringify({ error: `Unexpected error: ${err.message}` }); // <-- Corrected return
  }
}

// Add this new tool implementation function
async function get_script_tool(projectId: string): Promise<string> {
  console.log(`[TOOL] Executing get_script for project: ${projectId}`);
  try {
    // Fetch the full script for the project
    // Adjust table name ('canvas_projects') and column ('full_script') as per your schema
    const { data, error } = await supabaseAdmin
      .from('canvas_projects') // Adjust table name
      .select('full_script')   // Adjust column name
      .eq('id', projectId)
      .single();

    if (error) {
      console.error(`[TOOL ERROR] Supabase error fetching script for project ${projectId}:`, error);
      return JSON.stringify({ error: `Failed to fetch script: ${error.message}` });
    }

    if (!data || !data.full_script) { // Check if data or script exists
      return JSON.stringify({ error: "Script not found for this project." });
    }

    // Return only the script content
    return JSON.stringify({ script: data.full_script });

  } catch (err) {
    console.error(`[TOOL ERROR] Unexpected error in get_script_tool for ${projectId}:`, err);
    return JSON.stringify({ error: `Unexpected error: ${err.message}` }); // <-- Corrected return
  }
}
// --- End Tool Implementation ---

// Interface for Tool Output submission
interface ToolOutput {
  tool_call_id: string;
  output: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests (keep existing logic)
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: new Headers(corsHeaders),
    });
  }

  const requestId = crypto.randomUUID();
  console.log(`[INFO] [${requestId}] Received new request `);

  try {
    // Get request body (keep existing parsing)
    const requestData = await req.json();
    const {
      input,
      // agentType = "main", // Less relevant with single Assistant initially
      // conversationHistory = [], // Handled by Thread
      // usePerformanceModel = false, // Model defined in Assistant
      projectId,
      // sceneId, // May be needed for context or specific tools later
      thread_id, // <-- Expect thread_id from frontend
    } = requestData;

    if (!input) {
        throw new Error("Input message is required.");
    }
    if (!VIDEO_PROJECT_ASSISTANT_ID) {
        throw new Error("VIDEO_PROJECT_ASSISTANT_ID is not configured.");
    }

    // Extract user ID (keep existing logic)
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.split("Bearer ")[1];
    const userId = token ? extractUserIdFromJWT(token) : "anonymous";

    console.log(`[INFO] [${requestId}] Processing request for user ${userId}`, {
      projectId,
      threadIdProvided: !!thread_id,
      inputLength: input?.length || 0,
    });

    let currentThreadId = thread_id;

    // 1. Ensure Thread Exists
    if (!currentThreadId) {
      console.log(`[INFO] [${requestId}] No thread_id provided, creating new thread.`);
      const threadResponse = await fetch("https://api.openai.com/v1/threads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "OpenAI-Beta": "assistants=v2", // Use Assistants v2
        },
        body: JSON.stringify({
          metadata: { // Optionally store project_id here if needed globally for the thread
             project_id: projectId,
             user_id: userId
          }
        })
      });
      if (!threadResponse.ok) {
        const errorData = await threadResponse.json();
        throw new Error(`Failed to create thread: ${JSON.stringify(errorData)}`);
      }
      const newThread = await threadResponse.json();
      currentThreadId = newThread.id;
      console.log(`[INFO] [${requestId}] Created new thread: ${currentThreadId}`);
    } else {
       console.log(`[INFO] [${requestId}] Using existing thread: ${currentThreadId}`);
       // Optionally update thread metadata if project context changes
       // await fetch(`https://api.openai.com/v1/threads/${currentThreadId}`, { ... method: 'POST', body: JSON.stringify({ metadata: { project_id: projectId }})})
    }

    // 2. Add User Message to Thread
    console.log(`[INFO] [${requestId}] Adding message to thread ${currentThreadId}`);
    const messageResponse = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "OpenAI-Beta": "assistants=v2",
      },
      body: JSON.stringify({
        role: "user",
        content: input,
        // attachments: [] // Add attachment handling if needed later
      }),
    });
    if (!messageResponse.ok) {
      const errorData = await messageResponse.json();
      throw new Error(`Failed to add message: ${JSON.stringify(errorData)}`);
    }
    // const addedMessage = await messageResponse.json(); // We don't strictly need the response object here

    // 3. Create a Run
    console.log(`[INFO] [${requestId}] Creating run on thread ${currentThreadId} with assistant ${VIDEO_PROJECT_ASSISTANT_ID}`);
    const runResponse = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/runs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "OpenAI-Beta": "assistants=v2",
      },
      body: JSON.stringify({
        assistant_id: VIDEO_PROJECT_ASSISTANT_ID,
        // instructions: "Override assistant instructions here if needed",
        // model: "Override model here if needed",
        metadata: { // Pass per-run context if needed (e.g., if project changes mid-thread)
            project_id: projectId,
            request_id: requestId,
            user_id: userId
        },
        // tools: [] // Override tools here if needed dynamically
      }),
    });
    if (!runResponse.ok) {
      const errorData = await runResponse.json();
      throw new Error(`Failed to create run: ${JSON.stringify(errorData)}`);
    }
    let run = await runResponse.json();
    console.log(`[INFO] [${requestId}] Run created: ${run.id}, Status: ${run.status}`);

    // 4. Poll Run Status and Handle Actions
    const terminalStates = ["completed", "failed", "cancelled", "expired"];
    const pollingStartTime = Date.now();
    const maxPollingDuration = 120000; // 2 minutes timeout

    while (!terminalStates.includes(run.status)) {
       // Check for timeout
       if (Date.now() - pollingStartTime > maxPollingDuration) {
           console.error(`[ERROR] [${requestId}] Run polling timed out after ${maxPollingDuration / 1000}s for run ${run.id}`);
           // Attempt to cancel the run
           try {
               await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/runs/${run.id}/cancel`, {
                   method: "POST",
                   headers: {
                       "Authorization": `Bearer ${OPENAI_API_KEY}`,
                       "OpenAI-Beta": "assistants=v2",
                   }
               });
           } catch (cancelError) {
               console.error(`[ERROR] [${requestId}] Failed to cancel timed out run ${run.id}:`, cancelError);
           }
           throw new Error("Run processing timed out.");
       }

      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before polling again

      console.log(`[INFO] [${requestId}] Polling run ${run.id}...`);
      const retrieveRunResponse = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/runs/${run.id}`, {
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "OpenAI-Beta": "assistants=v2",
        },
      });
      if (!retrieveRunResponse.ok) {
         const errorData = await retrieveRunResponse.json();
         // Handle potential 404 if run expires quickly or other errors
         console.error(`[ERROR] [${requestId}] Failed to retrieve run ${run.id}: ${JSON.stringify(errorData)}`);
         // Decide if this is a retryable error or should fail the request
         if (retrieveRunResponse.status === 404) {
             throw new Error(`Run ${run.id} not found. It might have expired or been cancelled.`);
         }
         // Continue polling for some errors, or throw for others
         await new Promise(resolve => setTimeout(resolve, 2000)); // Longer wait on error?
         continue; // Or throw based on error type
      }
      run = await retrieveRunResponse.json();
      console.log(`[INFO] [${requestId}] Run ${run.id} Status: ${run.status}`);

      if (run.status === "requires_action" && run.required_action?.type === "submit_tool_outputs") {
        const toolCalls = run.required_action.submit_tool_outputs.tool_calls;
        console.log(`[INFO] [${requestId}] Run ${run.id} requires action: ${toolCalls.length} tool call(s)`);

        const toolOutputs: ToolOutput[] = []; // Explicitly type the array

        for (const toolCall of toolCalls) {
          const functionName = toolCall.function.name;
          const args = JSON.parse(toolCall.function.arguments || "{}");
          let output = "";
          let toolExecuted = false;

          console.log(`[INFO] [${requestId}] Executing tool: ${functionName}`, args);

          try {
            // --- Tool Execution Logic ---
            if (functionName === "get_project_details") {
              // Ensure projectId is available, potentially from run metadata or args
              const toolProjectId = args.projectId || run.metadata?.project_id || projectId;
              if (!toolProjectId) {
                  output = JSON.stringify({ error: "Project ID is missing for get_project_details" });
              } else {
                  output = await get_project_details_tool(toolProjectId);
                  toolExecuted = true;
              }
            } else if (functionName === "update_project_title") {
              const toolProjectId = args.projectId || run.metadata?.project_id || projectId;
              const newTitle = args.newTitle;
               if (!toolProjectId || !newTitle) {
                   output = JSON.stringify({ error: "Project ID or new title is missing for update_project_title" });
               } else {
                   output = await update_project_title_tool(toolProjectId, newTitle);
                   toolExecuted = true;
               }
            }
            // +++ Add get_script tool execution +++
            else if (functionName === "get_script") {
              const toolProjectId = args.projectId || run.metadata?.project_id || projectId;
              if (!toolProjectId) {
                  output = JSON.stringify({ error: "Project ID is missing for get_script" });
              } else {
                  output = await get_script_tool(toolProjectId);
                  toolExecuted = true;
              }
            }
            // +++ End add get_script tool execution +++
            else {
              console.warn(`[WARN] [${requestId}] Unimplemented tool called: ${functionName}`);
              output = JSON.stringify({ error: `Tool '${functionName}' is not implemented.` });
            }
          } catch (toolError) {
             console.error(`[ERROR] [${requestId}] Error executing tool ${functionName}:`, toolError);
             output = JSON.stringify({ error: `Error executing tool ${functionName}: ${toolError.message}` });
          }

          console.log(`[INFO] [${requestId}] Tool ${functionName} output:`, output);
          toolOutputs.push({
            tool_call_id: toolCall.id,
            output: output,
          });
        } // end for loop over toolCalls

        // Submit tool outputs
        console.log(`[INFO] [${requestId}] Submitting ${toolOutputs.length} tool output(s) for run ${run.id}`);
        const submitOutputsResponse = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/runs/${run.id}/submit_tool_outputs`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${OPENAI_API_KEY}`,
            "OpenAI-Beta": "assistants=v2",
          },
          body: JSON.stringify({
            tool_outputs: toolOutputs,
          }),
        });

        if (!submitOutputsResponse.ok) {
          const errorData = await submitOutputsResponse.json();
          // Handle potential race conditions or other errors
          console.error(`[ERROR] [${requestId}] Failed to submit tool outputs for run ${run.id}: ${JSON.stringify(errorData)}`);
          // Decide how to proceed - maybe retry submission, maybe fail the run
          if (submitOutputsResponse.status === 400 && errorData.code === 'invalid_state') {
              console.warn(`[WARN] [${requestId}] Run ${run.id} was likely no longer in 'requires_action' state when submitting outputs. Continuing polling.`);
              // The run might have moved on (e.g., expired, cancelled). Continue polling to see final state.
          } else {
              throw new Error(`Failed to submit tool outputs: ${JSON.stringify(errorData)}`);
          }
        } else {
           console.log(`[INFO] [${requestId}] Tool outputs submitted successfully for run ${run.id}.`);
           // Run status will change, continue polling
        }
      } // end if requires_action
    } // end while polling loop

    // 5. Process Final Run State
    let responseContent = "An unexpected error occurred."; // Default error message
    let finalMessages = [];

    if (run.status === "completed") {
      console.log(`[INFO] [${requestId}] Run ${run.id} completed. Fetching messages...`);
      // Fetch the latest messages added by the assistant in this run
      const messagesListResponse = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/messages?order=desc&run_id=${run.id}`, {
          headers: {
              "Authorization": `Bearer ${OPENAI_API_KEY}`,
              "OpenAI-Beta": "assistants=v2",
          },
      });

      if (!messagesListResponse.ok) {
          const errorData = await messagesListResponse.json();
          console.error(`[ERROR] [${requestId}] Failed to list messages for run ${run.id}: ${JSON.stringify(errorData)}`);
          // Fallback or throw error
          responseContent = "Failed to retrieve the final response.";
      } else {
          const messageList = await messagesListResponse.json();
          finalMessages = messageList.data.filter((msg: any) => msg.run_id === run.id && msg.role === 'assistant');

          if (finalMessages.length > 0) {
              // Combine content from potentially multiple assistant messages in the run
              responseContent = finalMessages
                  .map((msg: any) =>
                      msg.content
                          .filter((contentItem: any) => contentItem.type === 'text')
                          .map((textContent: any) => textContent.text.value)
                          .join('\n')
                  )
                  .join('\n');
               console.log(`[INFO] [${requestId}] Assistant response(s):`, responseContent);
          } else {
              console.warn(`[WARN] [${requestId}] Run ${run.id} completed but no assistant messages found for this run.`);
              responseContent = "[The assistant completed the task but provided no text response.]";
          }
      }
    } else {
      // Handle failed, cancelled, expired states
      console.error(`[ERROR] [${requestId}] Run ${run.id} finished with status: ${run.status}`, run.last_error);
      responseContent = `The request could not be completed. Status: ${run.status}.`;
      if (run.last_error) {
          responseContent += ` Error: ${run.last_error.message}`;
      }
       // Consider throwing an HTTP error status code here instead of 200 OK
       // For now, returning error message in content
    }

    // 6. Return Response to Frontend
    const responsePayload = {
      // role: "assistant", // Role is implicit in the message content structure
      content: responseContent,
      // agentType: "VideoProjectAssistant", // Can add if needed
      thread_id: currentThreadId, // Return thread_id (especially if newly created)
      run_id: run.id,
      // handoffRequest: null, // Handoff logic needs rethinking with Assistants
      // command: null, // Command logic needs rethinking
      // Include any other relevant data for the frontend
    };

    return new Response(JSON.stringify(responsePayload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: run.status === "completed" ? 200 : 500 // Return 500 for failed runs? Adjust as needed.
    });

  } catch (error) {
    console.error(`[ERROR] [${requestId}] Error in multi-agent-chat handler: ${error.message}`, error.stack);
    // Keep existing specific error handling (e.g., quota) if desired
    if (
      error.message?.includes("quota") ||
      error.message?.includes("rate limit") ||
      error.message?.includes("exceeded your current quota") ||
      error.message?.includes("insufficient_quota")
    ) {
      return new Response(
        JSON.stringify({
          error: "OpenAI API quota exceeded",
          message: "Our AI service has reached its usage limit. Please try again later."
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    return new Response(
      JSON.stringify({
        error: error.message,
        message: "There was an error processing your request."
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
}); // <-- Added missing closing brace for serve

// --- Keep existing helper functions ---
// Helper to extract user ID from JWT (keep existing)
function extractUserIdFromJWT(token: string): string {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    const payload = JSON.parse(jsonPayload);
    return payload.sub || "anonymous";
  } catch (e) {
    console.error("Error extracting user ID from JWT:", e);
    return "anonymous";
  }
}

// Remove unused helpers like processConversationHistory, getToolsForAgent, callOpenAIWithRetry, getAgentName
// as they were specific to the Chat Completions implementation.
