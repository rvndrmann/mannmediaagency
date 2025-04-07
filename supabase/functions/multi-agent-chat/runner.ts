// @deno-types="https://deno.land/x/deno/cli/dts/lib.deno.d.ts" // Add Deno types hint
// supabase/functions/multi-agent-chat/runner.ts
// @ts-ignore Deno specific import
import OpenAI from "https://esm.sh/openai@^4.26.0";
// @ts-ignore Deno specific import
import { delay } from "https://deno.land/std@0.208.0/async/delay.ts"; // For polling delay
// @ts-ignore Deno specific type import
import type { ThreadMessage } from "https://esm.sh/openai@^4.26.0/resources/beta/threads/messages/messages";
// @ts-ignore Deno specific type import
import type { Assistant, AssistantTool } from "https://esm.sh/openai@^4.26.0/resources/beta/assistants/assistants";
// @ts-ignore Deno specific import
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'; // Import Supabase client
// 1. Initialize OpenAI Client
// Ensure OPENAI_API_KEY is set in Supabase Function settings
// @ts-ignore Deno specific global
const apiKey = Deno.env.get("OPENAI_API_KEY");
// @ts-ignore Deno specific global
const supabaseUrl = Deno.env.get("SUPABASE_URL");
// @ts-ignore Deno specific global
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

if (!apiKey || !supabaseUrl || !supabaseAnonKey) {
  console.error("Missing required environment variables: OPENAI_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY");
  // In a real scenario, you might throw an error or handle this differently
}
const openai = new OpenAI({ apiKey });
// Initialize Supabase client (use service_role key if needing to bypass RLS for internal functions)
// Global Supabase client initialization is removed/commented out.

// 2. Define Tool Specification
const GET_CURRENT_TIME_TOOL = {
  type: "function" as const, // Ensure 'function' is treated as a literal type
  function: {
    name: "getCurrentTime",
    description: "Gets the current date and time.",
    parameters: { type: "object", properties: {} }, // No parameters
  },
};

// Define the new tool for image generation
const GENERATE_IMAGE_TOOL = {
  type: "function" as const,
  function: {
    name: "generateImage",
    description: "Generates an image based on a prompt. Use this when the user asks for an image.",
    parameters: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "The detailed prompt for image generation.",
        },
      },
      required: ["prompt"],
    },
  },
};

// --- Canvas Project Tools ---

const GET_PROJECT_DETAILS_TOOL = {
  type: "function" as const,
  function: {
    name: "get_project_details",
    description: "Fetches detailed information about the current canvas project, including its scenes.",
    // No parameters needed, operates on the current project context (projectId from runOrchestrator)
  },
};

const UPDATE_PROJECT_SCRIPT_TOOL = {
  type: "function" as const,
  function: {
    name: "update_project_script",
    description: "Updates the full script text for a specific canvas project.",
    parameters: {
      type: "object",
      properties: {
        projectId: {
          type: "string",
          description: "The ID of the canvas project whose script needs updating.",
        },
        newScript: {
          type: "string",
          description: "The new full script content.",
        },
      },
      required: ["projectId", "newScript"],
    },
  },
};

const ADD_SCENE_TOOL = {
  type: "function" as const,
  function: {
    name: "add_scene",
    description: "Adds a new scene to a specific canvas project.",
    parameters: {
      type: "object",
      properties: {
        projectId: {
          type: "string",
          description: "The ID of the canvas project to add the scene to.",
        },
        sceneNumber: {
          type: "integer",
          description: "The sequential number for the new scene.",
        },
        script: {
          type: "string",
          description: "The script content for the new scene (optional).",
        },
        imagePrompt: {
           type: "string",
           description: "The image prompt for the new scene (optional)."
        },
        voiceover: {
           type: "string",
           description: "The voiceover text for the new scene (optional)."
        }
        // Add other optional fields like image_prompt, voiceover if needed
      },
      required: ["projectId", "sceneNumber"],
    },
  },
};

