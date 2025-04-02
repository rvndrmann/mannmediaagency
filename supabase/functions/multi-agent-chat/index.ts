// Add Supabase client import
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// Add OpenAI import if not already present at the top
import { OpenAI } from "https://deno.land/x/openai@v4.52.7/mod.ts"; // Use Deno specific import if available or stick to fetch
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "./cors.ts";
// Assuming canvas-tools.ts might contain MCP interaction logic later
// import { formatCanvasProjectInfo, getCanvasTools } from "./canvas-tools.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || "";
const VIDEO_PROJECT_ASSISTANT_ID = Deno.env.get("VIDEO_PROJECT_ASSISTANT_ID") || ""; // Project Manager/Orchestrator
const SCRIPT_WRITER_ASSISTANT_ID = Deno.env.get("SCRIPT_WRITER_ASSISTANT_ID") || "";
const IMAGE_PROMPT_GENERATOR_ASSISTANT_ID = Deno.env.get("IMAGE_PROMPT_GENERATOR_ASSISTANT_ID") || "";
const SCENE_DESCRIBER_TEXT_ASSISTANT_ID = Deno.env.get("SCENE_DESCRIBER_TEXT_ASSISTANT_ID") || "";
const SCENE_DESCRIBER_IMAGE_ASSISTANT_ID = Deno.env.get("SCENE_DESCRIBER_IMAGE_ASSISTANT_ID") || ""; // Vision Enabled

// Add Supabase Env Vars
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

if (!OPENAI_API_KEY) console.error("FATAL: OPENAI_API_KEY environment variable not set.");
if (!VIDEO_PROJECT_ASSISTANT_ID) console.warn("WARN: VIDEO_PROJECT_ASSISTANT_ID (Project Manager) environment variable not set.");
// Add checks for new assistant IDs (optional, maybe just warn)
if (!SCRIPT_WRITER_ASSISTANT_ID) console.warn("WARN: SCRIPT_WRITER_ASSISTANT_ID environment variable not set.");
if (!IMAGE_PROMPT_GENERATOR_ASSISTANT_ID) console.warn("WARN: IMAGE_PROMPT_GENERATOR_ASSISTANT_ID environment variable not set.");
if (!SCENE_DESCRIBER_TEXT_ASSISTANT_ID) console.warn("WARN: SCENE_DESCRIBER_TEXT_ASSISTANT_ID environment variable not set.");
if (!SCENE_DESCRIBER_IMAGE_ASSISTANT_ID) console.warn("WARN: SCENE_DESCRIBER_IMAGE_ASSISTANT_ID environment variable not set.");

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

// Removed create_scene_image_tool function as it's replaced by trigger_product_shoot
// Placeholder for create_new_script tool
async function create_new_script_tool(projectId: string, topic: string, generatedScript: string): Promise<string> {
  console.log(`[TOOL] Executing create_new_script for project: ${projectId} with topic: "${topic}"`);
  // Note: The actual script generation should ideally happen via the SCRIPT_WRITER_ASSISTANT.
  // This tool's primary job is to SAVE the generated script provided by the assistant.
  if (!generatedScript) {
      return JSON.stringify({ error: "No script content provided to save." });
  }
  try {
    const { data, error } = await supabaseAdmin
      .from('canvas_projects')
      .update({ full_script: generatedScript })
      .eq('id', projectId)
      .select('id, full_script') // Select to confirm update
      .single();

    if (error) {
      console.error(`[TOOL ERROR] Supabase error updating script for project ${projectId}:`, error);
      return JSON.stringify({ error: `Failed to update script: ${error.message}` });
    }
    if (!data) return JSON.stringify({ error: "Project not found or script update failed." });

    console.log(`[TOOL] Script updated successfully for project ${projectId}`);
    return JSON.stringify({ success: true, message: "Script updated successfully.", script_preview: data.full_script?.substring(0, 150) + "..." });
  } catch (err) {
    console.error(`[TOOL ERROR] Unexpected error in create_new_script_tool for ${projectId}:`, err);
    return JSON.stringify({ error: `Unexpected error saving script: ${err.message}` });
  }
}

// --- New Tools Implementation ---

async function get_project_product_image_url_tool(projectId: string): Promise<string> {
  console.log(`[TOOL] Executing get_project_product_image_url for project: ${projectId}`);
  try {
    const { data, error } = await supabaseAdmin
      .from('canvas_projects')
      .select('main_product_image_url')
      .eq('id', projectId)
      .single();

    if (error) {
      console.error(`[TOOL ERROR] Supabase error fetching main_product_image_url for project ${projectId}:`, error);
      return JSON.stringify({ error: `Failed to fetch main product image URL: ${error.message}` });
    }
    if (!data || !data.main_product_image_url) {
      return JSON.stringify({ error: "Main product image URL not found for this project." });
    }
    return JSON.stringify({ success: true, productImageUrl: data.main_product_image_url });
  } catch (err) {
    console.error(`[TOOL ERROR] Unexpected error in get_project_product_image_url_tool for ${projectId}:`, err);
    return JSON.stringify({ error: `Unexpected error: ${err.message}` });
  }
}

async function get_scene_image_url_tool(projectId: string, sceneId: string): Promise<string> {
    console.log(`[TOOL] Executing get_scene_image_url for project: ${projectId}, scene: ${sceneId}`);
    try {
        const { data, error } = await supabaseAdmin
            .from('canvas_scenes')
            .select('image_url')
            .eq('project_id', projectId)
            .eq('id', sceneId)
            .single();

        if (error) {
            console.error(`[TOOL ERROR] Supabase error fetching image_url for scene ${sceneId}:`, error);
            return JSON.stringify({ error: `Failed to fetch scene image URL: ${error.message}` });
        }
        if (!data || !data.image_url) {
            return JSON.stringify({ error: "Image URL not found for this scene." });
        }
        return JSON.stringify({ success: true, imageUrl: data.image_url });
    } catch (err) {
        console.error(`[TOOL ERROR] Unexpected error in get_scene_image_url_tool for scene ${sceneId}:`, err);
        return JSON.stringify({ error: `Unexpected error: ${err.message}` });
    }
}


