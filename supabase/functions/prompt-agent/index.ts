// @ts-ignore deno-specific import
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// @ts-ignore deno-specific import
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
// @ts-ignore deno-specific import
import OpenAI from 'https://esm.sh/openai@4.29.1'; // Use specific version matching script-agent
// @ts-ignore deno-specific import
import { delay } from "https://deno.land/std@0.168.0/async/delay.ts"; // For polling delay
// @ts-ignore Deno requires .ts extension
import { corsHeaders } from '../_shared/cors.ts';

// Define the system prompt for the PromptAgent (Reference Only)
const PROMPT_AGENT_SYSTEM_PROMPT_REFERENCE = `**Role:** You are the PromptAgent, a specialized AI assistant within a multi-agent system designed for video creation. Your primary function is to generate detailed and effective prompts for image or video generation models (like Midjourney, Stable Diffusion, Sora, etc.) based on scene context provided by other agents.
**Input:** You will receive the following information for a specific scene:
1.  **Scene Script:** The dialogue or action described in the scene.
2.  **Scene Description:** A brief visual description of the scene's setting, characters, and mood.
3.  **Project Style Guide:** Overall visual style, color palette, aspect ratio, or specific artistic direction for the project (e.g., "cinematic, photorealistic, 16:9", "anime style, vibrant colors, 4:3", "Pixar animation style").
4.  **Custom Instructions:** Any specific overrides or additional details for this particular scene provided by the user or another agent.
5.  **Target Model (Optional):** Sometimes, the specific generation model might be specified (e.g., "Midjourney", "Sora"). If provided, tailor the prompt syntax and style accordingly. If not, generate a generally effective prompt suitable for most modern text-to-image/video models.
**Task:**
1.  **Analyze Context:** Carefully review all provided input details (script, description, style guide, custom instructions).
2.  **Synthesize Prompt:** Combine the information to create a single, coherent, and highly descriptive prompt.
    *   Incorporate key visual elements from the description and style guide.
    *   Reflect the mood and action from the script.
    *   Include technical details like aspect ratio or style keywords (e.g., \`--ar 16:9\`, \`cinematic lighting\`, \`detailed illustration\`).
    *   Adhere to any custom instructions precisely.
    *   If a target model is specified, use its preferred syntax (e.g., Midjourney's parameter style).
3.  **Output:** Return *only* the generated prompt as a plain text string. Do not include explanations, greetings, or any other text.
**Example:**
*   **Input:**
    *   Script: "A lone astronaut steps onto a red, dusty planet. Wind whips sand around their boots."
    *   Description: "Wide shot, desolate Martian landscape. The astronaut wears a standard white spacesuit. The mood is lonely and awe-inspiring."
    *   Style Guide: "Photorealistic, cinematic, 16:9, inspired by 'The Martian'."
    *   Custom Instructions: "Emphasize the red color of the planet."
*   **Output:** \`Photorealistic wide shot of a lone astronaut in a white spacesuit stepping onto the surface of Mars, red dust swirling around their boots under a pale alien sky, vast desolate landscape, cinematic lighting, awe-inspiring and lonely mood, inspired by 'The Martian' --ar 16:9 --style raw\`
**Constraints:**
*   Be concise yet descriptive.
*   Focus on visual details.
*   Ensure the generated prompt accurately reflects the scene's script, description, style, and instructions.
*   Output only the prompt text.`;

console.log(`Function "prompt-agent" initializing...`);

// --- Environment Variables & Client Initialization ---
let supabase: SupabaseClient;
let openai: OpenAI;
let promptAssistantId: string;

try {
  // @ts-ignore Deno namespace
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  // @ts-ignore Deno namespace
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  // @ts-ignore Deno namespace
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  // --- NEW: Assistant ID ---
  // @ts-ignore Deno namespace
  promptAssistantId = Deno.env.get('OPENAI_PROMPT_ASSISTANT_ID'); // Needs to be set

  if (!supabaseUrl) throw new Error('Missing environment variable: SUPABASE_URL');
  if (!supabaseAnonKey) throw new Error('Missing environment variable: SUPABASE_ANON_KEY');
  if (!openaiApiKey) throw new Error('Missing environment variable: OPENAI_API_KEY');
  if (!promptAssistantId) throw new Error('Missing environment variable: OPENAI_PROMPT_ASSISTANT_ID');

  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  console.log('Supabase client initialized.');

  openai = new OpenAI({ apiKey: openaiApiKey });
  console.log('OpenAI client initialized.');

} catch (error) {
  console.error('Client initialization failed:', error);
  // If initialization fails, the function cannot serve requests.
  // The serve function below will handle returning an error.
}