const UPDATE_SCENE_SCRIPT_TOOL = {
   type: "function" as const,
   function: {
       name: "update_scene_script",
       description: "Updates the script content for a specific scene within a project.",
       parameters: {
           type: "object",
           properties: {
               sceneId: {
                   type: "string",
                   description: "The ID of the scene whose script needs updating."
               },
               newScript: {
                   type: "string",
                   description: "The new script content for the scene."
               }
           },
           required: ["sceneId", "newScript"]
       }
   }
};

const UPDATE_SCENE_IMAGE_PROMPT_TOOL = {
    type: "function" as const,
    function: {
        name: "update_scene_image_prompt",
        description: "Updates the image prompt for a specific scene within a project.",
        parameters: {
            type: "object",
            properties: {
                sceneId: {
                    type: "string",
                    description: "The ID of the scene whose image prompt needs updating."
                },
                newImagePrompt: {
                    type: "string",
                    description: "The new image prompt for the scene."
                }
            },
            required: ["sceneId", "newImagePrompt"]
        }
    }
 };

 const DELETE_SCENE_TOOL = {
    type: "function" as const,
    function: {
        name: "delete_scene",
        description: "Deletes a specific scene from a project.",
        parameters: {
            type: "object",
            properties: {
                sceneId: {
                    type: "string",
                    description: "The ID of the scene to delete."
                }
            },
            required: ["sceneId"]
        }
    }
 };

// TODO: Add tools for update_scene_voiceover, delete_project

// 3. Define Orchestrator Instructions (Updated)
const ORCHESTRATOR_INSTRUCTIONS = `
You are the Video Script Planner agent.
Your primary role is to collaborate with the user to define, refine, and finalize the script and scene details for a video project.
You have access to tools to manage the project's script and scenes: 'get_project_details', 'update_project_script', 'add_scene', 'update_scene_script', 'update_scene_image_prompt', and 'delete_scene'. Use them as needed to fulfill user requests related to planning the video content.
- Use 'get_project_details' to understand the current state of the script and scenes.
- Use 'update_project_script' to modify the overall project script.
- Use 'add_scene' to add new scenes based on user input.
- Use 'update_scene_script' to change the text for a specific scene.
- Use 'update_scene_image_prompt' to change the image description for a specific scene.
- Use 'delete_scene' to remove scenes.
Core Responsibilities:
1.  **Understand User Intent:** Analyze the user's message to understand their goals for the video script and scenes.
2.  **Collaborative Planning:** Work with the user iteratively. Suggest changes, ask clarifying questions, and incorporate feedback to build the script and scene details (text, image prompts, voiceover ideas if discussed).
3.  **Maintain Context:** Keep track of the conversation and the current state of the project plan using 'get_project_details' when necessary. Pay attention to project context provided (e.g., 'Current Project Script: ...').
4.  **Use Tools for Modification:** When the user requests changes (add, update, delete scenes or script parts), use the appropriate tool.
    *   **IMPORTANT:** When asked to update or delete a specific scene referenced by its number (e.g., 'update scene 2', 'delete scene 3'), you **must** first call the 'get_project_details' tool to retrieve the list of scenes and find the correct 'sceneId' (UUID) corresponding to that scene number. Then, you must use that retrieved 'sceneId' (UUID) when calling the appropriate update or delete tool (e.g., 'update_scene_image_prompt', 'delete_scene'). Do not pass the scene number directly to update/delete tools.
5.  **Seek Confirmation:** Regularly confirm with the user if the script/scene details are accurate and meet their requirements.
6.  **Finalize and Handoff:** Once the user explicitly confirms the entire plan (script and all scene details) is complete and approved, clearly state that the plan is finalized and ready for the next step (video generation). For example, respond with: "Okay, the script and scene plan is finalized and ready for video generation." Do NOT use tools after this point unless the user explicitly asks for further revisions to the plan.
Interaction Flow:
- Receive user message (potentially prefixed with project context).
- Analyze intent regarding script/scene planning.
- **Decision Point:**
    - If the user asks about the current plan, call 'get_project_details'.
    - If the user requests additions/modifications to the script/scenes, use the relevant tools ('add_scene', 'update_project_script', 'update_scene_script', 'update_scene_image_prompt', 'delete_scene'), remembering to get the 'sceneId' via 'get_project_details' first if needed.
    - If the user provides feedback, discuss and potentially use tools to update the plan.
    - If the user confirms the plan is final, provide the confirmation message ("Okay, the script and scene plan is finalized and ready for video generation.") and stop further actions unless asked for revisions.
- Provide clear responses, showing updated script sections or confirming actions taken.
Keep your responses focused on script and scene planning. Do not perform tasks outside this scope (like generating images directly or telling the time).
`;

