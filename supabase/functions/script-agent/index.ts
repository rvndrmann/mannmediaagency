// @ts-ignore deno-specific import
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
// @ts-ignore deno-specific import
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
// @ts-ignore deno-specific import
import OpenAI from 'https://esm.sh/openai@4.29.1' // Use esm.sh for Deno compatibility
// @ts-ignore deno-specific import
import { delay } from "https://deno.land/std@0.168.0/async/delay.ts"; // For polling delay
// @ts-ignore Deno requires .ts extension
import { corsHeaders } from '../_shared/cors.ts'

// --- Environment Variables & Client Initialization ---

// @ts-ignore Deno namespace
const supabaseUrl = Deno.env.get('SUPABASE_URL')
// @ts-ignore Deno namespace
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
// @ts-ignore Deno namespace
const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
// --- NEW: Assistant ID ---
// @ts-ignore Deno namespace
const scriptAssistantId = Deno.env.get('OPENAI_SCRIPT_ASSISTANT_ID') // Needs to be set in Supabase env vars

if (!supabaseUrl) throw new Error('Missing environment variable: SUPABASE_URL')
if (!supabaseAnonKey) throw new Error('Missing environment variable: SUPABASE_ANON_KEY')
if (!openaiApiKey) throw new Error('Missing environment variable: OPENAI_API_KEY')
// --- NEW: Check for Assistant ID ---
if (!scriptAssistantId) throw new Error('Missing environment variable: OPENAI_SCRIPT_ASSISTANT_ID')

const supabaseAdmin = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

const openai = new OpenAI({
  apiKey: openaiApiKey,
})

// --- System Prompt (No longer directly used in API call, but configured in the Assistant) ---
// Keep for reference or potential future use if needed for context building
const SCRIPT_AGENT_SYSTEM_PROMPT_REFERENCE = `
**Role:** You are the ScriptAgent, a specialized AI assistant within a multi-agent system designed for creating and refining video scripts for a canvas-based video editor.
**Goal:** Your primary function is to generate or refine scripts based on user requests, project context, and potentially existing scene scripts. You must ensure the output script is well-structured, coherent, and suitable for the video format.
**Input:** You will receive a request containing:
*   \`taskType\`: Either 'create' (generate a new script for a project) or 'refine' (refine the script for a specific scene).
*   \`userRequest\`: The specific instruction from the user (e.g., "Write a 30-second script about sustainable gardening", "Make this scene funnier").
*   \`projectId\` (optional, required for 'create'): The ID of the overall project.
*   \`sceneId\` (optional, required for 'refine'): The ID of the specific scene to refine.
*   \`projectContext\` (optional): General information about the project (e.g., target audience, overall theme, brand voice).
*   \`existingScript\` (optional, provided for 'refine'): The current script content of the scene being refined.
*   \`parameters\` (optional): Additional parameters like desired tone, length constraints, keywords, etc.
**Process:**
1.  **Analyze Input:** Carefully review all provided information – task type, user request, context, existing script, and parameters.
2.  **Synthesize Context:** Combine the project context, user request, and any existing script to understand the full requirements.
3.  **Generate/Refine Script:**
    *   If \`taskType\` is 'create', generate a complete script based on the \`userRequest\` and \`projectContext\`. Structure it logically, considering potential scene divisions if appropriate.
    *   If \`taskType\` is 'refine', modify the \`existingScript\` according to the \`userRequest\`, incorporating feedback and maintaining consistency with the \`projectContext\`.
4.  **Formatting:** Ensure the final script is plain text, clearly written, and easy to read. Avoid complex formatting unless specifically requested. For multi-scene scripts generated during 'create', consider simple markers like \`[SCENE 1]\`, \`[SCENE 2]\`, etc., if helpful, but the primary output should be the script text itself.
5.  **Output:** Return *only* the generated or refined script content as a plain text string. Do not include any introductory phrases like "Here is the script:" or explanations unless they are part of the script itself.
**Constraints:**
*   Adhere strictly to the requested \`taskType\`.
*   Incorporate all relevant context and parameters.
*   Maintain a consistent tone and style appropriate for the project.
*   Focus solely on script generation/refinement. Do not perform other actions.
*   Output *only* the script text.
`

// --- MCP Action Request ---

// Define the structure for incoming requests
interface McpActionRequest {
  action: 'list_tools' | 'call_tool';
  // For call_tool action
  tool_name?: 'generate_script' | 'refine_script';
  arguments?: {
    projectId?: string;
    sceneId?: string;
    userRequest?: string;
    threadId?: string; // Added threadId from orchestrator
    [key: string]: any; // Allow other arguments
  };
}

