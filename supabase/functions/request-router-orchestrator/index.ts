// @ts-ignore deno-specific import
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
// @ts-ignore deno-specific import
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2' // Added import
// @ts-ignore Deno requires .ts extension
import { corsHeaders } from '../_shared/cors.ts' // Assuming tsconfig allows .ts imports for Deno

console.log('Request Router Orchestrator function booting up...')

// Initialize Supabase client
let supabaseClient: SupabaseClient | null = null;
try {
  // @ts-ignore Deno namespace
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  // @ts-ignore Deno namespace
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables.');
  }
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  console.log('Supabase client initialized successfully.');
} catch (error: unknown) { // Catch as unknown
  const errorMessage = error instanceof Error ? error.message : "Unknown error during Supabase client initialization.";
  console.error('Failed to initialize Supabase client:', errorMessage);
  // Depending on the desired behavior, you might want to prevent the function from serving
  // if the client cannot be initialized. For now, it will log the error and continue.
}

// Global variables to store discovered tools
// Using 'any' for simplicity, consider defining a proper Tool interface later
let scriptAgentTools: any[] = [];
let promptAgentTools: any[] = [];

// Function to discover tools from an agent
async function discoverAgentTools(agentName: string, client: SupabaseClient): Promise<any[]> {
  console.log(`Discovering tools for agent: ${agentName}...`);
  const listToolsRequestBody = { action: 'list_tools' };
  try {
    // Use the provided client instance
    const { data, error } = await client.functions.invoke(agentName, {
      body: listToolsRequestBody,
    });

    if (error) {
      console.error(`Error invoking list_tools on ${agentName}:`, error.message);
      return []; // Return empty array on invocation error
    }

    // Basic validation of the response structure
    if (data && data.status === 'success' && data.result && Array.isArray(data.result.tools)) {
      console.log(`Successfully discovered ${data.result.tools.length} tools for ${agentName}.`);
      return data.result.tools; // Return the discovered tools
    } else {
      console.error(`Unexpected response structure or status from ${agentName} list_tools:`, data);
      return []; // Return empty array on unexpected response
    }
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error(`Unexpected error during tool discovery for ${agentName}:`, errorMessage);
    return []; // Return empty array on unexpected error
  }
}

// Discover tools from agents at startup, only if client initialized
if (supabaseClient) {
  console.log('Starting agent tool discovery...');
  // Capture the initialized client in a variable accessible to the async scope
  const discoveryClient = supabaseClient;
  // Use an immediately invoked async function expression (IIAFE) or Promise.all directly
  Promise.all([
    discoverAgentTools('script-agent', discoveryClient),
    discoverAgentTools('prompt-agent', discoveryClient)
  ]).then(([scriptTools, promptTools]) => {
    scriptAgentTools = scriptTools;
    promptAgentTools = promptTools;
    console.log('Tool discovery completed.');
    // Optional: Log discovered tool names for verification
    console.log(`Script Agent Tools (${scriptAgentTools.length}):`, scriptAgentTools.map(t => t?.name || 'unknown'));
    console.log(`Prompt Agent Tools (${promptAgentTools.length}):`, promptAgentTools.map(t => t?.name || 'unknown'));
  }).catch(error => {
    // This catch handles errors from Promise.all itself (e.g., if one promise rejects unexpectedly)
    // Individual discovery errors are handled within discoverAgentTools
    console.error('Error during the Promise.all execution for tool discovery:', error);
  });
} else {
    // Log if discovery is skipped due to client initialization failure
    console.warn('Supabase client not initialized at startup. Skipping agent tool discovery.');
}


// Define the expected request body structure
// Define the expected request body structure(s)
interface RROIntentRequestBody {
  intent: string; // Required for intent-based routing
  parameters: Record<string, any>;
  projectId?: string;
  sceneId?: string;
  threadId?: string;
}

interface RROApproveScriptRequestBody {
  projectId: string; // Required for approve script workflow
  // No intent field expected for this specific workflow
}

// Type guard to differentiate request bodies
function isApproveScriptRequest(body: any): body is RROApproveScriptRequestBody {
  return typeof body === 'object' && body !== null && typeof body.projectId === 'string' && typeof body.intent === 'undefined';
}

function isIntentRequest(body: any): body is RROIntentRequestBody {
  return typeof body === 'object' && body !== null && typeof body.intent === 'string';
}