async function save_scene_description_tool(projectId: string, sceneId: string, description: string): Promise<string> {
  console.log(`[TOOL] Executing save_scene_description for project: ${projectId}, scene: ${sceneId}`);
  if (!description) {
      return JSON.stringify({ error: "No description provided to save." });
  }
  try {
    const { data, error } = await supabaseAdmin
      .from('canvas_scenes')
      .update({ description: description })
      .eq('project_id', projectId)
      .eq('id', sceneId)
      .select('id, description') // Select to confirm update
      .single();

    if (error) {
      console.error(`[TOOL ERROR] Supabase error updating description for scene ${sceneId}:`, error);
      return JSON.stringify({ error: `Failed to update scene description: ${error.message}` });
    }
    if (!data) return JSON.stringify({ error: "Scene not found or description update failed." });

    console.log(`[TOOL] Scene description updated successfully for scene ${sceneId}`);
    return JSON.stringify({ success: true, message: "Scene description updated successfully." });
  } catch (err) {
    console.error(`[TOOL ERROR] Unexpected error in save_scene_description_tool for scene ${sceneId}:`, err);
    return JSON.stringify({ error: `Unexpected error saving scene description: ${err.message}` });
  }
}

// Tool to trigger product shoot, poll status, and save result as a scene
async function trigger_product_shoot_tool(
    projectId: string,
    prompt: string,
    referenceImageUrl?: string,
    aspectRatio?: string,
    placementType?: string,
    manualPlacement?: any, // Type might need refinement based on actual usage
    generationType?: string,
    optimizeDescription?: boolean,
    fastMode?: boolean,
    originalQuality?: boolean
): Promise<string> {
    console.log(`[TOOL] Executing trigger_product_shoot for project: ${projectId} with prompt: "${prompt}"`);

    try {
        // 1. Get the main product image URL for the project
        console.log(`[TOOL] Fetching main product image URL for project ${projectId}...`);
        const imageUrlResultStr = await get_project_product_image_url_tool(projectId);
        const imageUrlResult = JSON.parse(imageUrlResultStr);
        if (!imageUrlResult.success || !imageUrlResult.productImageUrl) {
            throw new Error(`Failed to get main product image URL: ${imageUrlResult.error || 'URL not found'}`);
        }
        const sourceImageUrl = imageUrlResult.productImageUrl;
        console.log(`[TOOL] Using source image URL: ${sourceImageUrl}`);

        // 2. Call the create_product_shot_request RPC
        console.log(`[TOOL] Calling RPC: create_product_shot_request`);
        const rpcParams = {
            p_source_image_url: sourceImageUrl,
            p_reference_image_url: referenceImageUrl, // Optional
            p_prompt: prompt,
            p_scene_description: prompt, // Use prompt as scene description for now, maybe refine later
            p_aspect_ratio: aspectRatio || '1:1', // Default or pass from args
            p_placement_type: placementType,
            p_manual_placement: manualPlacement,
            p_generation_type: generationType || 'product_shoot_v1', // Default or pass from args
            p_optimize_description: optimizeDescription,
            p_fast_mode: fastMode,
            p_original_quality: originalQuality
        };
        console.log("[TOOL] RPC Params:", rpcParams); // Log params for debugging

        const { data: requestData, error: requestError } = await supabaseAdmin.rpc('create_product_shot_request', rpcParams);

        if (requestError) {
            console.error(`[TOOL ERROR] RPC create_product_shot_request failed:`, requestError);
            throw new Error(`Failed to create product shot request: ${requestError.message}`);
        }
        if (!requestData || !requestData.id) {
             console.error(`[TOOL ERROR] RPC create_product_shot_request did not return a valid ID. Response:`, requestData);
             throw new Error(`Failed to create product shot request: No ID returned.`);
        }

        const requestId = requestData.id;
        console.log(`[TOOL] Product shot request created with ID: ${requestId}`);

        // 3. Poll for status using get_product_shot_status RPC
        let resultUrl: string | null = null;
        let finalStatus: string = 'processing';
        let errorMessage: string | null = null;
        const pollStartTime = Date.now();
        const maxPollDuration = 180000; // 3 minutes timeout for polling
        const pollInterval = 5000; // 5 seconds

        console.log(`[TOOL] Polling status for request ID: ${requestId}...`);
        while (Date.now() - pollStartTime < maxPollDuration) {
            await new Promise(resolve => setTimeout(resolve, pollInterval));
            console.log(`[TOOL] Checking status for ${requestId}...`);
            const { data: statusData, error: statusError } = await supabaseAdmin.rpc('get_product_shot_status', {
                p_request_id: requestId
            });

            if (statusError) {
                console.error(`[TOOL ERROR] RPC get_product_shot_status failed for ${requestId}:`, statusError);
                // Decide if we should stop polling or continue
                await new Promise(resolve => setTimeout(resolve, pollInterval * 2)); // Wait longer before retrying status check
                continue; // Continue polling for now, maybe add retry limit later
            }

            if (statusData) {
                 console.log(`[TOOL] Status for ${requestId}: ${statusData.status}`);
                 finalStatus = statusData.status;
                 if (finalStatus === 'completed' && statusData.result_url) {
                     resultUrl = statusData.result_url;
                     console.log(`[TOOL] Product shot completed. Result URL: ${resultUrl}`);
                     break; // Exit polling loop
                 } else if (finalStatus === 'failed') {
                     errorMessage = statusData.error_message || 'Product shot generation failed.';
                     console.error(`[TOOL ERROR] Product shot failed for ${requestId}: ${errorMessage}`);
                     break; // Exit polling loop
                 }
            } else {
                 console.warn(`[TOOL WARN] RPC get_product_shot_status returned no data for ${requestId}.`);
            }
        } // End polling loop

        if (!resultUrl && finalStatus !== 'failed') {
             console.error(`[TOOL ERROR] Polling timed out for request ID: ${requestId} after ${maxPollDuration / 1000}s.`);
             throw new Error(`Product shot generation timed out.`);
        }
        if (finalStatus === 'failed') {
             throw new Error(errorMessage || 'Product shot generation failed.');
        }
        if (!resultUrl) {
             throw new Error('Product shot completed but no result URL was found.');
        }


        // 4. Save the result as a new scene in canvas_scenes
        console.log(`[TOOL] Saving completed product shot as a new scene for project ${projectId}`);
        const { data: sceneData, error: sceneError } = await supabaseAdmin
            .from('canvas_scenes')
            .insert({
                project_id: projectId,
                image_prompt: prompt, // Save the original prompt
                image_url: resultUrl,
                title: `Scene - ${prompt.substring(0, 30)}...`, // Auto-generate title
                // Add other relevant fields if necessary, e.g., description
            })
            .select('id') // Select the ID of the newly created scene
            .single();

        if (sceneError) {
            console.error(`[TOOL ERROR] Failed to insert new scene into canvas_scenes for project ${projectId}:`, sceneError);
            // Don't throw error here, image was generated, just failed to save scene record
             return JSON.stringify({
                 success: true, // Image generated, but scene save failed
                 message: `Product shot generated successfully, but failed to save as a scene: ${sceneError.message}`,
                 imageUrl: resultUrl,
                 sceneId: null // Indicate scene wasn't created
             });
        }

        const sceneId = sceneData?.id;
        console.log(`[TOOL] Product shot saved successfully as scene ID: ${sceneId}`);
        return JSON.stringify({
            success: true,
            message: "Product shot generated and saved as a new scene successfully.",
            imageUrl: resultUrl,
            sceneId: sceneId
        });

    } catch (err) {
        console.error(`[TOOL ERROR] Unexpected error in trigger_product_shoot_tool for project ${projectId}:`, err);
        return JSON.stringify({ success: false, error: `Failed to trigger product shoot: ${err.message}` });
    }
}

