// Add Supabase client import
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// Add OpenAI import if not already present at the top
import { OpenAI } from "https://deno.land/x/openai@v4.52.7/mod.ts"; // Use Deno specific import if available or stick to fetch
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
    const { data: projectData, error: projectError } = await supabaseAdmin
      .from('canvas_projects') 
      .select(`*, canvas_scenes ( * )`) 
      .eq('id', projectId)
      .single(); 

    if (projectError) {
      console.error(`[TOOL ERROR] Supabase error fetching project ${projectId}:`, projectError);
      return JSON.stringify({ error: `Failed to fetch project: ${projectError.message}` });
    }
    if (!projectData) return JSON.stringify({ error: "Project not found" });

    const formattedDetails = {
        ...projectData,
        scenes: projectData.canvas_scenes?.map((scene: any) => ({ id: scene.id, title: scene.title })) || [] 
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
    const { data, error } = await supabaseAdmin
      .from('canvas_projects') 
      .update({ title: newTitle }) 
      .eq('id', projectId)
      .select() 
      .single(); 

    if (error) {
      console.error(`[TOOL ERROR] Supabase error updating title for project ${projectId}:`, error);
      return JSON.stringify({ error: `Failed to update title: ${error.message}` });
    }
    if (!data) return JSON.stringify({ error: "Project not found or update failed." });

    return JSON.stringify({ success: true, message: `Project title updated to "${newTitle}"`, updatedProject: data });
  } catch (err) { 
    console.error(`[TOOL ERROR] Unexpected error in update_project_title_tool for ${projectId}:`, err);
    return JSON.stringify({ error: `Unexpected error: ${err.message}` }); 
  }
}