// 4. Define Assistant Name and Cache
const ORCHESTRATOR_ASSISTANT_NAME = "VIDEO_PROJECT_ASSISTANT_ID"; // Use the exact Assistant name provided
let orchestratorAssistantId: string | null = null; // Cache in memory for the function invocation lifetime

// 5. Helper function to find, create, or update the Orchestrator Assistant
async function getOrCreateOrchestratorAssistant(): Promise<string> {
  // Check cache first
  if (orchestratorAssistantId) {
    console.log(`[Trace] Using cached Assistant ID: ${orchestratorAssistantId}`);
    // If cached, it must be a string from a previous successful run within this invocation.
    return orchestratorAssistantId;
  }

  console.log(`[Trace] Searching for Assistant named "${ORCHESTRATOR_ASSISTANT_NAME}"...`);
  try {
    const assistantsList = await openai.beta.assistants.list({ limit: 100 });
    const existingAssistant = assistantsList.data.find(
      (assistant: Assistant) => assistant.name === ORCHESTRATOR_ASSISTANT_NAME
    );

    let assistantIdToReturn: string; // Use a local variable for clarity

    // Define the desired state
    const desiredAssistantConfig = {
        name: ORCHESTRATOR_ASSISTANT_NAME,
        instructions: ORCHESTRATOR_INSTRUCTIONS,
        model: "gpt-4o", // Or your preferred model
        tools: [
          // GET_CURRENT_TIME_TOOL, // Removed - Out of scope for Planner Agent
          // GENERATE_IMAGE_TOOL, // Removed - Out of scope for Planner Agent
          GET_PROJECT_DETAILS_TOOL,
          UPDATE_PROJECT_SCRIPT_TOOL,
          ADD_SCENE_TOOL,
          UPDATE_SCENE_SCRIPT_TOOL,
          UPDATE_SCENE_IMAGE_PROMPT_TOOL,
          DELETE_SCENE_TOOL
        ],
    };

    if (existingAssistant) {
      console.log(`[Trace] Found existing Assistant ID: ${existingAssistant.id}`);
      // Check if update is needed (simple check based on instructions and tool count for this example)
      // A more robust check might involve deep comparison of tools array.
      if (
        existingAssistant.instructions !== desiredAssistantConfig.instructions ||
        existingAssistant.tools.length !== desiredAssistantConfig.tools.length ||
        // Basic check if tool names match (can be improved)
        // Explicitly type the parameters in the callback
        !existingAssistant.tools.every((tool: AssistantTool, index: number) =>
            tool.type === 'function' && desiredAssistantConfig.tools[index].type === 'function' &&
            // Cast tool to any temporarily if function property isn't directly recognized on AssistantTool type
            // Or use a type guard if preferred and feasible
            (tool as any).function?.name === (desiredAssistantConfig.tools[index] as any).function?.name
        )
      ) {
        console.log(`[Trace] Assistant configuration differs. Updating Assistant ID: ${existingAssistant.id}...`);
        const updatedAssistant = await openai.beta.assistants.update(existingAssistant.id, desiredAssistantConfig);
        console.log(`[Trace] Assistant updated successfully.`);
        assistantIdToReturn = updatedAssistant.id;
      } else {
        console.log(`[Trace] Existing Assistant configuration matches. No update needed.`);
        assistantIdToReturn = existingAssistant.id;
      }
    } else {
      console.log(`[Trace] Assistant not found. Creating new Assistant: "${ORCHESTRATOR_ASSISTANT_NAME}"...`);
      const newAssistant = await openai.beta.assistants.create(desiredAssistantConfig);
      console.log(`[Trace] Created new Assistant ID: ${newAssistant.id}`);
      assistantIdToReturn = newAssistant.id;
      // Note: For persistence across invocations, store this ID externally.
    }

    // Cache the successfully retrieved/created ID
    orchestratorAssistantId = assistantIdToReturn;
    return assistantIdToReturn; // Return the guaranteed string

  } catch (error) {
    console.error("[Error] Failed to list or create Assistant:", error);
    // Ensure the function throws, preventing a null return on error.
    throw new Error(`Failed to get or create orchestrator assistant: ${error instanceof Error ? error.message : String(error)}`);
  }
}
// 6. Define the Runner Function
// This function is called by index.ts
export async function runOrchestrator(
  userInput: string,
  projectId?: string, // Add projectId parameter
  authHeader?: string | null, // Add authHeader for RLS
  threadId?: string // Optional thread ID for existing conversations
  // Note: We are passing projectId to the function, but it's primarily used for context fetching now.
  // The tools themselves will receive the projectId via arguments from the Assistant.
): Promise<{ response?: string; error?: string; details?: string; threadId?: string }> {
  console.log(`[Trace] runOrchestrator called with input: "${userInput}", Thread ID: ${threadId}`);

  if (!apiKey) {
    console.error("[Error] OpenAI API Key not configured.");
    return {
      error: "OpenAI API Key not configured on the server.",
      details: "The OPENAI_API_KEY environment variable is missing.",
    };
  }

  try {
    // Initialize Supabase client with user's auth context if available
    const supabaseClient = createClient(supabaseUrl || '', supabaseAnonKey || '', {
      global: { headers: { ...(authHeader ? { Authorization: authHeader } : {}) } },
      auth: {
        // Optional: configure autoRefreshToken, persistSession if needed,
        // but for edge functions, passing the header is usually sufficient per request.
      }
    });
    console.log(`[Trace] Supabase client initialized ${authHeader ? 'with' : 'without'} user auth header.`);

    // Removing the duplicate supabaseClient initialization block that was inserted erroneously.
    console.log("[Trace] Getting or creating Orchestrator Assistant...");
    const assistantId = await getOrCreateOrchestratorAssistant();
    console.log(`[Trace] Using Assistant ID: ${assistantId}`);

    let currentThreadId: string;

    // 1. Determine Thread ID (Create or Reuse)
    if (threadId) {
      console.log(`[Trace] Using existing Thread ID: ${threadId}`);
      // Optional: Validate thread exists? For now, assume it does if provided.
      currentThreadId = threadId;
    } else {
      console.log("[Trace] Creating new Thread...");
      const thread = await openai.beta.threads.create();
      currentThreadId = thread.id;
      console.log(`[Trace] Created new Thread ID: ${currentThreadId}`);
    }

    // 2. Fetch Project Context (if projectId is provided)
    let projectContextString = "";
    if (projectId) {
      console.log(`[Trace] Fetching context for projectId: ${projectId}`);
      try {
        // Fetch project data without .single() to handle 0 rows gracefully
        const { data: projectDataArray, error: projectError } = await supabaseClient
          .from('canvas_projects') // Correct table name
          .select('full_script') // Correct column name
          .eq('id', projectId)
          .limit(1); // Limit to 1 row just in case of duplicates, but don't error if 0

        // Check for errors or if no data was returned
        const projectData = projectDataArray?.[0]; // Get the first element if it exists

        if (projectError) {
          console.error(`[Error] Failed to fetch project context for ${projectId}:`, projectError);
          // Decide if this is fatal or just continue without context
          projectContextString = `Error fetching project context: ${projectError.message}`;
        } else if (projectData && projectData.full_script) { // Check correct column name
          console.log(`[Trace] Successfully fetched script context for ${projectId}.`); // Log remains the same
          projectContextString = `Current Project Script:\n---\n${projectData.full_script}\n---\n`; // Use correct column name
        } else {
          console.warn(`[Warn] Project ${projectId} found, but full_script is empty or missing.`); // Check correct column name
          projectContextString = "Project context found, but the script appears to be empty.\n";
        }
      } catch (fetchError) {
         console.error(`[Error] Exception during project context fetch for ${projectId}:`, fetchError);
         projectContextString = `Exception fetching project context: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}\n`;
      }
    } else {
       console.log("[Trace] No projectId provided, proceeding without project context.");
    }

    // 3. Add User Message (with context) to Thread
    const messageContent = projectContextString
      ? `${projectContextString}\nUser Request:\n${userInput}`
      : userInput;

    console.log(`[Trace] Adding message to Thread ID: ${currentThreadId}`);
    await openai.beta.threads.messages.create(currentThreadId, {
      role: "user",
      content: messageContent,
    });
    console.log("[Trace] Message added.");

    // 4. Create a Run
    console.log(`[Trace] Creating Run for Thread ID: ${currentThreadId} with Assistant ID: ${assistantId}`);
    let run = await openai.beta.threads.runs.create(currentThreadId, {
      assistant_id: assistantId,
      // instructions: ORCHESTRATOR_INSTRUCTIONS, // Instructions are part of the Assistant definition now
      // tools: [], // Tools are part of the Assistant definition now
    });
    console.log(`[Trace] Run created with ID: ${run.id}`);

    // 5. Poll for Run Completion (Handles requires_action)
    const terminalStates = ["completed", "failed", "cancelled", "expired"];
    const pollingStartTime = Date.now();
    const MAX_POLLING_DURATION_MS = 5 * 60 * 1000; // 5 minutes timeout for polling

    while (!terminalStates.includes(run.status)) {
      // Check for timeout
      if (Date.now() - pollingStartTime > MAX_POLLING_DURATION_MS) {
        console.error(`[Error] Polling timed out for Run ID: ${run.id}`);
        // Attempt to cancel the run
        try {
          await openai.beta.threads.runs.cancel(currentThreadId, run.id);
          console.log(`[Trace] Attempted to cancel timed-out Run ID: ${run.id}`);
        } catch (cancelError) {
          console.error(`[Error] Failed to cancel timed-out Run ID: ${run.id}`, cancelError);
        }
        return {
          error: "Orchestrator run polling timed out.",
          details: `Run ${run.id} did not complete within the time limit.`,
          threadId: currentThreadId,
        };
      }

      await delay(1000); // Wait 1 second
      console.log(`[Trace] Polling Run ID: ${run.id}, Status: ${run.status}`);
      run = await openai.beta.threads.runs.retrieve(currentThreadId, run.id);

      if (run.status === "requires_action") {
        console.log(`[Trace] Run ${run.id} requires action (submit_tool_outputs).`);
        if (run.required_action?.type === "submit_tool_outputs") {
          const toolOutputs = [];
          const toolCalls = run.required_action.submit_tool_outputs.tool_calls;

          for (const toolCall of toolCalls) {
            let output = "";
            const functionName = toolCall.function.name;
            console.log(`[Trace] Processing tool call: ${functionName} (ID: ${toolCall.id})`);

            if (functionName === "getCurrentTime") {
              try {
                output = new Date().toISOString();
                console.log(`[Trace] Executed getCurrentTime. Output: ${output}`);
              } catch (toolError) {
                 console.error(`[Error] Error executing tool ${functionName}:`, toolError);
                 output = `Error executing tool: ${toolError instanceof Error ? toolError.message : String(toolError)}`;
              }
            } else if (functionName === "generateImage") {
              try {
                // Safely parse arguments
                const args = JSON.parse(toolCall.function.arguments);
                const prompt = args.prompt;
                if (typeof prompt !== 'string') {
                  throw new Error("Invalid 'prompt' argument: not a string.");
                }
                console.log(`[Trace] Handling generateImage call with prompt: "${prompt}"`);
                // Simulate specialist invocation - replace with actual call later
                output = `Image generation request received for prompt: '${prompt}'. Placeholder image URL: http://example.com/placeholder.png`;
                console.log(`[Trace] Simulated generateImage output: ${output}`);
              } catch (parseError) {
                 console.error(`[Error] Failed to parse arguments for ${functionName}:`, toolCall.function.arguments, parseError);
                 output = `Error processing ${functionName}: Invalid arguments provided. ${parseError instanceof Error ? parseError.message : String(parseError)}`;
              }
            } else if (functionName === "get_project_details") {
              try {
                // No arguments to parse for get_project_details
                const currentProjectId = projectId; // Use projectId from runOrchestrator scope
                if (!currentProjectId) {
                  throw new Error("No project context (projectId) available for get_project_details tool.");
                }
                console.log(`[Trace] Handling get_project_details call for current projectId: ${currentProjectId}`);
                // Fetch project and its scenes. RLS should enforce user access.
                // Ensure the Supabase client is initialized correctly with user's context if RLS depends on it,
                // or use service_role key if this function is trusted to bypass RLS for internal operations.
                // For now, assuming anon key + RLS policies are sufficient.
                // Fetch all project columns and related scenes, ordering scenes inline
                const { data, error } = await supabaseClient
                  .from('canvas_projects')
                  .select(
                    `*, canvas_scenes!left(id, scene_order, script, image_prompt, voice_over_text, created_at, order=scene_order.asc)` // Use LEFT join, scene_order, voice_over_text
                  )
                  .eq('id', currentProjectId) // Use the projectId from the function scope
                  .single(); // Use single() here as we expect exactly one project for the ID

                if (error) {
                  console.error(`[Error] Supabase error fetching project ${currentProjectId}:`, error);
                  // Provide a more informative error back to the assistant
                  throw new Error(`Database error fetching project details: ${error.message}. Check RLS policies if access denied.`);
                }
                if (!data) {
                   // This case might be handled by RLS or the project simply doesn't exist
                   throw new Error(`Project with ID ${currentProjectId} not found or access denied.`);
                }
                output = JSON.stringify(data); // Return the fetched data as JSON string
                console.log(`[Trace] Executed get_project_details. Output length: ${output.length}`);

              } catch (toolError) {
                console.error(`[Error] Error executing tool ${functionName}:`, toolError);
                output = `Error executing tool ${functionName}: ${toolError instanceof Error ? toolError.message : String(toolError)}`;
              }
            } else if (functionName === "update_project_script") {
              try {
                const args = JSON.parse(toolCall.function.arguments);
                const toolProjectId = args.projectId;
                const newScript = args.newScript;
                if (!toolProjectId || typeof toolProjectId !== 'string') {
                  throw new Error("Missing or invalid 'projectId' argument.");
                }
                 if (typeof newScript !== 'string') { // Allow empty script by checking type only
                  throw new Error("Missing or invalid 'newScript' argument (must be a string).");
                }
                console.log(`[Trace] Handling update_project_script call for projectId: ${toolProjectId}`);

                // Update the script. RLS should enforce ownership.
                // Ensure the Supabase client used here operates under the correct user context for RLS.
                const { error } = await supabaseClient
                  .from('canvas_projects')
                  .update({ full_script: newScript, updated_at: new Date().toISOString() }) // Also update timestamp
                  .eq('id', toolProjectId); // Match the project ID
                  // RLS policy MUST implicitly handle the user_id check based on the authenticated user

                if (error) {
                  console.error(`[Error] Supabase error updating script for ${toolProjectId}:`, error);
                  throw new Error(`Database error updating script: ${error.message}. Check RLS policies if access denied.`);
                }

                output = `Successfully updated script for project ${toolProjectId}.`;
                console.log(`[Trace] Executed update_project_script.`);

              } catch (toolError) {
                // Log the full error object for more details
                console.error(`[Error] Detailed error executing tool ${functionName}:`, JSON.stringify(toolError, null, 2));
                // Keep the original user-facing output message
                output = `Error executing tool ${functionName}: ${toolError instanceof Error ? toolError.message : String(toolError)}`;
              }
            } else if (functionName === "add_scene") {
               try {
                 const args = JSON.parse(toolCall.function.arguments);
                 const toolProjectId = args.projectId;
                 const sceneNumber = args.sceneNumber;
                 // Validate required fields
                 if (!toolProjectId || typeof toolProjectId !== 'string') {
                   throw new Error("Missing or invalid 'projectId' argument.");
                 }
                 if (typeof sceneNumber !== 'number') {
                    throw new Error("Missing or invalid 'sceneNumber' argument.");
                 }
                 console.log(`[Trace] Handling add_scene call for projectId: ${toolProjectId}, sceneNumber: ${sceneNumber}`);

                 // Prepare scene data, including optional fields
                 const sceneData: any = {
                    project_id: toolProjectId,
                    scene_number: sceneNumber,
                    script: args.script || "", // Default to empty string if not provided
                    image_prompt: args.imagePrompt || "",
                    voiceover: args.voiceover || ""
                    // user_id will be set by RLS policy or default value based on the authenticated user
                 };

                 const { data: newScene, error } = await supabaseClient
                   .from('canvas_scenes')
                   .insert(sceneData)
                   .select('id') // Select only the ID of the newly created scene
                   .single(); // Expecting a single row back

                 if (error) {
                   console.error(`[Error] Supabase error adding scene to project ${toolProjectId}:`, error);
                   throw new Error(`Database error adding scene: ${error.message}. Check RLS policies.`);
                 }

                 output = `Successfully added new scene (ID: ${newScene?.id}) to project ${toolProjectId}.`;
                 console.log(`[Trace] Executed add_scene.`);

               } catch (toolError) {
                 console.error(`[Error] Error executing tool ${functionName}:`, toolError);
                 output = `Error executing tool ${functionName}: ${toolError instanceof Error ? toolError.message : String(toolError)}`;
               }
            } else if (functionName === "update_scene_script") {
               try {
                 const args = JSON.parse(toolCall.function.arguments);
                 const sceneId = args.sceneId;
                 const newScript = args.newScript;
                 // Validate required fields
                 if (!sceneId || typeof sceneId !== 'string') {
                   throw new Error("Missing or invalid 'sceneId' argument.");
                 }
                 if (typeof newScript !== 'string') {
                   throw new Error("Missing or invalid 'newScript' argument (must be a string).");
                 }
                 console.log(`[Trace] Handling update_scene_script call for sceneId: ${sceneId}`);

                 const { error } = await supabaseClient
                   .from('canvas_scenes')
                   .update({ script: newScript, updated_at: new Date().toISOString() })
                   .eq('id', sceneId);
                   // RLS policy must ensure user owns the project this scene belongs to

                 if (error) {
                   console.error(`[Error] Supabase error updating script for scene ${sceneId}:`, error);
                   throw new Error(`Database error updating scene script: ${error.message}. Check RLS policies.`);
                 }

                 output = `Successfully updated script for scene ${sceneId}.`;
                 console.log(`[Trace] Executed update_scene_script.`);

               } catch (toolError) {
                 console.error(`[Error] Error executing tool ${functionName}:`, toolError);
                 output = `Error executing tool ${functionName}: ${toolError instanceof Error ? toolError.message : String(toolError)}`;
               }
            } else if (functionName === "update_scene_image_prompt") { // Add handler for new tool
               try {
                 const args = JSON.parse(toolCall.function.arguments);
                 const sceneId = args.sceneId;
                 const newImagePrompt = args.newImagePrompt;
                 // Validate required fields
                 if (!sceneId || typeof sceneId !== 'string') {
                   throw new Error("Missing or invalid 'sceneId' argument.");
                 }
                 if (typeof newImagePrompt !== 'string') {
                   throw new Error("Missing or invalid 'newImagePrompt' argument (must be a string).");
                 }
                 console.log(`[Trace] Handling update_scene_image_prompt call for sceneId: ${sceneId}`);

                 const { error } = await supabaseClient
                   .from('canvas_scenes')
                   .update({ image_prompt: newImagePrompt, updated_at: new Date().toISOString() })
                   .eq('id', sceneId);
                   // RLS policy must ensure user owns the project this scene belongs to

                 if (error) {
                   console.error(`[Error] Supabase error updating image prompt for scene ${sceneId}:`, error);
                   throw new Error(`Database error updating scene image prompt: ${error.message}. Check RLS policies.`);
                 }

                 output = `Successfully updated image prompt for scene ${sceneId}.`;
                 console.log(`[Trace] Executed update_scene_image_prompt.`);

               } catch (toolError) {
                 console.error(`[Error] Error executing tool ${functionName}:`, toolError);
                 output = `Error executing tool ${functionName}: ${toolError instanceof Error ? toolError.message : String(toolError)}`;
               }
            } else if (functionName === "delete_scene") { // Add handler for new tool
               try {
                 const args = JSON.parse(toolCall.function.arguments);
                 const sceneId = args.sceneId;
                 // Validate required fields
                 if (!sceneId || typeof sceneId !== 'string') {
                   throw new Error("Missing or invalid 'sceneId' argument.");
                 }
                 console.log(`[Trace] Handling delete_scene call for sceneId: ${sceneId}`);

                 const { error } = await supabaseClient
                   .from('canvas_scenes')
                   .delete()
                   .eq('id', sceneId);
                   // RLS policy must ensure user owns the project this scene belongs to

                 if (error) {
                   console.error(`[Error] Supabase error deleting scene ${sceneId}:`, error);
                   throw new Error(`Database error deleting scene: ${error.message}. Check RLS policies.`);
                 }

                 output = `Successfully deleted scene ${sceneId}.`;
                 console.log(`[Trace] Executed delete_scene.`);

               } catch (toolError) {
                 console.error(`[Error] Error executing tool ${functionName}:`, toolError);
                 output = `Error executing tool ${functionName}: ${toolError instanceof Error ? toolError.message : String(toolError)}`;
               }
            } else {
              console.warn(`[Warn] Unsupported tool called: ${functionName}`);
              output = `Tool '${functionName}' is not supported by this runner.`;
            }

            toolOutputs.push({
              tool_call_id: toolCall.id,
              output: output,
            });
          }

          // Submit tool outputs
          try {
            console.log(`[Trace] Submitting ${toolOutputs.length} tool output(s) for Run ID: ${run.id}...`);
            run = await openai.beta.threads.runs.submitToolOutputs(currentThreadId, run.id, {
              tool_outputs: toolOutputs,
            });
            console.log(`[Trace] Tool outputs submitted. New Run status: ${run.status}`);
            // Continue polling immediately after submitting
            continue;
          } catch (submitError) {
            console.error(`[Error] Failed to submit tool outputs for Run ID: ${run.id}:`, submitError);
            // Decide how to handle submission failure - maybe retry or fail the run?
            // For now, let's fail the run.
            return {
              error: "Failed to submit tool outputs to the Assistant.",
              details: submitError instanceof Error ? submitError.message : String(submitError),
              threadId: currentThreadId,
            };
          }
        } else {
           console.warn(`[Warn] Run ${run.id} requires an unhandled action type: ${run.required_action?.type}`);
           // Decide how to handle unexpected action types. Fail the run for now.
           return {
             error: "Orchestrator run requires an unhandled action.",
             details: `Required action type: ${run.required_action?.type}`,
             threadId: currentThreadId,
           };
        }
      }
    }

    console.log(`[Trace] Run finished with status: ${run.status}`);

    // 6. Process Final Run Status
    if (run.status === "completed") {
      console.log("[Trace] Run completed. Fetching latest message...");
      const messages = await openai.beta.threads.messages.list(currentThreadId, {
        order: "desc",
        limit: 1,
      });

      const assistantMessage = messages.data.find((m: ThreadMessage) => m.role === 'assistant');

      if (assistantMessage && assistantMessage.content[0]?.type === 'text') {
        const responseText = assistantMessage.content[0].text.value;
        console.log("[Trace] Assistant response extracted.");
        return {
          response: responseText,
          threadId: currentThreadId,
        };
      } else {
        console.error("[Error] No suitable text message found from assistant.");
        return {
          error: "Assistant finished but no text response was found.",
          threadId: currentThreadId,
        };
      }
    } else {
      // Handle failed, cancelled, expired states
      console.error(`[Error] Run ended with non-completed status: ${run.status}`);
      const errorDetails = run.last_error ? `${run.last_error.code}: ${run.last_error.message}` : 'No error details provided.';
      return {
        error: `Orchestrator run failed or ended unexpectedly.`,
        details: `Status: ${run.status}. ${errorDetails}`,
        threadId: currentThreadId,
      };
    }

  } catch (error) {
    console.error("[Error] Exception during orchestrator execution:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    // Include stack trace in logs if available and helpful for debugging
    if (error instanceof Error && error.stack) {
        console.error("[Error Stack Trace]:", error.stack);
    }
    return {
      error: "Orchestrator execution failed due to an exception.",
      details: errorMessage,
    };
  }
}

console.log("Runner module loaded.");