// --- Delegation Tool ---
// This tool doesn't *do* anything itself, but acts as a signal for the orchestrator.
// The Project Manager calls this when it decides a specialized assistant should handle a task.
async function delegate_task_tool(targetAssistant: string, taskDescription: string, context?: any): Promise<string> {
    console.log(`[TOOL_SIGNAL] Delegation requested: Target=${targetAssistant}, Task=${taskDescription}`);
    // Return the arguments so the orchestrator knows what to do.
    return JSON.stringify({
        signal: "DELEGATION_REQUESTED",
        targetAssistant,
        taskDescription,
        context: context || {} // Pass any extra context needed
    });
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
  // Project Management & Info Retrieval
  { type: "function", function: { name: "get_project_details", description: "Fetches general details about the current video project, including its title, main product image URL, and scenes.", parameters: { type: "object", properties: { projectId: { type: "string", description: "The ID of the video project." } }, required: ["projectId"] } } },
  { type: "function", function: { name: "update_project_title", description: "Updates the title of the current video project.", parameters: { type: "object", properties: { projectId: { type: "string", description: "The ID of the video project to update." }, newTitle: { type: "string", description: "The new title for the project." } }, required: ["projectId", "newTitle"] } } },
  { type: "function", function: { name: "get_project_product_image_url", description: "Fetches the main product image URL associated with the project.", parameters: { type: "object", properties: { projectId: { type: "string", description: "The ID of the video project." } }, required: ["projectId"] } } },

  // Script Handling
  { type: "function", function: { name: "get_script", description: "Fetches the full script content for the current video project.", parameters: { type: "object", properties: { projectId: { type: "string", description: "The ID of the video project whose script needs to be fetched." } }, required: ["projectId"] } } },
  // Note: Script generation itself is intended to be done by the SCRIPT_WRITER_ASSISTANT. This tool saves the result.
  { type: "function", function: { name: "create_new_script", description: "Saves the provided script content to the project, replacing any existing script. Should be used after a script has been generated.", parameters: { type: "object", properties: { projectId: { type: "string", description: "The ID of the video project for which to save the script." }, topic: { type: "string", description: "The topic or subject the script is about (for context)." }, generatedScript: { type: "string", description: "The full script content to be saved." } }, required: ["projectId", "topic", "generatedScript"] } } },

  // Scene Image Generation (Product Shoot) - Replaces create_scene_image_tool
  { type: "function", function: { name: "trigger_product_shoot", description: "Generates a product image using the project's main product image and a prompt, polls for completion, and saves it as a new scene.", parameters: { type: "object", properties: {
        projectId: { type: "string", description: "The ID of the video project." },
        prompt: { type: "string", description: "A detailed description or prompt for the image generation." },
        referenceImageUrl: { type: "string", description: "(Optional) URL of a reference image for V2 generation." },
        aspectRatio: { type: "string", description: "(Optional) Desired aspect ratio (e.g., '1:1', '16:9'). Defaults to '1:1'." },
        // Add other optional params from the RPC if needed by the assistant
      }, required: ["projectId", "prompt"] } }
  },
  // REMOVED: create_scene_image_tool definition was here

  // Scene Description & Info
  { type: "function", function: { name: "get_scene_image_url", description: "Fetches the image URL for a specific scene within the project.", parameters: { type: "object", properties: { projectId: { type: "string", description: "The ID of the video project." }, sceneId: { type: "string", description: "The ID of the specific scene." } }, required: ["projectId", "sceneId"] } } },
  { type: "function", function: { name: "save_scene_description", description: "Saves or updates the textual description for a specific scene.", parameters: { type: "object", properties: { projectId: { type: "string", description: "The ID of the video project." }, sceneId: { type: "string", description: "The ID of the scene to update." }, description: { type: "string", description: "The textual description to save for the scene." } }, required: ["projectId", "sceneId", "description"] } } },
  // --- Orchestration Tool ---
  { type: "function", function: { name: "delegate_task", description: "Delegate a specific task to a specialized assistant (e.g., Script Writer, Image Prompt Generator, Scene Describer Text, Scene Describer Image).", parameters: { type: "object", properties: {
        targetAssistant: { type: "string", description: "The name or identifier of the specialized assistant to delegate to (e.g., 'Script Writer', 'Image Prompt Generator', 'Scene Describer Text', 'Scene Describer Image')." },
        taskDescription: { type: "string", description: "A clear and concise description of the task for the specialized assistant." },
        context: { type: "object", description: "(Optional) Any additional context needed for the task, like sceneId, topic, previous results etc.", additionalProperties: true }
      }, required: ["targetAssistant", "taskDescription"] } }
  },
]; // End of toolsList array