async function get_script_tool(projectId: string): Promise<string> {
  console.log(`[TOOL] Executing get_script for project: ${projectId}`);
  try {
    const { data, error } = await supabaseAdmin
      .from('canvas_projects') 
      .select('full_script')   
      .eq('id', projectId)
      .single();

    if (error) {
      console.error(`[TOOL ERROR] Supabase error fetching script for project ${projectId}:`, error);
      return JSON.stringify({ error: `Failed to fetch script: ${error.message}` });
    }
    if (!data || data.full_script === null || data.full_script === undefined) { 
      return JSON.stringify({ error: "Script not found or is empty for this project." });
    }
    return JSON.stringify({ script: data.full_script });
  } catch (err) {
    console.error(`[TOOL ERROR] Unexpected error in get_script_tool for ${projectId}:`, err);
    return JSON.stringify({ error: `Unexpected error: ${err.message}` }); 
  }
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

async function create_scene_image_tool(projectId: string, prompt: string): Promise<string> {
  console.log(`[TOOL] Executing create_scene_image for project: ${projectId} with prompt: "${prompt}"`);
  try {
    // 1. Generate Image
    console.log(`[TOOL] Calling OpenAI Image Generate API...`);
    const imageResponse = await openai.images.generate({
      model: "dall-e-3", prompt: prompt, n: 1, size: "1024x1024", response_format: "url", 
    });
    const imageUrl = imageResponse.data[0]?.url;
    if (!imageUrl) throw new Error("Image generation failed, no URL returned.");
    console.log(`[TOOL] Image generated (temp URL): ${imageUrl}`);

    // 2. Upload to Supabase Storage
    const imageFileName = `scene_${projectId}_${Date.now()}.png`;
    const storageBucket = 'scene-images'; // Corrected bucket name

    console.log(`[TOOL] Fetching image from temporary URL...`);
    const imageBlobResponse = await fetch(imageUrl);
    if (!imageBlobResponse.ok) throw new Error(`Failed to fetch generated image from URL: ${imageBlobResponse.statusText}`);
    const imageBlob = await imageBlobResponse.blob();
    console.log(`[TOOL] Uploading image to Supabase Storage: ${storageBucket}/${imageFileName}`);

    const { error: uploadError } = await supabaseAdmin.storage
      .from(storageBucket)
      .upload(imageFileName, imageBlob, {
        cacheControl: '3600', upsert: false, contentType: imageBlob.type || 'image/png' 
      });
    if (uploadError) {
      console.error(`[TOOL ERROR] Supabase Storage upload error:`, uploadError);
      throw new Error(`Failed to upload image to storage: ${uploadError.message}`);
    }

    // 3. Get Public URL
    const { data: publicUrlData } = supabaseAdmin.storage.from(storageBucket).getPublicUrl(imageFileName);
    const publicImageUrl = publicUrlData?.publicUrl;
    if (!publicImageUrl) console.warn(`[TOOL WARN] Could not get public URL for ${imageFileName}, using original OpenAI URL.`);
    const finalImageUrl = publicImageUrl || imageUrl; 
    console.log(`[TOOL] Image stored at: ${finalImageUrl}`);

    // 4. Add Scene to Database
    console.log(`[TOOL] Adding scene record to database for project ${projectId}`);
    const { data: sceneData, error: sceneError } = await supabaseAdmin
      .from('canvas_scenes') 
      .insert({ project_id: projectId, image_prompt: prompt, image_url: finalImageUrl, title: `Scene - ${prompt.substring(0, 30)}...` })
      .select() 
      .single();
    if (sceneError) {
      console.error(`[TOOL ERROR] Supabase error inserting scene for project ${projectId}:`, sceneError);
      throw new Error(`Failed to save scene data: ${sceneError.message}`);
    }

    console.log(`[TOOL] Scene created successfully with ID: ${sceneData?.id}`);
    return JSON.stringify({ success: true, message: "Scene image generated and saved successfully.", imageUrl: finalImageUrl, sceneId: sceneData?.id });
  } catch (err) {
    console.error(`[TOOL ERROR] Unexpected error in create_scene_image_tool for project ${projectId}:`, err);
    return JSON.stringify({ error: `Failed to create scene image: ${err.message}` });
  }
}

// Placeholder for create_new_script tool
async function create_new_script_tool(projectId: string, topic: string): Promise<string> {
  console.log(`[TOOL] Executing create_new_script for project: ${projectId} with topic: "${topic}"`);
  // TODO: Implement actual script generation and DB update logic
  const placeholderScript = `Placeholder script about '${topic}' created for project ${projectId}. [Implementation Pending]`;
  // Example DB update (needs error handling):
  // try {
  //   await supabaseAdmin.from('canvas_projects').update({ full_script: placeholderScript }).eq('id', projectId);
  // } catch (dbError) { console.error("DB update failed:", dbError); /* Handle error */ }
  return JSON.stringify({ success: true, message: "Script creation initiated (placeholder).", generated_script_preview: placeholderScript.substring(0, 100) + "..." });
}

// Helper function to validate UUID format
function isValidUUID(uuid: string): boolean {
  if (!uuid || typeof uuid !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}
// --- End Tool Implementation ---

// --- Define Tool Schemas ---
const toolsList = [
  { type: "function", function: { name: "get_project_details", description: "Fetches general details about the current video project, including its title and scenes.", parameters: { type: "object", properties: { projectId: { type: "string", description: "The ID of the video project." } }, required: ["projectId"] } } },
  { type: "function", function: { name: "update_project_title", description: "Updates the title of the current video project.", parameters: { type: "object", properties: { projectId: { type: "string", description: "The ID of the video project to update." }, newTitle: { type: "string", description: "The new title for the project." } }, required: ["projectId", "newTitle"] } } },
  { type: "function", function: { name: "get_script", description: "Fetches the full script content for the current video project.", parameters: { type: "object", properties: { projectId: { type: "string", description: "The ID of the video project whose script needs to be fetched." } }, required: ["projectId"] } } },
  { type: "function", function: { name: "create_scene_image", description: "Generates an image for a new scene based on a prompt and adds it to the current project.", parameters: { type: "object", properties: { projectId: { type: "string", description: "The ID of the video project to add the new scene to." }, prompt: { type: "string", description: "A detailed description of the image to be generated for the scene." } }, required: ["projectId", "prompt"] } } },
  { type: "function", function: { name: "create_new_script", description: "Creates a completely new video script for the project based on a given topic or instruction, replacing any existing script.", parameters: { type: "object", properties: { projectId: { type: "string", description: "The ID of the video project for which to create the new script." }, topic: { type: "string", description: "The topic, subject, or instructions for the new script to be created." } }, required: ["projectId", "topic"] } } }
];

// Interface for Tool Output submission
interface ToolOutput {
  tool_call_id: string;
  output: string;
}

// Helper function to extract user ID from JWT
function extractUserIdFromJWT(token: string): string {
  try {
    const payloadBase64 = token.split('.')[1];
    const decodedPayload = atob(payloadBase64);
    const payload = JSON.parse(decodedPayload);
    return payload.sub || "anonymous"; 
  } catch (e) {
    console.error("Error decoding JWT:", e);
    return "anonymous";
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: new Headers(corsHeaders) });
  }

  const requestId = crypto.randomUUID();
  console.log(`[INFO] [${requestId}] Received new request `);

  try {
    // Get request body
    const requestData = await req.json();
    const { input, projectId, thread_id } = requestData;

    console.log(`[DEBUG] [${requestId}] Extracted projectId from requestData: ${projectId}`);

    if (!input) throw new Error("Input message is required.");
    if (!VIDEO_PROJECT_ASSISTANT_ID) throw new Error("VIDEO_PROJECT_ASSISTANT_ID is not configured.");

    // Extract user ID
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.split("Bearer ")[1];
    const userId = token ? extractUserIdFromJWT(token) : "anonymous";

    console.log(`[INFO] [${requestId}] Processing request for user ${userId}`, { projectId, threadIdProvided: !!thread_id, inputLength: input?.length || 0 });

    let currentThreadId = thread_id;

    // 1. Ensure Thread Exists
    if (!currentThreadId) {
      console.log(`[INFO] [${requestId}] No thread_id provided, creating new thread.`);
      const threadResponse = await fetch("https://api.openai.com/v1/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_API_KEY}`, "OpenAI-Beta": "assistants=v2" },
        body: JSON.stringify({ metadata: { project_id: projectId, user_id: userId } })
      });
      if (!threadResponse.ok) throw new Error(`Failed to create thread: ${JSON.stringify(await threadResponse.json())}`);
      const newThread = await threadResponse.json();
      currentThreadId = newThread.id;
      console.log(`[INFO] [${requestId}] Created new thread: ${currentThreadId}`);
    } else {
       console.log(`[INFO] [${requestId}] Using existing thread: ${currentThreadId}`);
    }

    // 2. Add User Message to Thread
    console.log(`[INFO] [${requestId}] Adding message to thread ${currentThreadId}`);
    const messageResponse = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_API_KEY}`, "OpenAI-Beta": "assistants=v2" },
      body: JSON.stringify({ role: "user", content: input }),
    });
    if (!messageResponse.ok) throw new Error(`Failed to add message: ${JSON.stringify(await messageResponse.json())}`);

    // 3. Create a Run
    const runMetadata = { project_id: projectId, request_id: requestId, user_id: userId };
    console.log(`[DEBUG] [${requestId}] Creating Run with metadata:`, runMetadata);

    const toolChoice: any = "auto"; // Let Assistant decide
    console.log(`[INFO] [${requestId}] Using tool_choice: 'auto'.`);

    console.log(`[INFO] [${requestId}] Creating run on thread ${currentThreadId} with assistant ${VIDEO_PROJECT_ASSISTANT_ID}`);
    const runPayload: any = { assistant_id: VIDEO_PROJECT_ASSISTANT_ID, metadata: runMetadata, tools: toolsList }; // Always pass full tool list for auto choice
    console.log(`[DEBUG] [${requestId}] Run creation payload:`, JSON.stringify(runPayload, null, 2)); 

    const runResponse = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/runs`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_API_KEY}`, "OpenAI-Beta": "assistants=v2" },
      body: JSON.stringify(runPayload), 
    });
    if (!runResponse.ok) throw new Error(`Failed to create run: ${JSON.stringify(await runResponse.json())}`);
    let run = await runResponse.json();
    console.log(`[INFO] [${requestId}] Run created: ${run.id}, Status: ${run.status}`);

    // 4. Poll Run Status and Handle Actions
    const terminalStates = ["completed", "failed", "cancelled", "expired"];
    const pollingStartTime = Date.now();
    const maxPollingDuration = 120000; // 2 minutes timeout

    while (!terminalStates.includes(run.status)) {
       if (Date.now() - pollingStartTime > maxPollingDuration) {
           console.error(`[ERROR] [${requestId}] Run polling timed out after ${maxPollingDuration / 1000}s for run ${run.id}`);
           try { await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/runs/${run.id}/cancel`, { method: "POST", headers: { "Authorization": `Bearer ${OPENAI_API_KEY}`, "OpenAI-Beta": "assistants=v2" } }); } 
           catch (cancelError) { console.error(`[ERROR] [${requestId}] Failed to cancel timed out run ${run.id}:`, cancelError); }
           throw new Error("Run processing timed out.");
       }

      await new Promise(resolve => setTimeout(resolve, 1000)); 

      console.log(`[INFO] [${requestId}] Polling run ${run.id}...`);
      const retrieveRunResponse = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/runs/${run.id}`, {
        headers: { "Authorization": `Bearer ${OPENAI_API_KEY}`, "OpenAI-Beta": "assistants=v2" },
      });
      if (!retrieveRunResponse.ok) {
         const errorData = await retrieveRunResponse.json();
         console.error(`[ERROR] [${requestId}] Failed to retrieve run ${run.id}: ${JSON.stringify(errorData)}`);
         if (retrieveRunResponse.status === 404) throw new Error(`Run ${run.id} not found. It might have expired or been cancelled.`);
         await new Promise(resolve => setTimeout(resolve, 2000)); 
         continue; 
      }
      run = await retrieveRunResponse.json();
      console.log(`[INFO] [${requestId}] Run ${run.id} Status: ${run.status}`);

      if (run.status === "requires_action" && run.required_action?.type === "submit_tool_outputs") {
        const toolCalls = run.required_action.submit_tool_outputs.tool_calls;
        console.log(`[INFO] [${requestId}] Run ${run.id} requires action: ${toolCalls.length} tool call(s)`);
        const toolOutputs: ToolOutput[] = []; 

        for (const toolCall of toolCalls) {
          const functionName = toolCall.function.name;
          let args = JSON.parse(toolCall.function.arguments || "{}");
          const resolvedProjectId = args.projectId || run.metadata?.project_id || projectId; 
          const needsProjectId = ["get_project_details", "update_project_title", "get_script", "create_scene_image", "create_new_script"].includes(functionName);

          if (needsProjectId && (!isValidUUID(resolvedProjectId) || args.projectId === "project_id")) {
              const fallbackProjectId = run.metadata?.project_id || projectId; 
              if (isValidUUID(fallbackProjectId)) {
                  console.warn(`[WARN] [${requestId}] Assistant provided invalid/missing projectId for ${functionName}. Injecting ID: ${fallbackProjectId}`);
                  args.projectId = fallbackProjectId; 
              } else {
                  console.error(`[ERROR] [${requestId}] Cannot determine a valid projectId for ${functionName}. Aborting tool call.`);
                  toolOutputs.push({ tool_call_id: toolCall.id, output: JSON.stringify({ error: `Failed to execute ${functionName}: Could not determine a valid Project ID.` }) });
                  continue; 
              }
          }

          let output = "";
          let toolExecuted = false;
          const toolProjectId = args.projectId; // Use potentially corrected ID

          console.log(`[INFO] [${requestId}] Executing tool: ${functionName}`, args); 

          try {
            if (functionName === "get_project_details") {
              if (!isValidUUID(toolProjectId)) output = JSON.stringify({ error: `Invalid Project ID format for get_project_details: ${toolProjectId}` });
              else { output = await get_project_details_tool(toolProjectId); toolExecuted = true; }
            } else if (functionName === "get_script") {
               if (!isValidUUID(toolProjectId)) output = JSON.stringify({ error: `Invalid Project ID format for get_script: ${toolProjectId}` });
               else { output = await get_script_tool(toolProjectId); toolExecuted = true; }
            } else if (functionName === "update_project_title") {
              const newTitle = args.newTitle;
               if (!isValidUUID(toolProjectId) || !newTitle) output = JSON.stringify({ error: `Invalid Project ID or missing title for update_project_title. ID: ${toolProjectId}` });
               else { output = await update_project_title_tool(toolProjectId, newTitle); toolExecuted = true; }
            } else if (functionName === "create_scene_image") {
              const prompt = args.prompt;
               if (!isValidUUID(toolProjectId) || !prompt) output = JSON.stringify({ error: `Invalid Project ID or missing prompt for create_scene_image. ID: ${toolProjectId}` });
               else { output = await create_scene_image_tool(toolProjectId, prompt); toolExecuted = true; }
            } else if (functionName === "create_new_script") { 
              const topic = args.topic;
              if (!isValidUUID(toolProjectId) || !topic) output = JSON.stringify({ error: `Invalid Project ID or missing topic for create_new_script. ID: ${toolProjectId}` });
              else { output = await create_new_script_tool(toolProjectId, topic); toolExecuted = true; }
            } else { 
                console.warn(`[WARN] [${requestId}] Unknown tool function called: ${functionName}`);
                output = JSON.stringify({ error: `Unknown tool function: ${functionName}` });
            }
          } catch (toolError) {
            console.error(`[ERROR] [${requestId}] Error executing tool ${functionName}:`, toolError);
            output = JSON.stringify({ error: `Tool execution failed: ${toolError.message}` });
          }

          if (toolExecuted) console.log(`[INFO] [${requestId}] Tool ${functionName} executed successfully.`);
          toolOutputs.push({ tool_call_id: toolCall.id, output: output });
        } // End loop through toolCalls

        console.log(`[INFO] [${requestId}] Submitting ${toolOutputs.length} tool output(s) for run ${run.id}`);
        const submitOutputResponse = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/runs/${run.id}/submit_tool_outputs`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_API_KEY}`, "OpenAI-Beta": "assistants=v2" },
          body: JSON.stringify({ tool_outputs: toolOutputs }),
        });

        if (!submitOutputResponse.ok) {
          const errorData = await submitOutputResponse.json();
          if (errorData?.code === 'run_not_in_required_action_state') console.warn(`[WARN] [${requestId}] Run ${run.id} was likely no longer in 'requires_action' state when submitting outputs. Continuing polling.`);
          else throw new Error(`Failed to submit tool outputs: ${JSON.stringify(errorData)}`);
        } else {
           console.log(`[INFO] [${requestId}] Tool outputs submitted successfully for run ${run.id}.`);
        }
        continue; 
      } // End if requires_action
    } // End while polling loop

    // 5. Retrieve Final Response
    let responseContent = "An error occurred, and I couldn't get a response."; 
    if (run.status === "completed") {
      console.log(`[INFO] [${requestId}] Run ${run.id} completed. Fetching messages...`);
      const messagesListResponse = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/messages?order=desc&run_id=${run.id}`, {
        headers: { "Authorization": `Bearer ${OPENAI_API_KEY}`, "OpenAI-Beta": "assistants=v2" },
      });
      if (!messagesListResponse.ok) {
          const errorData = await messagesListResponse.json();
          console.error(`[ERROR] [${requestId}] Failed to list messages for run ${run.id}: ${JSON.stringify(errorData)}`);
      } else {
          const messageList = await messagesListResponse.json();
          const finalMessages = messageList.data.filter((msg: any) => msg.run_id === run.id && msg.role === 'assistant');
          if (finalMessages.length > 0 && finalMessages[0].content?.[0]?.type === 'text') {
              responseContent = finalMessages.map((msg: any) => msg.content.filter((c: any) => c.type === 'text').map((c: any) => c.text.value).join('\n')).join('\n');
               console.log(`[INFO] [${requestId}] Assistant response(s):`, responseContent.substring(0, 100) + '...');
          } else {
              console.warn(`[WARN] [${requestId}] Run ${run.id} completed but no assistant messages found for this run.`);
              responseContent = "I finished processing, but didn't generate a text response."; 
          }
      }
    } else {
      console.error(`[ERROR] [${requestId}] Run ${run.id} finished with status: ${run.status}`, run.last_error);
      responseContent = `The request could not be completed. Status: ${run.status}.`;
      if (run.last_error) responseContent += ` Error: ${run.last_error.message}`;
    }

    // Return successful response
    return new Response(
      JSON.stringify({ content: responseContent, thread_id: currentThreadId, run_id: run.id }),
      { status: 200, headers: new Headers({ ...corsHeaders, "Content-Type": "application/json" }) }
    );

  } catch (error) {
    console.error(`[ERROR] [${requestId}] Error in multi-agent-chat handler: ${error.message}`, error.stack);
    let statusCode = 500;
    let errorMessage = "There was an error processing your request.";
    if (error.message?.includes("quota") || error.message?.includes("rate limit") || error.message?.includes("insufficient_quota")) {
      statusCode = 429;
      errorMessage = "Our AI service has reached its usage limit. Please try again later.";
    } else if (error.message?.includes("timed out")) {
      statusCode = 408; // Request Timeout
      errorMessage = "The request timed out during processing.";
    }
    
    return new Response(
      JSON.stringify({ error: error.message || "An internal error occurred", message: errorMessage }),
      { status: statusCode, headers: new Headers({ ...corsHeaders, "Content-Type": "application/json" }) }
    );
  }
});