// --- Tool Definitions ---

const toolDefinitions = [
  {
    name: 'generate_script',
    description: 'Generates a new video script for an entire project based on a user request and project context.',
    parameters: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: 'The ID of the overall project for which to generate the script.',
        },
        userRequest: {
          type: 'string',
          description: 'The specific instruction from the user (e.g., "Write a 30-second script about sustainable gardening").',
        },
        // threadId is handled internally by the orchestrator/agent
      },
      required: ['projectId', 'userRequest'],
    },
  },
  {
    name: 'refine_script',
    description: 'Refines the script for a specific scene within a project based on user feedback and context.',
    parameters: {
      type: 'object',
      properties: {
        sceneId: {
          type: 'string',
          description: 'The ID of the specific scene whose script needs refinement.',
        },
        userRequest: {
          type: 'string',
          description: 'The specific instruction for refinement (e.g., "Make this scene funnier", "Shorten the dialogue").',
        },
         // threadId is handled internally by the orchestrator/agent
      },
      required: ['sceneId', 'userRequest'],
    },
  },
];
// --- Helper Function to Fetch Context ---

async function fetchContext(
  supabase: SupabaseClient,
  projectId?: string,
  sceneId?: string
): Promise<{ projectContext?: any; existingScript?: string | null }> {
  let projectContext: any = null
  let existingScript: string | null = null

  if (projectId) {
    const { data: projectData, error: projectError } = await supabase
      .from('canvas_projects')
      .select('*, canvas_scenes(*)') // Fetch project and its scenes
      .eq('id', projectId)
      .single()

    if (projectError) {
      console.error(`Error fetching project ${projectId}:`, projectError)
      // Don't throw, allow proceeding with potentially partial context
      // throw new Error(`Failed to fetch project context: ${projectError.message}`)
    } else if (!projectData) {
      console.warn(`Project with ID ${projectId} not found.`)
      // throw new Error(`Project with ID ${projectId} not found.`)
    } else {
        projectContext = projectData // Includes scenes if needed for broader context
    }
    // If creating a project script, existingScript remains null
  }

  if (sceneId) {
    const { data: sceneData, error: sceneError } = await supabase
      .from('canvas_scenes')
      .select('scene_script, project_id') // Fetch script and project_id (use correct column name)
      .eq('id', sceneId)
      .single()

    if (sceneError) {
      console.error(`Error fetching scene ${sceneId}:`, sceneError)
      // Don't throw, allow proceeding with potentially partial context
      // throw new Error(`Failed to fetch scene context: ${sceneError.message}`)
    } else if (!sceneData) {
        console.warn(`Scene with ID ${sceneId} not found.`)
      // throw new Error(`Scene with ID ${sceneId} not found.`)
    } else {
        existingScript = sceneData.scene_script // Use correct column name

        // If project context wasn't fetched via projectId, fetch it now using scene's project_id
        if (!projectContext && sceneData.project_id) {
            const { data: relatedProjectData, error: relatedProjectError } = await supabase
                .from('canvas_projects')
                .select('*') // Fetch basic project details
                .eq('id', sceneData.project_id)
                .single()

            if (relatedProjectError) {
                console.warn(`Could not fetch related project ${sceneData.project_id} for scene ${sceneId}:`, relatedProjectError.message)
                // Continue without full project context if it fails, but log warning
            } else if (relatedProjectData) {
                projectContext = relatedProjectData
            }
        }
    }
  }

  return { projectContext, existingScript }
}

// --- Helper Function to Update Supabase ---

async function updateScriptInSupabase(
  supabase: SupabaseClient,
  id: string,
  table: 'canvas_projects' | 'canvas_scenes',
  newScript: string
): Promise<void> {
  // Determine the correct column name based on the table
  const scriptColumn = table === 'canvas_projects' ? 'full_script' : 'scene_script'; // Adjust if project table uses a different name

  const { error } = await supabase
    .from(table)
    .update({ [scriptColumn]: newScript, updated_at: new Date().toISOString() }) // Use dynamic column name
    .eq('id', id)

  if (error) {
    console.error(`Error updating ${scriptColumn} in ${table} with ID ${id}:`, error)
    throw new Error(`Failed to update script in Supabase: ${error.message}`)
  }
  console.log(`Successfully updated script for ${table} ID: ${id}`)
}