// Interface for Tool Output submission
interface ToolOutput {
  tool_call_id: string;
  output: string;
}

// Helper function to extract user ID from JWT
function extractUserIdFromJWT(token: string): string {
    try {
        const payloadBase64 = token.split('.')[1];
        if (!payloadBase64) return "anonymous"; // Handle cases with invalid token format
        const decodedPayload = atob(payloadBase64);
        const payload = JSON.parse(decodedPayload);
        return payload.sub || "anonymous";
    } catch (e) {
        console.error("Error decoding JWT:", e);
        return "anonymous";
    }
}


// --- Refactored Run Processing Logic ---

interface ProcessRunResult {
    run: any; // The final run object (if completed/failed)
    delegationRequest?: DelegationDetails; // Details if delegation is needed
    error?: Error; // Error object if processing failed catastrophically
}

interface DelegationDetails {
    targetAssistant: string;
    taskDescription: string;
    context: any;
    toolCallId: string; // ID of the delegate_task tool call
}

// Define interfaces for expected tool arguments to help TypeScript
interface BaseToolArgs { projectId?: string; }
interface UpdateTitleArgs extends BaseToolArgs { newTitle?: string; }
interface CreateScriptArgs extends BaseToolArgs { topic?: string; generatedScript?: string; }
interface TriggerShootArgs extends BaseToolArgs { prompt?: string; referenceImageUrl?: string; aspectRatio?: string; placementType?: string; manualPlacement?: any; generationType?: string; optimizeDescription?: boolean; fastMode?: boolean; originalQuality?: boolean; }
interface SceneArgs extends BaseToolArgs { sceneId?: string; }
interface SaveDescriptionArgs extends SceneArgs { description?: string; }
interface DelegateTaskArgs { targetAssistant?: string; taskDescription?: string; context?: any; }