// --- MCP Action Request Interface ---
interface McpActionRequest {
  action: 'list_tools' | 'call_tool';
  tool_name?: 'generate_prompt'; // Only tool for this agent
  arguments?: {
    sceneId?: string;
    projectId?: string; // Optional, but useful for context
    threadId?: string; // Added threadId from orchestrator
    parameters?: { // Optional sub-parameters
        target_model?: string;
        prompt_field?: string;
        [key: string]: any; // Allow other custom parameters if needed
    };
    [key: string]: any; // Allow other top-level arguments if needed
  };
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


serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Ensure clients are initialized before proceeding
  if (!supabase || !openai || !promptAssistantId) {
      const errorPayload = {
          status: 'error',
          error: { message: 'Service not available due to initialization failure.' }
      };
      console.error('Service not available: Clients or Assistant ID not initialized.');
      return new Response(JSON.stringify(errorPayload), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 503, // Service Unavailable
      });
  }

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
        const errorPayload = {
            status: 'error',
            error: { message: 'Method Not Allowed' }
        };
        return new Response(JSON.stringify(errorPayload), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 405,
        });
    }

    // Parse request body
    const body: McpActionRequest = await req.json();
    console.log('PromptAgent received request:', body);

    // Validate action field
    if (!body || typeof body.action !== 'string') {
        const errorPayload = {
            status: 'error',
            error: { message: 'Invalid request format. Missing or invalid "action" field.' }
        };
        return new Response(JSON.stringify(errorPayload), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }

    const action = body.action;

    switch (action) {
      case 'list_tools': {
        console.log('Action: list_tools');
        const toolDefinition = {
          name: 'generate_prompt',
          description: 'Generates a detailed image/video prompt based on scene context (script, description, style guide, custom instructions).',
          parameters: {
            type: 'object',
            properties: {
              sceneId: {
                type: 'string',
                description: 'The unique identifier of the scene to generate the prompt for.',
              },
              projectId: {
                type: 'string',
                description: '(Optional) The unique identifier of the project to fetch the style guide from, if not linked to the scene.',
              },
              parameters: {
                type: 'object',
                description: '(Optional) Additional parameters.',
                properties: {
                  target_model: {
                    type: 'string',
                    description: "(Optional) Specify the target generation model (e.g., 'Midjourney', 'Sora') to tailor the prompt style.",
                  },
                  prompt_field: {
                    type: 'string',
                    description: "(Optional) The database field in 'canvas_scenes' to update with the generated prompt. Defaults to 'image_prompt'.",
                  },
                },
                required: [], // No required sub-parameters within 'parameters'
              },
              // threadId is handled internally
            },
            required: ['sceneId'], // Only sceneId is strictly required at the top level
          },
        };
        const successPayload = {
          status: 'success',
          result: {
            tools: [toolDefinition],
          },
        };
        return new Response(JSON.stringify(successPayload), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      case 'call_tool': {
        console.log('Action: call_tool');
        // Validate tool_name and arguments for this action
        if (body.tool_name !== 'generate_prompt' || !body.arguments) {
            const errorPayload = {
                status: 'error',
                error: { message: 'Invalid request format for call_tool. Expected { action: "call_tool", tool_name: "generate_prompt", arguments: { ... } }' }
            };
            return new Response(JSON.stringify(errorPayload), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            });
        }

        const { sceneId, projectId, threadId, parameters } = body.arguments; // Extract threadId

        // Validate required arguments
        if (!sceneId) {
            const errorPayload = {
                status: 'error',
                error: { message: 'Missing required argument: sceneId' }
            };
            return new Response(JSON.stringify(errorPayload), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            });
        }

        // --- Fetch Context from Supabase ---
        console.log(`Fetching context for sceneId: ${sceneId}`);
        const { data: sceneData, error: sceneError } = await supabase
          .from('canvas_scenes')
          .select('scene_script, description, project_id, custom_instruction') // Use correct column name 'scene_script'
          .eq('id', sceneId)
          .single();

        if (sceneError || !sceneData) {
            const errorMessage = `Scene not found or error fetching scene: ${sceneError?.message || 'Unknown error'}`;
            console.error('Error fetching scene data:', sceneError);
            const errorPayload = { status: 'error', error: { message: errorMessage } };
            return new Response(JSON.stringify(errorPayload), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 404,
            });
        }
        console.log('Scene data fetched:', sceneData);

        const effectiveProjectId = sceneData.project_id || projectId;
        let projectStyleGuide = 'Default style';

        if (effectiveProjectId) {
          console.log(`Fetching project style guide for projectId: ${effectiveProjectId}`);
          const { data: projectData, error: projectError } = await supabase
            .from('canvas_projects')
            .select('style_guide')
            .eq('id', effectiveProjectId)
            .single();

          if (projectError) {
            console.warn(`Could not fetch project style guide for projectId ${effectiveProjectId}:`, projectError.message);
          } else if (projectData?.style_guide) {
            projectStyleGuide = projectData.style_guide;
            console.log('Project style guide fetched:', projectStyleGuide);
          } else {
              console.log(`Project ${effectiveProjectId} found, but no style guide set. Using default.`);
          }
        } else {
            console.log('No project ID associated with the scene or provided in the request. Using default style guide.');
        }

        // --- Construct User Message Content ---
        const userMessageContent = `
Generate an image/video prompt for the following scene:

Scene Script:
${sceneData.scene_script || 'No script provided.'}

Scene Description:
${sceneData.description || 'No description provided.'}

Project Style Guide:
${projectStyleGuide}

Custom Instructions for this Scene:
${sceneData.custom_instruction || 'None.'}

Target Model (if specified by parameters):
${parameters?.target_model || 'General (no specific model)'}
`;
        console.log('Constructed user message for Assistant:', userMessageContent);

        // --- Manage Thread ---
        let currentThreadId: string;
        if (threadId && typeof threadId === 'string') {
            console.log(`Using existing thread ID: ${threadId}`);
            currentThreadId = threadId;
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
            content: userMessageContent.trim(),
        });

        // --- Create and Run Assistant ---
        console.log(`Creating run for thread ${currentThreadId} with assistant ${promptAssistantId}...`);
        const run = await openai.beta.threads.runs.create(currentThreadId, {
            assistant_id: promptAssistantId,
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
        let generatedPrompt: string | null = null;

        if (assistantMessage && assistantMessage.content[0]?.type === 'text') {
            generatedPrompt = assistantMessage.content[0].text.value.trim();
            console.log('Assistant response extracted.');
        } else {
            console.error('Could not find a valid text response from the assistant:', messages.data);
            throw new Error('Failed to get a valid prompt response from the assistant.');
        }

        if (!generatedPrompt) {
            const errorMessage = 'Failed to generate prompt from Assistant response (empty).';
            console.error(errorMessage);
            const errorPayload = { status: 'error', error: { message: errorMessage } };
            return new Response(JSON.stringify(errorPayload), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500,
            });
        }
        console.log('Generated Prompt:', generatedPrompt);

        // --- Update Supabase ---
        const promptFieldToUpdate = parameters?.prompt_field || 'image_prompt';
        console.log(`Updating field '${promptFieldToUpdate}' for sceneId: ${sceneId}`);
        const { error: updateError } = await supabase
          .from('canvas_scenes')
          .update({ [promptFieldToUpdate]: generatedPrompt, updated_at: new Date().toISOString() }) // Also update timestamp
          .eq('id', sceneId);

        if (updateError) {
          console.error('Error updating scene in Supabase:', updateError);
          const errorMessage = `Failed to update scene in Supabase: ${updateError.message}`;
          const errorPayload = {
              status: 'error',
              error: { message: errorMessage, details: { generatedPrompt: generatedPrompt } }
          };
          // Still return 500, but include the generated prompt in the error details for potential recovery/debugging
          return new Response(JSON.stringify(errorPayload), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500,
          });
        }
        console.log(`Scene ${sceneId} updated successfully with the generated prompt in field '${promptFieldToUpdate}'.`);

        // --- Return Success Response ---
        const successResult = {
            message: 'Prompt generated successfully using Assistants API.',
            sceneId: sceneId,
            generatedPrompt: generatedPrompt,
            updatedField: promptFieldToUpdate,
        };
        const successPayload = {
            status: 'success',
            result: successResult,
            openai_thread_id: currentThreadId, // Include the thread ID
        };
        return new Response(JSON.stringify(successPayload), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });
      } // End case 'call_tool'

      default: {
        console.warn(`Unknown action received: ${action}`);
        const errorPayload = {
            status: 'error',
            error: { message: `Unknown action: ${action}` }
        };
        return new Response(JSON.stringify(errorPayload), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
      }
    } // End switch (action)

  } catch (error) {
    console.error('Error in PromptAgent request handler:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const errorDetails = error instanceof Error ? { name: error.name } : {}; // Avoid sending full stack in response
    const errorPayload = {
        status: 'error',
        error: {
            message: errorMessage,
            details: errorDetails
        }
        // Do NOT include openai_thread_id in error responses generally
    };
    return new Response(JSON.stringify(errorPayload), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
    });
  }
});

console.log(`Function "prompt-agent" is ready to serve requests.`);