// --- Helper Function to Poll Run Status ---
async function pollRunStatus(threadId: string, runId: string): Promise<OpenAI.Beta.Threads.Runs.Run> {
    const terminalStates = ['completed', 'failed', 'cancelled', 'expired'];
    let run = await openai.beta.threads.runs.retrieve(threadId, runId);
    console.log(`Initial Run Status (${runId}): ${run.status}`);

    while (!terminalStates.includes(run.status)) {
        await delay(1000); // Wait 1 second before polling again
        run = await openai.beta.threads.runs.retrieve(threadId, runId);
        console.log(`Polling Run Status (${runId}): ${run.status}`);
    }

    if (run.status !== 'completed') {
        console.error(`Run ${runId} finished with status ${run.status}. Last Error:`, run.last_error);
        throw new Error(`Assistant run failed with status: ${run.status}. Error: ${run.last_error?.message || 'Unknown error'}`);
    }

    console.log(`Run ${runId} completed successfully.`);
    return run;
}


// --- Main Request Handler ---

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Expecting POST requests
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Parse the request body
    const body: McpActionRequest = await req.json();
    console.log('ScriptAgent received request:', JSON.stringify(body, null, 2));

    // --- Input Validation: Check Action ---
    if (!body.action || (body.action !== 'list_tools' && body.action !== 'call_tool')) {
      throw new Error("Invalid or missing 'action'. Must be 'list_tools' or 'call_tool'.");
    }

    // --- Action Routing ---
    switch (body.action) {
      case 'list_tools': {
        // Return the defined tools
        const mcpSuccessResponse = {
          status: 'success',
          result: { tools: toolDefinitions },
        };
        return new Response(JSON.stringify(mcpSuccessResponse), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      case 'call_tool': {
        // --- Input Validation (call_tool specific) ---
        if (!body.tool_name || (body.tool_name !== 'generate_script' && body.tool_name !== 'refine_script')) {
          throw new Error("Invalid or missing 'tool_name' for 'call_tool' action. Must be 'generate_script' or 'refine_script'.");
        }
        if (!body.arguments || typeof body.arguments !== 'object') {
          throw new Error("Missing or invalid 'arguments' object for 'call_tool' action.");
        }

        // Map tool_name to internal taskType
        const taskType = body.tool_name === 'generate_script' ? 'create' : 'refine';

        // Extract parameters from the 'arguments' object
        const { projectId, sceneId, userRequest, threadId, ...otherArguments } = body.arguments; // Extract threadId

        // Validate required arguments based on tool_name
        if (body.tool_name === 'generate_script' && !projectId) {
          throw new Error("Missing 'projectId' in arguments for tool 'generate_script'.");
        }
        if (body.tool_name === 'refine_script' && !sceneId) {
          throw new Error("Missing 'sceneId' in arguments for tool 'refine_script'.");
        }
        if (!userRequest) {
          throw new Error("Missing 'userRequest' in arguments.");
        }

        // Keep otherArguments accessible if needed later (passed to LLM)
        const parameters = otherArguments; // Assign remaining args to parameters variable used later

        // --- Fetch Context from Supabase ---
        console.log(`Fetching context for ${taskType}...`)
        const { projectContext, existingScript } = await fetchContext(supabaseAdmin, projectId, sceneId)
        console.log('Context fetched:', { projectContext: !!projectContext, existingScript: existingScript ? 'Exists' : 'None' })


        // --- Construct User Message Content ---
        // This content will be added to the thread
        let userMessageContent = `Task Type: ${taskType}\nUser Request: ${userRequest}\n`
        if (projectContext) {
            // Selectively include relevant project details, avoid overwhelming the LLM
            const relevantContext = {
                name: projectContext.name,
                description: projectContext.description,
                // Add other relevant fields like target_audience, tone, etc. if they exist
            }
            userMessageContent += `Project Context: ${JSON.stringify(relevantContext, null, 2)}\n`
        }
        if (taskType === 'refine' && existingScript) {
            userMessageContent += `Existing Scene Script:\n---\n${existingScript}\n---\n`
        } else if (taskType === 'refine' && !existingScript) {
            userMessageContent += `Note: Refining scene, but no existing script was found. Please generate based on context and request.\n`
        }
        if (parameters && Object.keys(parameters).length > 0) { // Check if parameters exist
            userMessageContent += `Additional Parameters: ${JSON.stringify(parameters, null, 2)}\n`
        }

        // --- Manage Thread ---
        let currentThreadId: string;
        if (threadId && typeof threadId === 'string') {
            console.log(`Using existing thread ID: ${threadId}`);
            currentThreadId = threadId;
            // Optional: Verify thread exists? openai.beta.threads.retrieve(threadId)
        } else {
            console.log('No thread ID provided, creating a new thread...');
            const thread = await openai.beta.threads.create();
            currentThreadId = thread.id;
            console.log(`Created new thread ID: ${currentThreadId}`);
        }

        // --- Add Message to Thread ---
        console.log(`Adding message to thread ${currentThreadId}...`);
        await openai.beta.threads.messages.create(currentThreadId, {
            role: 'user',
            content: userMessageContent,
        });

        // --- Create and Run Assistant ---
        console.log(`Creating run for thread ${currentThreadId} with assistant ${scriptAssistantId}...`);
        const run = await openai.beta.threads.runs.create(currentThreadId, {
            assistant_id: scriptAssistantId,
            // instructions: Can override assistant instructions here if needed, but usually set on the assistant itself.
        });
        console.log(`Run created with ID: ${run.id}`);

        // --- Poll for Run Completion ---
        await pollRunStatus(currentThreadId, run.id);

        // --- Retrieve Assistant Response ---
        console.log(`Fetching messages from completed run ${run.id} in thread ${currentThreadId}...`);
        const messages = await openai.beta.threads.messages.list(currentThreadId, {
            order: 'desc',
            limit: 1, // Get the latest message
        });

        // Find the latest assistant message
        const assistantMessage = messages.data.find((m: OpenAI.Beta.Threads.Messages.ThreadMessage) => m.role === 'assistant');
        let newScript: string | null = null;

        if (assistantMessage && assistantMessage.content[0]?.type === 'text') {
            newScript = assistantMessage.content[0].text.value.trim();
            console.log('Assistant response extracted.');
        } else {
            console.error('Could not find a valid text response from the assistant:', messages.data);
            throw new Error('Failed to get a valid script response from the assistant.');
        }

        if (!newScript) {
          console.error('Assistant response was empty.')
          throw new Error('Failed to generate script from Assistant.')
        }

        // --- Update Supabase ---
        let updateId: string | undefined
        let updateTable: 'canvas_projects' | 'canvas_scenes' | undefined

        if (taskType === 'create' && projectId) {
            updateId = projectId
            updateTable = 'canvas_projects' // Assuming 'create' updates the project's main script field
            console.warn("Task type 'create' currently updates the project's script field. Verify if this is the intended behavior or if it should create scenes instead.")
        } else if (taskType === 'refine' && sceneId) {
            updateId = sceneId
            updateTable = 'canvas_scenes'
        }

        if (updateId && updateTable) {
            console.log(`Updating ${updateTable} with ID ${updateId}...`)
            await updateScriptInSupabase(supabaseAdmin, updateId, updateTable, newScript)
        } else {
            console.warn('Could not determine target for Supabase update based on taskType and IDs.')
        }
        // --- Return Success Response (MCP Style) ---
        const successResult = {
            message: `Tool '${body.tool_name}' executed successfully using Assistants API. Script ${taskType === 'create' ? 'generated' : 'refined'}.`,
            script: newScript,
            updatedTable: updateTable,
            updatedId: updateId,
        };

        // --- IMPORTANT: Include the thread ID in the response ---
        const mcpSuccessResponse = {
            status: 'success',
            result: successResult,
            openai_thread_id: currentThreadId, // Send the used thread ID back
        };

        return new Response(JSON.stringify(mcpSuccessResponse), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });
      } // End case 'call_tool'

      default: {
          // Should not happen due to initial validation, but good practice
          console.error('Reached default case in action switch, indicates logic error.')
          throw new Error('Invalid action specified.');
      }
    } // End switch(body.action)

  } catch (error) {
    console.error('Error in ScriptAgent:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    // --- Return Error Response (MCP Style) ---
    const mcpErrorResponse = {
        status: 'error',
        error: {
            message: errorMessage,
            // Optionally add error code or type here
        },
        // Do NOT include openai_thread_id in error responses generally
    };
    // Ensure CORS headers are included in error responses too
    return new Response(JSON.stringify(mcpErrorResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: error instanceof Error && (error.message.includes('not found') || error.message.includes('Invalid or missing')) ? 400 : 500, // Bad Request for known client errors
    });
  }
})