async function processAssistantRun(
    threadId: string,
    assistantId: string,
    runMetadata: any,
    requestId: string,
    initialMessageContent?: string | any[], // Can be string or array for vision
    projectIdForContext?: string // Pass projectId for tool validation fallback
): Promise<ProcessRunResult> {

    const maxPollingDuration = 180000; // 3 minutes timeout per run
    const pollingInterval = 1000; // Check every second

    try {
        // 1. Add Message if provided (only needed for the *first* turn or when feeding back results)
        if (initialMessageContent) {
            console.log(`[INFO] [${requestId}] Adding message to thread ${threadId}`);
            const messagePayload: any = { role: "user" }; // Treat feedback to PM as 'user' input for that run
            // Handle vision input format
            if (Array.isArray(initialMessageContent)) {
                 messagePayload.content = initialMessageContent;
            } else {
                 messagePayload.content = String(initialMessageContent); // Ensure it's a string
            }

            const messageResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_API_KEY}`, "OpenAI-Beta": "assistants=v2" },
                body: JSON.stringify(messagePayload),
            });
            if (!messageResponse.ok) {
                 const errorData = await messageResponse.json();
                 console.error(`[ERROR] [${requestId}] Failed to add message: ${JSON.stringify(errorData)}`);
                 throw new Error(`Failed to add message: ${errorData?.error?.message || 'Unknown error'}`);
            }
            console.log(`[INFO] [${requestId}] Message added successfully.`);
        }

        // 2. Create Run
        console.log(`[INFO] [${requestId}] Creating run on thread ${threadId} with assistant ${assistantId}`);
        const runPayload: any = {
            assistant_id: assistantId,
            metadata: runMetadata,
            // TODO: Consider passing specific tools based on assistantId if needed
            tools: toolsList // Pass full list for now
        };
        // Add instructions override if needed, e.g., for specialized assistants
        // runPayload.instructions = "Specific instructions for this run...";

        console.log(`[DEBUG] [${requestId}] Run creation payload:`, JSON.stringify(runPayload, null, 2));

        const runResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_API_KEY}`, "OpenAI-Beta": "assistants=v2" },
            body: JSON.stringify(runPayload),
        });
        if (!runResponse.ok) {
             const errorData = await runResponse.json();
             console.error(`[ERROR] [${requestId}] Failed to create run: ${JSON.stringify(errorData)}`);
             throw new Error(`Failed to create run: ${errorData?.error?.message || 'Unknown error'}`);
        }
        let run = await runResponse.json();
        console.log(`[INFO] [${requestId}] Run created: ${run.id}, Status: ${run.status}`);

        // 3. Poll Run Status and Handle Actions
        const terminalStates = ["completed", "failed", "cancelled", "expired", "requires_action"]; // Stop polling on requires_action too
        const pollingStartTime = Date.now();

        while (!terminalStates.includes(run.status)) {
            if (Date.now() - pollingStartTime > maxPollingDuration) {
                console.error(`[ERROR] [${requestId}] Run polling timed out after ${maxPollingDuration / 1000}s for run ${run.id}`);
                try { await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${run.id}/cancel`, { method: "POST", headers: { "Authorization": `Bearer ${OPENAI_API_KEY}`, "OpenAI-Beta": "assistants=v2" } }); }
                catch (cancelError) { console.error(`[ERROR] [${requestId}] Failed to cancel timed out run ${run.id}:`, cancelError); }
                throw new Error("Run processing timed out.");
            }

            await new Promise(resolve => setTimeout(resolve, pollingInterval));

            // console.log(`[INFO] [${requestId}] Polling run ${run.id}...`); // Reduce log noise
            const retrieveRunResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${run.id}`, {
                headers: { "Authorization": `Bearer ${OPENAI_API_KEY}`, "OpenAI-Beta": "assistants=v2" },
            });
            if (!retrieveRunResponse.ok) {
                const errorData = await retrieveRunResponse.json();
                console.error(`[ERROR] [${requestId}] Failed to retrieve run ${run.id}: ${JSON.stringify(errorData)}`);
                if (retrieveRunResponse.status === 404) throw new Error(`Run ${run.id} not found.`);
                await new Promise(resolve => setTimeout(resolve, pollingInterval * 2)); // Wait longer before retrying
                continue;
            }
            run = await retrieveRunResponse.json();
            if (run.status !== 'queued' && run.status !== 'in_progress') { // Log only status changes
                 console.log(`[INFO] [${requestId}] Run ${run.id} Status: ${run.status}`);
            }
        } // End polling loop (stops when status is terminal or requires_action)

        // 4. Handle Requires Action (including Delegation Signal)
        if (run.status === "requires_action" && run.required_action?.type === "submit_tool_outputs") {
            const toolCalls = run.required_action.submit_tool_outputs.tool_calls;
            console.log(`[INFO] [${requestId}] Run ${run.id} requires action: ${toolCalls.length} tool call(s)`);
            const toolOutputs: ToolOutput[] = [];
            let delegationRequest: DelegationDetails | undefined = undefined;

            for (const toolCall of toolCalls) {
                const functionName = toolCall.function.name;
                let args = {}; // Initialize as empty object
                try {
                    args = JSON.parse(toolCall.function.arguments || "{}");
                } catch (parseError) {
                     console.error(`[ERROR] [${requestId}] Failed to parse arguments for tool ${functionName}: ${toolCall.function.arguments}`, parseError);
                     toolOutputs.push({ tool_call_id: toolCall.id, output: JSON.stringify({ error: `Failed to parse tool arguments: ${parseError.message}` }) });
                     continue; // Skip this tool call
                }
                const toolCallId = toolCall.id;

                // --- Intercept Delegation Signal ---
                if (functionName === "delegate_task") {
                    const delegateArgs = args as DelegateTaskArgs; // Cast to specific type
                    console.log(`[INFO] [${requestId}] Intercepted delegation request from run ${run.id}`);
                    delegationRequest = {
                        targetAssistant: delegateArgs.targetAssistant ?? "Unknown", // Use nullish coalescing
                        taskDescription: delegateArgs.taskDescription ?? "No description", // Use nullish coalescing
                        context: delegateArgs.context || {},
                        toolCallId: toolCallId
                    };
                    // Provide a dummy output for the delegation tool call itself
                    toolOutputs.push({ tool_call_id: toolCallId, output: JSON.stringify({ success: true, message: "Delegation signal received by orchestrator." }) });
                    // Don't continue here; process other tool calls if any, then check delegationRequest after the loop
                } else {
                    // --- Normal Tool Execution ---
                    const baseArgs = args as BaseToolArgs; // Cast to base type
                    const resolvedProjectId = baseArgs.projectId || run.metadata?.project_id || projectIdForContext; // Use passed projectId as fallback
                    const needsProjectId = [
                        "get_project_details", "update_project_title", "get_script",
                        "create_new_script", "get_project_product_image_url",
                        "trigger_product_shoot", "get_scene_image_url", "save_scene_description"
                    ].includes(functionName);

                    let output = "";
                    let toolExecuted = false;
                    let currentToolProjectId = baseArgs.projectId; // Keep original arg for logging/checking

                    // Validate and potentially inject Project ID
                    if (needsProjectId) {
                        if (!isValidUUID(resolvedProjectId)) {
                            console.error(`[ERROR] [${requestId}] Cannot determine a valid projectId for ${functionName}. Aborting tool call.`);
                            output = JSON.stringify({ error: `Failed to execute ${functionName}: Could not determine a valid Project ID.` });
                        } else if (!baseArgs.projectId || !isValidUUID(baseArgs.projectId)) {
                            console.warn(`[WARN] [${requestId}] Assistant provided invalid/missing projectId for ${functionName}. Injecting ID: ${resolvedProjectId}`);
                            // Inject the valid ID into args for the tool function - IMPORTANT: Modify the 'args' object directly
                            (args as BaseToolArgs).projectId = resolvedProjectId;
                            currentToolProjectId = resolvedProjectId; // Use the injected ID
                        } else {
                             currentToolProjectId = baseArgs.projectId; // Use the valid ID provided in args
                        }
                    }

                    if (!output) { // Only proceed if no validation error occurred above
                        // The validation block (lines 614-626) should ensure currentToolProjectId is valid if needed.
                        // We will use non-null assertions (!) below based on that prior validation.
                            console.log(`[INFO] [${requestId}] Executing tool: ${functionName}`, args);
                            try {
                            // Execute the appropriate tool function based on its name
                            // Use the potentially modified 'args' object and 'currentToolProjectId'
                            switch (functionName) {
                                case "get_project_details":
                                    output = await get_project_details_tool(currentToolProjectId!); toolExecuted = true; break;
                                case "update_project_title":
                                    { const updateArgs = args as UpdateTitleArgs;
                                      if (!updateArgs.newTitle) output = JSON.stringify({ error: `Missing newTitle for update_project_title.` });
                                      else { output = await update_project_title_tool(currentToolProjectId!, updateArgs.newTitle); toolExecuted = true; } break; }
                                case "get_script":
                                    output = await get_script_tool(currentToolProjectId!); toolExecuted = true; break;
                                case "create_new_script":
                                    { const scriptArgs = args as CreateScriptArgs;
                                      if (!scriptArgs.topic || !scriptArgs.generatedScript) output = JSON.stringify({ error: `Missing topic or generatedScript for create_new_script.` });
                                      else { output = await create_new_script_tool(currentToolProjectId!, scriptArgs.topic, scriptArgs.generatedScript); toolExecuted = true; } break; }
                                case "get_project_product_image_url":
                                    output = await get_project_product_image_url_tool(currentToolProjectId!); toolExecuted = true; break;
                                case "trigger_product_shoot":
                                    { const shootArgs = args as TriggerShootArgs;
                                      if (!shootArgs.prompt) output = JSON.stringify({ error: `Missing prompt for trigger_product_shoot.` });
                                      else { output = await trigger_product_shoot_tool( currentToolProjectId!, shootArgs.prompt, shootArgs.referenceImageUrl, shootArgs.aspectRatio, shootArgs.placementType, shootArgs.manualPlacement, shootArgs.generationType, shootArgs.optimizeDescription, shootArgs.fastMode, shootArgs.originalQuality ); toolExecuted = true; } break; }
                                case "get_scene_image_url":
                                    { const sceneArgs = args as SceneArgs;
                                       if (!sceneArgs.sceneId) output = JSON.stringify({ error: `Missing sceneId for get_scene_image_url.` });
                                       else { output = await get_scene_image_url_tool(currentToolProjectId!, sceneArgs.sceneId); toolExecuted = true; } break; }
                                case "save_scene_description":
                                    { const saveArgs = args as SaveDescriptionArgs;
                                       if (!saveArgs.sceneId || !saveArgs.description) output = JSON.stringify({ error: `Missing sceneId or description for save_scene_description.` });
                                       else { output = await save_scene_description_tool(currentToolProjectId!, saveArgs.sceneId, saveArgs.description); toolExecuted = true; } break; }
                                default:
                                    console.warn(`[WARN] [${requestId}] Unknown tool function called: ${functionName}`);
                                    output = JSON.stringify({ error: `Unknown tool function: ${functionName}` });
                            }
                        } catch (toolError) {
                            console.error(`[ERROR] [${requestId}] Error executing tool ${functionName}:`, toolError);
                            output = JSON.stringify({ error: `Tool execution failed: ${toolError.message}` });
                        } // End try block for tool execution
                    } // End if !output

                    if (toolExecuted) console.log(`[INFO] [${requestId}] Tool ${functionName} executed successfully.`);
                    toolOutputs.push({ tool_call_id: toolCallId, output: output });
                } // End else (not delegate_task)
            } // End loop through toolCalls

            // --- Submit Outputs or Handle Delegation ---
            console.log(`[INFO] [${requestId}] Submitting ${toolOutputs.length} tool output(s) for run ${run.id}`);
            const submitOutputResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${run.id}/submit_tool_outputs`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_API_KEY}`, "OpenAI-Beta": "assistants=v2" },
                body: JSON.stringify({ tool_outputs: toolOutputs }),
            });

            if (!submitOutputResponse.ok) {
                const errorData = await submitOutputResponse.json();
                 // If the run is no longer in requires_action state (e.g., expired, cancelled), we might still have a delegation request to process
                if (errorData?.code === 'run_not_in_required_action_state' && delegationRequest) {
                     console.warn(`[WARN] [${requestId}] Run ${run.id} no longer requires action, but delegation was requested. Proceeding with delegation.`);
                     return { run: run, delegationRequest: delegationRequest }; // Return the *current* run state and the delegation request
                } else if (errorData?.code === 'run_not_in_required_action_state') {
                     console.warn(`[WARN] [${requestId}] Run ${run.id} no longer requires action. Re-polling.`);
                     // Need to re-poll the run status as it might have completed/failed while we processed tools
                     // Re-enter polling by calling processAssistantRun again, but without initial message
                     return processAssistantRun(threadId, assistantId, runMetadata, requestId, undefined, projectIdForContext);
                } else {
                     console.error(`[ERROR] [${requestId}] Failed to submit tool outputs: ${JSON.stringify(errorData)}`);
                     throw new Error(`Failed to submit tool outputs: ${errorData?.error?.message || 'Unknown error'}`);
                }
            } else {
                run = await submitOutputResponse.json(); // Get updated run status after submission
                console.log(`[INFO] [${requestId}] Tool outputs submitted successfully for run ${run.id}. New status: ${run.status}`);
                 // If delegation was requested, return the signal NOW after successful submission
                 if (delegationRequest) {
                     console.log(`[INFO] [${requestId}] Returning delegation signal for run ${run.id}.`);
                     return { run: run, delegationRequest: delegationRequest }; // Return the *updated* run state and the delegation request
                 }
                 // Otherwise, continue polling this run if it's not terminal yet
                 if (!terminalStates.includes(run.status)) {
                    console.log(`[INFO] [${requestId}] Continuing polling run ${run.id}...`);
                    // Re-enter polling by calling processAssistantRun again, but without initial message
                    return processAssistantRun(threadId, assistantId, runMetadata, requestId, undefined, projectIdForContext);
                 }
            }
        } // End if requires_action

        // 5. Return final run object if polling finished without requires_action or after submission led to completion/failure
        console.log(`[INFO] [${requestId}] Run ${run.id} reached final state: ${run.status}`);
        if (run.status === "completed") {
             return { run: run };
        } else if (run.status === "failed" || run.status === "cancelled" || run.status === "expired") {
             console.error(`[ERROR] [${requestId}] Run ${run.id} ended with status: ${run.status}. Error: ${JSON.stringify(run.last_error)}`);
             throw new Error(`Run failed with status ${run.status}: ${run.last_error?.message || 'Unknown error'}`);
        } else {
             // Should not happen if logic is correct
             console.error(`[ERROR] [${requestId}] Reached end of processAssistantRun unexpectedly. Run status: ${run.status}`);
             throw new Error(`Run ended with unexpected status: ${run.status}`);
        }

    } catch (error) {
        console.error(`[ERROR] [${requestId}] Error in processAssistantRun: ${error.message}`, error.stack);
        // Ensure the error object has a message property
        const errorMessage = error instanceof Error ? error.message : String(error);
        return { run: null, error: new Error(errorMessage) }; // Return error object
    }
}