// Define a type for the task payload for better clarity
interface AgentTaskInput {
  assigned_agent: string;
  input_payload: Record<string, any>;
  project_id?: string; // Use snake_case matching the table column
  scene_id?: string;   // Use snake_case matching the table column
  status: string;
}


serve(async (req: Request): Promise<Response> => {
  // Handle preflight requests for CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Ensure the request method is POST
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 405,
      })
    }

    // Check if Supabase client is initialized
    if (!supabaseClient) {
        console.error('Supabase client not initialized. Cannot process request.');
        return new Response(JSON.stringify({ error: 'Internal Server Error: Supabase client not available' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }

    const body = await req.json();
    console.log('RRO received request body:', body);

    // --- Authentication Check ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !supabaseClient) {
      console.error('Auth header missing or Supabase client unavailable.');
      return new Response(JSON.stringify({ error: 'Unauthorized: Missing or invalid credentials.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(jwt);

    if (userError || !user) {
      console.error('Authentication failed:', userError?.message || 'No user found.');
      return new Response(JSON.stringify({ error: 'Unauthorized: Authentication failed.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }
    console.log('Authenticated user:', user.id);
    // --- End Authentication Check ---

    let determinedAction = 'No action determined'; // Default action message
    let taskId: string | null = null; // Variable to hold the created task ID for async tasks
    let taskCreationError: string | null = null; // Variable to hold potential task creation errors
    let mcpCallOutcome: any = null; // Variable to hold the result of a direct MCP-style function call
    let mcpCallError: string | null = null; // Variable to hold potential MCP call errors

    // --- Request Routing ---

    if (isApproveScriptRequest(body)) {
      // --- Handle /approve script Workflow ---
      console.log(`Handling 'approve script' workflow for project: ${body.projectId}`);
      const { projectId } = body;

      try {
        // 1. Fetch the script from the project
        console.log(`Fetching script for project ${projectId}...`);
        const { data: projectData, error: fetchError } = await supabaseClient!
          .from('canvas_projects')
          .select('full_script') // Assuming the column name is 'full_script'
          .eq('id', projectId)
          .single();

        if (fetchError || !projectData) {
          throw new Error(`Failed to fetch project or script not found: ${fetchError?.message || 'No project data'}`);
        }
        const scriptContent = projectData.full_script;
        if (!scriptContent) {
          throw new Error(`Script content is empty for project ${projectId}`);
        }
        console.log(`Script fetched successfully.`);

        // 2. Call divide-script function
        console.log(`Calling 'divide-script' function...`);
        const { data: divideResult, error: divideError } = await supabaseClient!.functions.invoke(
          'divide-script',
          { body: { script: scriptContent } }
        );

        if (divideError) {
          throw new Error(`Error calling 'divide-script': ${divideError.message}`);
        }
        if (!divideResult || !Array.isArray(divideResult.scenes)) {
          throw new Error(`Invalid response from 'divide-script': ${JSON.stringify(divideResult)}`);
        }
        console.log(`'divide-script' returned ${divideResult.scenes.length} scenes.`);

        // 3. Create scene records in DB
        const scenesToInsert = divideResult.scenes.map((scene: any, index: number) => ({
          project_id: projectId,
          scene_script: scene.scene_script,
          image_prompt: scene.image_prompt,
          status: 'pending_generation', // Initial status
          scene_index: index, // Add scene index for ordering
          // Add other default fields if necessary (e.g., voice_over_text: '')
        }));

        if (scenesToInsert.length > 0) {
          console.log(`Inserting ${scenesToInsert.length} scenes into 'canvas_scenes'...`);
          const { error: insertError } = await supabaseClient!
            .from('canvas_scenes')
            .insert(scenesToInsert);

          if (insertError) {
            throw new Error(`Failed to insert scenes: ${insertError.message}`);
          }
          console.log(`Scenes inserted successfully.`);
        } else {
           console.log("No scenes generated by 'divide-script', nothing to insert.");
        }


        // 4. Trigger Pipeline Runner (Placeholder - Implement actual trigger later)
        console.log(`Placeholder: Triggering generation pipeline for project ${projectId}...`);
        // Example: await supabaseClient!.functions.invoke('mcp-pipeline-runner', { body: { projectId } });
        // Or: await callMCPTool('pipeline_runner', 'start_project_generation', { projectId });

        determinedAction = `Successfully processed 'approve script' for project ${projectId}. ${scenesToInsert.length} scenes created. Generation pipeline triggered (placeholder).`;
        mcpCallOutcome = { scenesCreated: scenesToInsert.length }; // Use mcpCallOutcome for success data

      } catch (error) {
        console.error(`Error during 'approve script' workflow:`, error);
        determinedAction = `Error processing 'approve script': ${error instanceof Error ? error.message : 'Unknown error'}`;
        mcpCallError = error instanceof Error ? error.message : 'Unknown error during approve script workflow';
      }
      // --- End /approve script Workflow ---

    } else if (isIntentRequest(body)) {
      // --- Handle Intent-Based Routing (Existing Logic) ---
      console.log(`Handling intent-based request: ${body.intent}`);
      switch (body.intent) {
        case 'generate_script': {
          const agentName = 'script-agent';
          const toolName = 'generate_script';
          console.log(`Attempting MCP-style call to ${agentName} for tool ${toolName}...`);

          const mcpArguments: Record<string, any> = { // Explicit type
            projectId: body.projectId,
            sceneId: body.sceneId, // Include sceneId if available/relevant
            userRequest: body.parameters?.userRequest,
            threadId: body.threadId,
            ...body.parameters, // Spread remaining parameters
          };
          // Remove undefined keys to avoid issues with function expecting defined values
          Object.keys(mcpArguments).forEach(key => mcpArguments[key] === undefined && delete mcpArguments[key]);

          const mcpRequestBody = {
            action: 'call_tool', // Added action field
            tool_name: toolName,
            arguments: mcpArguments,
          };

          // Check if tool exists in the discovered list
          if (!scriptAgentTools.some(tool => tool.name === toolName)) {
              console.error(`Tool '${toolName}' not found for agent '${agentName}'. Available: ${scriptAgentTools.map(t => t?.name || 'unknown').join(', ')}`);
              mcpCallError = `Tool '${toolName}' is not available for agent '${agentName}'.`;
              determinedAction = `Error: Tool not found for ${agentName}.`;
              // Skip invocation, error is set, proceed to response generation
          } else {
              // Tool found, proceed with invocation
              console.log('Invoking function with body:', JSON.stringify(mcpRequestBody, null, 2));

              // Use try/catch for the async operation
              try {
                  const { data: invokeData, error: invokeError } = await supabaseClient!.functions.invoke(agentName, {
                    body: mcpRequestBody,
                    // No 'noWait: true' - we wait for the result
                  });

                  if (invokeError) {
                    // Handle errors specifically from the invocation itself (network, function not found, etc.)
                    console.error(`Error invoking ${agentName}:`, invokeError);
                    determinedAction = `Error invoking ${agentName}`;
                    mcpCallError = invokeError.message;
                  } else if (invokeData) {
                    console.log(`${agentName} response:`, invokeData);
                    // Check the structure of the returned data for MCP compliance
                    if (typeof invokeData === 'object' && invokeData !== null && 'status' in invokeData) {
                        if (invokeData.status === 'success') {
                          determinedAction = `Successfully invoked ${agentName} for ${toolName}.`;
                          mcpCallOutcome = invokeData.result; // Store the actual result
                        } else if (invokeData.status === 'error') {
                          determinedAction = `Error reported by ${agentName} for ${toolName}.`;
                          // Try to extract a meaningful error message
                          const agentError = invokeData.error;
                          mcpCallError = typeof agentError === 'string' ? agentError : (agentError?.message || JSON.stringify(agentError) || 'Unknown error structure from agent.');
                          console.error(`${agentName} returned error:`, mcpCallError);
                        } else {
                          // Handle cases where 'status' is present but not 'success' or 'error'
                           determinedAction = `Unexpected status value from ${agentName}: ${invokeData.status}`;
                           mcpCallError = `Unexpected status: ${JSON.stringify(invokeData)}`;
                           console.error(mcpCallError);
                        }
                    } else {
                       // Handle cases where the response is not in the expected MCP format
                       determinedAction = `Unexpected response structure from ${agentName}. Expected { status: '...', ... }`;
                       mcpCallError = `Unexpected response format: ${JSON.stringify(invokeData)}`;
                       console.error(mcpCallError);
                    }
                  } else {
                    // Handle cases where invocation succeeds but returns no data (should ideally not happen with sync calls)
                    console.error(`Invocation of ${agentName} did not return data or specific error.`);
                    determinedAction = `Invocation issue with ${agentName}: No data returned.`;
                    mcpCallError = 'Invocation completed without returning data or a specific error.';
                  }
              } catch (e: unknown) {
                  // Catch any other unexpected errors during the invoke call
                  console.error(`Unexpected error during ${agentName} invocation:`, e);
                  determinedAction = `Unexpected error during ${agentName} invocation.`;
                  mcpCallError = e instanceof Error ? e.message : String(e);
              }
          }
          break;
        }
        case 'refine_script': {
          const agentName = 'script-agent';
          const toolName = 'refine_script';
          console.log(`Attempting MCP-style call to ${agentName} for tool ${toolName}...`);

          const mcpArguments: Record<string, any> = {
            projectId: body.projectId,
            sceneId: body.sceneId,
            userRequest: body.parameters?.userRequest,
            threadId: body.threadId,
            ...body.parameters,
          };
          Object.keys(mcpArguments).forEach(key => mcpArguments[key] === undefined && delete mcpArguments[key]);

          const mcpRequestBody = {
            action: 'call_tool', // Added action field
            tool_name: toolName,
            arguments: mcpArguments,
          };

          // Check if tool exists in the discovered list
          if (!scriptAgentTools.some(tool => tool.name === toolName)) {
              console.error(`Tool '${toolName}' not found for agent '${agentName}'. Available: ${scriptAgentTools.map(t => t?.name || 'unknown').join(', ')}`);
              mcpCallError = `Tool '${toolName}' is not available for agent '${agentName}'.`;
              determinedAction = `Error: Tool not found for ${agentName}.`;
          } else {
              // Tool found, proceed with invocation
              console.log('Invoking function with body:', JSON.stringify(mcpRequestBody, null, 2));

              try {
                  const { data: invokeData, error: invokeError } = await supabaseClient!.functions.invoke(agentName, {
                    body: mcpRequestBody,
                  });

                  if (invokeError) {
                    console.error(`Error invoking ${agentName}:`, invokeError);
                    determinedAction = `Error invoking ${agentName}`;
                    mcpCallError = invokeError.message;
                  } else if (invokeData) {
                    console.log(`${agentName} response:`, invokeData);
                    if (typeof invokeData === 'object' && invokeData !== null && 'status' in invokeData) {
                        if (invokeData.status === 'success') {
                          determinedAction = `Successfully invoked ${agentName} for ${toolName}.`;
                          mcpCallOutcome = invokeData.result;
                        } else if (invokeData.status === 'error') {
                          determinedAction = `Error reported by ${agentName} for ${toolName}.`;
                          const agentError = invokeData.error;
                          mcpCallError = typeof agentError === 'string' ? agentError : (agentError?.message || JSON.stringify(agentError) || 'Unknown error structure from agent.');
                          console.error(`${agentName} returned error:`, mcpCallError);
                        } else {
                           determinedAction = `Unexpected status value from ${agentName}: ${invokeData.status}`;
                           mcpCallError = `Unexpected status: ${JSON.stringify(invokeData)}`;
                           console.error(mcpCallError);
                        }
                    } else {
                       determinedAction = `Unexpected response structure from ${agentName}. Expected { status: '...', ... }`;
                       mcpCallError = `Unexpected response format: ${JSON.stringify(invokeData)}`;
                       console.error(mcpCallError);
                    }
                  } else {
                    console.error(`Invocation of ${agentName} did not return data or specific error.`);
                    determinedAction = `Invocation issue with ${agentName}: No data returned.`;
                    mcpCallError = 'Invocation completed without returning data or a specific error.';
                  }
              } catch (e: unknown) {
                  console.error(`Unexpected error during ${agentName} invocation:`, e);
                  determinedAction = `Unexpected error during ${agentName} invocation.`;
                  mcpCallError = e instanceof Error ? e.message : String(e);
              }
          }
          break;
        }
        case 'generate_prompt': {
          const agentName = 'prompt-agent'; // Target function name
          const toolName = 'generate_prompt';
          console.log(`Attempting MCP-style call to ${agentName} for tool ${toolName}...`);

          const mcpArguments: Record<string, any> = {
            projectId: body.projectId,
            sceneId: body.sceneId,
            threadId: body.threadId,
            ...body.parameters,
          };
          Object.keys(mcpArguments).forEach(key => mcpArguments[key] === undefined && delete mcpArguments[key]);

          const mcpRequestBody = {
            action: 'call_tool', // Added action field
            tool_name: toolName,
            arguments: mcpArguments,
          };

          // Check if tool exists in the discovered list
          if (!promptAgentTools.some(tool => tool.name === toolName)) {
              console.error(`Tool '${toolName}' not found for agent '${agentName}'. Available: ${promptAgentTools.map(t => t?.name || 'unknown').join(', ')}`);
              mcpCallError = `Tool '${toolName}' is not available for agent '${agentName}'.`;
              determinedAction = `Error: Tool not found for ${agentName}.`;
          } else {
              // Tool found, proceed with invocation
              console.log('Invoking function with body:', JSON.stringify(mcpRequestBody, null, 2));

              try {
                  const { data: invokeData, error: invokeError } = await supabaseClient!.functions.invoke(agentName, {
                    body: mcpRequestBody,
                  });

                  if (invokeError) {
                    console.error(`Error invoking ${agentName}:`, invokeError);
                    determinedAction = `Error invoking ${agentName}`;
                    mcpCallError = invokeError.message;
                  } else if (invokeData) {
                    console.log(`${agentName} response:`, invokeData);
                     if (typeof invokeData === 'object' && invokeData !== null && 'status' in invokeData) {
                        if (invokeData.status === 'success') {
                          determinedAction = `Successfully invoked ${agentName} for ${toolName}.`;
                          mcpCallOutcome = invokeData.result;
                        } else if (invokeData.status === 'error') {
                          determinedAction = `Error reported by ${agentName} for ${toolName}.`;
                          const agentError = invokeData.error;
                          mcpCallError = typeof agentError === 'string' ? agentError : (agentError?.message || JSON.stringify(agentError) || 'Unknown error structure from agent.');
                          console.error(`${agentName} returned error:`, mcpCallError);
                        } else {
                           determinedAction = `Unexpected status value from ${agentName}: ${invokeData.status}`;
                           mcpCallError = `Unexpected status: ${JSON.stringify(invokeData)}`;
                           console.error(mcpCallError);
                        }
                    } else {
                       determinedAction = `Unexpected response structure from ${agentName}. Expected { status: '...', ... }`;
                       mcpCallError = `Unexpected response format: ${JSON.stringify(invokeData)}`;
                       console.error(mcpCallError);
                    }
                  } else {
                    console.error(`Invocation of ${agentName} did not return data or specific error.`);
                    determinedAction = `Invocation issue with ${agentName}: No data returned.`;
                    mcpCallError = 'Invocation completed without returning data or a specific error.';
                  }
              } catch (e: unknown) {
                  console.error(`Unexpected error during ${agentName} invocation:`, e);
                  determinedAction = `Unexpected error during ${agentName} invocation.`;
                  mcpCallError = e instanceof Error ? e.message : String(e);
              }
          }
          break;
        }
        case 'generate_image': { // Use block scope
          const assigned_agent = 'ImageGenerationWorker';
          const input_payload = {
            taskType: 'generate_image',
            prompt: body.parameters?.prompt, // Assuming prompt is in parameters
            negative_prompt: body.parameters?.negative_prompt,
            style_raw: body.parameters?.style_raw,
            aspect_ratio: body.parameters?.aspect_ratio,
            projectId: body.projectId,
            sceneId: body.sceneId,
            parameters: body.parameters, // Pass other relevant params
          };
          const taskData: AgentTaskInput = {
            assigned_agent,
            input_payload,
            project_id: body.projectId,
            scene_id: body.sceneId,
            status: 'pending',
          };

          console.log(`Attempting to create task for ${assigned_agent}...`, taskData);
          const { data, error } = await supabaseClient!
            .from('agent_tasks')
            .insert(taskData)
            .select('id')
            .single();

          if (error) {
            console.error(`Error creating task for ${assigned_agent}:`, error);
            determinedAction = `Error creating task for ${assigned_agent}`;
            taskCreationError = error.message;
          } else if (data) {
            taskId = data.id;
            determinedAction = `Task created for ${assigned_agent} with ID: ${taskId}`;
            console.log(determinedAction);
          } else {
               console.error(`Task creation for ${assigned_agent} did not return data or error.`);
               determinedAction = `Task creation issue for ${assigned_agent}.`;
               taskCreationError = 'Task creation did not return data or error.';
          }
          break;
        }
        case 'update_scene': { // Use block scope
           // Keep placeholder as requested, or implement direct update later
           determinedAction = "Direct DB update needed (Not implemented)";
           console.log(determinedAction, { projectId: body.projectId, sceneId: body.sceneId, parameters: body.parameters });
           // Example of direct update (if simple):
           // const { error: updateError } = await supabaseClient!
           //   .from('scenes')
           //   .update({ name: body.parameters.name }) // Example: update scene name
           //   .eq('id', body.sceneId)
           //   .eq('project_id', body.projectId);
           // if (updateError) { console.error('Error updating scene:', updateError); }
           break;
          }
        default:
          determinedAction = `RRO determined action: Unknown intent received - ${body.intent}`;
          console.log(determinedAction);
          // Handle unknown intent, maybe return an error or log it
          break;
      }
      // --- End Intent-Based Routing ---
    } else {
      // --- Handle Invalid Request Body ---
      determinedAction = 'Invalid request body structure. Expected either { intent: "..." } or { projectId: "..." }.';
      console.error(determinedAction, body);
      mcpCallError = determinedAction; // Use mcpCallError to signal failure
      // --- End Invalid Request Body ---
    }


    // Construct response payload
    const responsePayload: Record<string, any> = {
      message: 'Request processed by Request Router Orchestrator.', // Default message
      actionTaken: determinedAction,
      receivedIntent: body.intent,
      operationType: '', // 'mcp_call', 'task_creation', 'direct_action', or 'unknown'
      outcome: {}, // Holds result or error details
    };

    let status = 200; // Default OK status

    // Determine outcome based on which variables are set
    if (mcpCallOutcome !== null) {
        responsePayload.operationType = 'mcp_call';
        responsePayload.message = 'MCP-style function call successful.';
        responsePayload.outcome = { status: 'success', result: mcpCallOutcome };
        status = 200; // OK, result included
    } else if (mcpCallError !== null) {
        responsePayload.operationType = 'mcp_call';
        responsePayload.message = 'MCP-style function call failed.';
        responsePayload.outcome = { status: 'error', error: mcpCallError };
        // Use 500 for server-side errors during invocation or agent errors
        status = 500;
    } else if (taskId !== null) {
        responsePayload.operationType = 'task_creation';
        responsePayload.message = 'Asynchronous task created successfully.';
        responsePayload.outcome = { status: 'success', taskId: taskId };
        status = 201; // Created
    } else if (taskCreationError !== null) {
        responsePayload.operationType = 'task_creation';
        responsePayload.message = 'Asynchronous task creation failed.';
        responsePayload.outcome = { status: 'error', error: taskCreationError };
        status = 500; // Internal Server Error
    } else if (body.intent === 'update_scene') {
        responsePayload.operationType = 'direct_action';
        responsePayload.message = 'Scene update requested (implementation pending).';
        // No specific outcome data needed for placeholder
        status = 200; // OK, action noted
    } else {
        // Handle unknown intent or cases where no action was taken/failed silently
        responsePayload.operationType = 'unknown';
        responsePayload.message = determinedAction.includes('Unknown intent') ? determinedAction : 'No specific action taken or outcome determined.';
        if (determinedAction.includes('Unknown intent')) {
             status = 400; // Bad Request for unknown intent
        } else {
             // If it wasn't explicitly unknown, but no other outcome, assume error
             status = 500;
             responsePayload.message = determinedAction; // Use the determined action as the message
             responsePayload.outcome = { status: 'error', error: 'Processing failed without specific error details.' };
        }
    }

    return new Response(JSON.stringify(responsePayload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: status, // Use determined status code
    })
  } catch (error: unknown) {
    console.error('Error in RRO:', error)
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    // Check if the error is due to invalid JSON
    if (error instanceof SyntaxError && error.message.includes('JSON')) {
        return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400, // Bad Request
        });
    }
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})