// --- End Refactored Logic ---


// --- Main Server Logic ---
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
      });
      if (!threadResponse.ok) throw new Error("Failed to create thread.");
      const thread = await threadResponse.json();
      currentThreadId = thread.id;
      console.log(`[INFO] [${requestId}] Created new thread: ${currentThreadId}`);
    } else {
      console.log(`[INFO] [${requestId}] Using existing thread: ${currentThreadId}`);
    }

    // --- Orchestration Loop ---
    let currentAssistantId = VIDEO_PROJECT_ASSISTANT_ID; // Start with Project Manager
    let currentInput: string | any[] = input; // Initial user input
    let runMetadata = { project_id: projectId, user_id: userId, request_id: requestId };
    let finalResponseContent: any = null;
    let loopCount = 0;
    const maxLoops = 10; // Prevent infinite loops

    while (loopCount < maxLoops) {
        loopCount++;
        console.log(`\n[INFO] [${requestId}] --- Orchestration Loop ${loopCount} ---`);
        console.log(`[INFO] [${requestId}] Running assistant: ${currentAssistantId} on thread: ${currentThreadId}`);
        console.log(`[INFO] [${requestId}] Input for this run:`, typeof currentInput === 'string' ? currentInput.substring(0,100)+'...' : '[Vision Input]');

        const runResult = await processAssistantRun(
            currentThreadId,
            currentAssistantId,
            runMetadata,
            requestId,
            currentInput, // Pass the current input (user message or tool result)
            projectId // Pass projectId for context/validation
        );

        if (runResult.error) {
            console.error(`[ERROR] [${requestId}] Error during assistant run:`, runResult.error);
            throw runResult.error; // Throw to be caught by the main try/catch
        }

        const run = runResult.run;

        // Check for Delegation Request
        if (runResult.delegationRequest) {
            const delegation = runResult.delegationRequest;
            console.log(`[INFO] [${requestId}] Delegation requested to: ${delegation.targetAssistant}`);
            console.log(`[INFO] [${requestId}] Task: ${delegation.taskDescription}`);

            // Map target assistant name/identifier to actual ID
            let targetAssistantId = "";
            let specializedInput: string | any[] = delegation.taskDescription; // Default input is the task description

            // --- Map Friendly Name to Assistant ID ---
            const targetLower = delegation.targetAssistant.toLowerCase();
            if (targetLower.includes("script writer")) targetAssistantId = SCRIPT_WRITER_ASSISTANT_ID;
            else if (targetLower.includes("image prompt generator")) targetAssistantId = IMAGE_PROMPT_GENERATOR_ASSISTANT_ID;
            else if (targetLower.includes("scene describer text")) targetAssistantId = SCENE_DESCRIBER_TEXT_ASSISTANT_ID;
            else if (targetLower.includes("scene describer image")) targetAssistantId = SCENE_DESCRIBER_IMAGE_ASSISTANT_ID;
            else {
                 console.error(`[ERROR] [${requestId}] Unknown target assistant for delegation: ${delegation.targetAssistant}`);
                 // Feed back error to Project Manager
                 currentAssistantId = VIDEO_PROJECT_ASSISTANT_ID;
                 currentInput = `Delegation failed: Unknown target assistant '${delegation.targetAssistant}'. Please specify a valid assistant (Script Writer, Image Prompt Generator, Scene Describer Text, Scene Describer Image) or handle the task yourself.`;
                 continue; // Restart loop with PM and error message
            }

            if (!targetAssistantId) {
                 console.error(`[ERROR] [${requestId}] Assistant ID not configured for target: ${delegation.targetAssistant}`);
                 currentAssistantId = VIDEO_PROJECT_ASSISTANT_ID;
                 currentInput = `Delegation failed: Assistant ID for '${delegation.targetAssistant}' is not configured in the environment variables. Please inform the administrator.`;
                 continue; // Restart loop with PM and error message
            }

            // --- Prepare Input for Specialized Assistant ---
            // Add context if needed, especially for vision
            let additionalContext = "";
            if (delegation.context?.projectId) additionalContext += `\nProject ID: ${delegation.context.projectId}`;
            if (delegation.context?.sceneId) additionalContext += `\nScene ID: ${delegation.context.sceneId}`;
            if (delegation.context?.topic) additionalContext += `\nTopic: ${delegation.context.topic}`;
            if (delegation.context?.previousResults) additionalContext += `\nPrevious Results: ${JSON.stringify(delegation.context.previousResults)}`;

            // Special handling for Scene Describer (Image) - requires image URL
            if (targetAssistantId === SCENE_DESCRIBER_IMAGE_ASSISTANT_ID) {
                let imageUrl = delegation.context?.imageUrl;
                if (!imageUrl && delegation.context?.sceneId) {
                    // Attempt to fetch image URL if sceneId is provided but URL isn't
                    console.log(`[INFO] [${requestId}] Fetching image URL for Scene Describer (Image) using sceneId: ${delegation.context.sceneId}`);
                    try {
                        const sceneUrlResultStr = await get_scene_image_url_tool(projectId, delegation.context.sceneId);
                        const sceneUrlResult = JSON.parse(sceneUrlResultStr);
                        if (sceneUrlResult.success && sceneUrlResult.imageUrl) {
                            imageUrl = sceneUrlResult.imageUrl;
                            console.log(`[INFO] [${requestId}] Fetched image URL: ${imageUrl}`);
                        } else {
                             throw new Error(sceneUrlResult.error || "Failed to fetch scene image URL.");
                        }
                    } catch (fetchError) {
                         console.error(`[ERROR] [${requestId}] Failed to fetch image URL for Scene Describer (Image):`, fetchError);
                         currentAssistantId = VIDEO_PROJECT_ASSISTANT_ID;
                         currentInput = `Delegation failed: Could not get the image URL for scene ${delegation.context.sceneId} needed by the Scene Describer (Image) assistant. Error: ${fetchError.message}`;
                         continue; // Restart loop with PM and error message
                    }
                }

                if (!imageUrl) {
                     console.error(`[ERROR] [${requestId}] Missing image URL for Scene Describer (Image) assistant.`);
                     currentAssistantId = VIDEO_PROJECT_ASSISTANT_ID;
                     currentInput = `Delegation failed: An image URL is required for the Scene Describer (Image) assistant, but none was provided or could be found.`;
                     continue; // Restart loop with PM and error message
                }

                // Format input for Vision model
                specializedInput = [
                    { type: "text", text: `${delegation.taskDescription}${additionalContext}\nDescribe the following image:` },
                    { type: "image_url", image_url: { url: imageUrl } }
                ];
            } else {
                 // For text-based assistants, just append context
                 specializedInput = `${delegation.taskDescription}${additionalContext}`;
            }


            // Set up for the next loop iteration with the specialized assistant
            currentAssistantId = targetAssistantId;
            currentInput = specializedInput;
            // Keep the same metadata for the specialized run
            console.log(`[INFO] [${requestId}] Switching to specialized assistant: ${currentAssistantId}`);
            continue; // Go to the next iteration to run the specialized assistant

        } // End if delegationRequest

        // If run completed (and no delegation was requested in this step)
        if (run.status === "completed") {
            console.log(`[INFO] [${requestId}] Run ${run.id} completed by assistant ${currentAssistantId}.`);

            // Retrieve the latest message from the assistant
            const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/messages?limit=1&order=desc`, {
                headers: { "Authorization": `Bearer ${OPENAI_API_KEY}`, "OpenAI-Beta": "assistants=v2" },
            });
            if (!messagesResponse.ok) throw new Error("Failed to retrieve messages.");
            const messagesData = await messagesResponse.json();
            const lastMessage = messagesData.data?.[0];

            if (lastMessage && lastMessage.role === "assistant") {
                 const assistantResponseContent = lastMessage.content?.[0]?.text?.value || "Assistant provided no text response.";
                 console.log(`[INFO] [${requestId}] Assistant ${currentAssistantId} response: ${assistantResponseContent.substring(0,150)}...`);

                 // Check if this was the specialized assistant finishing its task
                 if (currentAssistantId !== VIDEO_PROJECT_ASSISTANT_ID) {
                     console.log(`[INFO] [${requestId}] Specialized assistant finished. Feeding result back to Project Manager.`);
                     // Feed the result back to the Project Manager
                     currentAssistantId = VIDEO_PROJECT_ASSISTANT_ID;
                     currentInput = `The ${getAssistantFriendlyName(lastMessage.assistant_id)} assistant completed its task. Result:\n\n${assistantResponseContent}\n\nPlease review this result and decide the next step.`;
                     // Optionally save the result using a tool here if needed, e.g., save_scene_description
                     // Example: If it was Scene Describer, maybe call save_scene_description_tool
                     // This requires parsing the context from the *previous* delegation request.
                     continue; // Go to the next iteration to run the Project Manager again
                 } else {
                     // This was the Project Manager's final response
                     console.log(`[INFO] [${requestId}] Project Manager finished. Preparing final response.`);
                     finalResponseContent = assistantResponseContent;
                     break; // Exit the orchestration loop
                 }
            } else {
                 console.warn(`[WARN] [${requestId}] Could not retrieve a valid assistant message after completed run ${run.id}.`);
                 finalResponseContent = "An internal error occurred: Could not retrieve assistant response.";
                 break; // Exit loop with error message
            }
        } else {
             // Handle unexpected run statuses (failed, cancelled, expired) - processAssistantRun should throw, but handle defensively
             console.error(`[ERROR] [${requestId}] Run ${run.id} ended with unexpected status: ${run.status}`);
             finalResponseContent = `An internal error occurred: Assistant run failed with status ${run.status}.`;
             break; // Exit loop
        }

    } // End while loop

    if (loopCount >= maxLoops) {
        console.error(`[ERROR] [${requestId}] Orchestration loop exceeded maximum iterations (${maxLoops}).`);
        throw new Error("Processing timed out due to excessive internal steps.");
    }

    if (!finalResponseContent) {
         console.error(`[ERROR] [${requestId}] Orchestration loop finished without generating a final response.`);
         throw new Error("Failed to generate a final response.");
    }

    // Return the final response from the Project Manager
    return new Response(JSON.stringify({ response: finalResponseContent, thread_id: currentThreadId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error(`[FATAL] [${requestId}] Error in main handler:`, error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

// Helper to get a friendly name (optional)
function getAssistantFriendlyName(assistantId: string): string {
    if (assistantId === SCRIPT_WRITER_ASSISTANT_ID) return "Script Writer";
    if (assistantId === IMAGE_PROMPT_GENERATOR_ASSISTANT_ID) return "Image Prompt Generator";
    if (assistantId === SCENE_DESCRIBER_TEXT_ASSISTANT_ID) return "Scene Describer (Text)";
    if (assistantId === SCENE_DESCRIBER_IMAGE_ASSISTANT_ID) return "Scene Describer (Image)";
    if (assistantId === VIDEO_PROJECT_ASSISTANT_ID) return "Project Manager";
    return "Specialized Assistant";
}
