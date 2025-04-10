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
  // threadId?: string; // We will fetch this from the DB based on projectId
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
      // --- Handle Intent-Based Routing ---
      console.log(`Handling intent-based request: ${body.intent}`);

      // --- Fetch Existing Thread ID ---
      let existingThreadId: string | null = null;
      let initialThreadLookupError: string | null = null;
      if (body.projectId) {
        try {
          console.log(`Looking up thread ID for project: ${body.projectId}`);
          const { data: threadData, error: threadError } = await supabaseClient!
            .from('project_threads')
            .select('openai_thread_id')
            .eq('project_id', body.projectId)
            .single(); // Use single() as project_id is PK

          if (threadError && threadError.code !== 'PGRST116') { // Ignore 'No rows found' error
            throw threadError;
          }
          if (threadData) {
            existingThreadId = threadData.openai_thread_id;
            console.log(`Found existing thread ID: ${existingThreadId}`);
          } else {
            console.log(`No existing thread ID found for project: ${body.projectId}`);
          }
        } catch (error) {
           console.error(`Error fetching thread ID for project ${body.projectId}:`, error);
           initialThreadLookupError = error instanceof Error ? error.message : 'Unknown error fetching thread ID.';
           // Decide if this error should halt processing or just be logged
           // For now, we'll log it and potentially proceed without a threadId
        }
      } else {
        console.warn('No projectId provided in intent request body, cannot manage thread persistence.');
        // Depending on requirements, might want to return an error here
      }
      // --- End Fetch Existing Thread ID ---

      // If lookup failed critically, maybe return error early
      if (initialThreadLookupError && !existingThreadId) {
         // Maybe return error response here if thread lookup is mandatory
         // For now, continue and let agent potentially create a new one
      }
      switch (body.intent) {
        case 'generate_script': {
          const agentName = 'script-agent';
          const toolName = 'generate_script';
          console.log(`Attempting MCP-style call to ${agentName} for tool ${toolName}...`);

          const mcpArguments: Record<string, any> = { // Explicit type
            projectId: body.projectId,
            sceneId: body.sceneId, // Include sceneId if available/relevant
            userRequest: body.parameters?.userRequest,
            threadId: existingThreadId, // Pass fetched or null threadId
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
                          // IMPORTANT: Assumes agent function now returns { result: ..., openai_thread_id: '...' }
                          mcpCallOutcome = invokeData.result; // Store the primary result
                          // Use block scope to avoid redeclaration errors
                          {
                            const agentReturnedThreadId = invokeData.openai_thread_id;
                            // If no thread existed before AND the agent returned one (likely created it)
                            if (!existingThreadId && agentReturnedThreadId && body.projectId) {
                              console.log(`Agent returned new thread ID: ${agentReturnedThreadId}. Saving to DB for project ${body.projectId}...`);
                              try {
                                const { error: upsertError } = await supabaseClient!
                                  .from('project_threads')
                                  .upsert({
                                    project_id: body.projectId,
                                    openai_thread_id: agentReturnedThreadId,
                                    updated_at: new Date().toISOString(), // Explicitly set update time
                                  }, { onConflict: 'project_id' }); // Use upsert for safety

                                if (upsertError) {
                                  throw upsertError;
                                }
                                console.log(`Successfully saved new thread ID mapping for project ${body.projectId}.`);
                              } catch (dbError) {
                                console.error(`Failed to save new thread ID mapping for project ${body.projectId}:`, dbError);
                                // Log error, but maybe don't fail the whole request? Depends on requirements.
                              }
                            } else if (existingThreadId && agentReturnedThreadId && existingThreadId !== agentReturnedThreadId) {
                                // Log if the agent somehow returned a *different* thread ID than expected
                                console.warn(`Agent returned thread ID ${agentReturnedThreadId} which differs from the initially fetched ${existingThreadId} for project ${body.projectId}. Check agent logic.`);
                                // Optionally update the DB record here if the agent's ID is considered more authoritative
                            }
                          }
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
            threadId: existingThreadId, // Pass fetched or null threadId
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
                          // IMPORTANT: Assumes agent function now returns { result: ..., openai_thread_id: '...' }
                          mcpCallOutcome = invokeData.result; // Store the primary result
                          // Use block scope to avoid redeclaration errors
                          {
                            const agentReturnedThreadId = invokeData.openai_thread_id;
                            // If no thread existed before AND the agent returned one (likely created it)
                            if (!existingThreadId && agentReturnedThreadId && body.projectId) {
                              console.log(`Agent returned new thread ID: ${agentReturnedThreadId}. Saving to DB for project ${body.projectId}...`);
                              try {
                                const { error: upsertError } = await supabaseClient!
                                  .from('project_threads')
                                  .upsert({
                                    project_id: body.projectId,
                                    openai_thread_id: agentReturnedThreadId,
                                    updated_at: new Date().toISOString(),
                                  }, { onConflict: 'project_id' });

                                if (upsertError) {
                                  throw upsertError;
                                }
                                console.log(`Successfully saved new thread ID mapping for project ${body.projectId}.`);
                              } catch (dbError) {
                                console.error(`Failed to save new thread ID mapping for project ${body.projectId}:`, dbError);
                              }
                            } else if (existingThreadId && agentReturnedThreadId && existingThreadId !== agentReturnedThreadId) {
                                console.warn(`Agent returned thread ID ${agentReturnedThreadId} which differs from the initially fetched ${existingThreadId} for project ${body.projectId}. Check agent logic.`);
                            }
                          }
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
            threadId: existingThreadId, // Pass fetched or null threadId
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
                          // IMPORTANT: Assumes agent function now returns { result: ..., openai_thread_id: '...' }
                          mcpCallOutcome = invokeData.result; // Store the primary result
                          // Use block scope to avoid redeclaration errors
                          {
                            const agentReturnedThreadId = invokeData.openai_thread_id;
                            // If no thread existed before AND the agent returned one (likely created it)
                            if (!existingThreadId && agentReturnedThreadId && body.projectId) {
                              console.log(`Agent returned new thread ID: ${agentReturnedThreadId}. Saving to DB for project ${body.projectId}...`);
                              try {
                                const { error: upsertError } = await supabaseClient!
                                  .from('project_threads')
                                  .upsert({
                                    project_id: body.projectId,
                                    openai_thread_id: agentReturnedThreadId,
                                    updated_at: new Date().toISOString(),
                                  }, { onConflict: 'project_id' });

                                if (upsertError) {
                                  throw upsertError;
                                }
                                console.log(`Successfully saved new thread ID mapping for project ${body.projectId}.`);
                              } catch (dbError) {
                                console.error(`Failed to save new thread ID mapping for project ${body.projectId}:`, dbError);
                              }
                            } else if (existingThreadId && agentReturnedThreadId && existingThreadId !== agentReturnedThreadId) {
                                console.warn(`Agent returned thread ID ${agentReturnedThreadId} which differs from the initially fetched ${existingThreadId} for project ${body.projectId}. Check agent logic.`);
                            }
                          }
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
            // Note: threadId is not typically needed for async image generation tasks
          };
          const task: AgentTaskInput = {
            assigned_agent,
            input_payload,
            project_id: body.projectId,
            scene_id: body.sceneId,
            status: 'pending',
          };
          console.log(`Creating task for ${assigned_agent}:`, task);
          try {
            const { data: newTask, error } = await supabaseClient!
              .from('tasks')
              .insert(task)
              .select()
              .single();

            if (error) throw error;
            taskId = newTask.id; // Store the created task ID
            determinedAction = `Task created for ${assigned_agent} with ID: ${taskId}`;
            mcpCallOutcome = { taskId: taskId }; // Return task ID as outcome
          } catch (error) {
            console.error(`Error creating task for ${assigned_agent}:`, error);
            taskCreationError = error instanceof Error ? error.message : 'Unknown error creating task.';
            determinedAction = `Error creating task for ${assigned_agent}.`;
          }
          break; // Added break statement
        }
        case 'update_scene': { // Use block scope
          const assigned_agent = 'SceneUpdateWorker'; // Or a direct function call if synchronous
          const input_payload = {
            taskType: 'update_scene',
            sceneId: body.sceneId || body.parameters?.sceneId, // Get sceneId from standard location or parameters
            updates: body.parameters?.updates, // Expecting an object like { scene_script: '...', image_prompt: '...' }
            projectId: body.projectId,
            // Note: threadId is not typically needed for async scene updates
          };
          // Basic validation
          if (!input_payload.sceneId || !input_payload.updates || typeof input_payload.updates !== 'object' || Object.keys(input_payload.updates).length === 0) {
              mcpCallError = 'Missing sceneId or updates for update_scene intent.';
              determinedAction = `Error: Invalid parameters for ${body.intent}.`;
              break; // Exit case
          }

          const task: AgentTaskInput = {
            assigned_agent,
            input_payload,
            project_id: body.projectId,
            scene_id: input_payload.sceneId,
            status: 'pending',
          };
          console.log(`Creating task for ${assigned_agent}:`, task);
          try {
            const { data: newTask, error } = await supabaseClient!
              .from('tasks')
              .insert(task)
              .select()
              .single();

            if (error) throw error;
            taskId = newTask.id; // Store the created task ID
            determinedAction = `Task created for ${assigned_agent} with ID: ${taskId}`;
            mcpCallOutcome = { taskId: taskId }; // Return task ID as outcome
          } catch (error) {
            console.error(`Error creating task for ${assigned_agent}:`, error);
            taskCreationError = error instanceof Error ? error.message : 'Unknown error creating task.';
            determinedAction = `Error creating task for ${assigned_agent}.`;
          }
          break; // Added break statement
        }
        default:
          console.log(`Unknown intent: ${body.intent}`);
          determinedAction = `Unknown intent received: ${body.intent}`;
          mcpCallError = `The requested intent '${body.intent}' is not recognized.`;
          // Set status to indicate a client error (bad request)
          // finalStatus = 400; // This will be handled in response generation
      }
      // --- End Intent-Based Routing ---

    } else {
      // Handle cases where the request body doesn't match known structures
      console.error('Invalid request body structure:', body);
      determinedAction = 'Invalid request body structure.';
      mcpCallError = 'The request body did not match expected formats (ApproveScript or IntentRequest).';
      // finalStatus = 400; // This will be handled in response generation
    }

    // --- Response Generation ---
    // Determine final status based on errors or outcomes
    let finalStatus = 200;
    let responseBody: Record<string, any> = { // Explicit type
      actionTaken: determinedAction,
      // IMPORTANT: Only return the primary outcome, not the internal thread ID details
      outcome: mcpCallOutcome, // Use the processed outcome
    };

    if (taskCreationError) {
      finalStatus = 500; // Internal Server Error for task creation failure
      responseBody.error = `Failed to create task: ${taskCreationError}`;
      delete responseBody.outcome; // Don't include outcome if there was an error
    } else if (mcpCallError) {
      // If an MCP-style call resulted in an error
      finalStatus = determinedAction.startsWith('Unknown intent') || determinedAction.startsWith('Error: Invalid parameters') || determinedAction.startsWith('Invalid request body') ? 400 : 500; // Use 400 for client errors, 500 otherwise
      responseBody.error = `MCP call failed: ${mcpCallError}`;
      delete responseBody.outcome; // Don't include outcome if there was an error
    } else if (taskId) {
      // If a task was created successfully, ensure outcome reflects this if not already set
      if (responseBody.outcome === null) {
         responseBody.outcome = { taskId: taskId };
      }
      // Status remains 200 (or maybe 202 Accepted if preferred for async tasks)
    } else if (mcpCallOutcome !== null) { // Check if outcome has been set from a direct call
      // Outcome is already set in responseBody initialization
      // Status remains 200
    } else {
       // If no specific outcome, error, or task ID, it might indicate an unexpected path
       // Check if determinedAction indicates success or a handled state
       if (!determinedAction.toLowerCase().includes('success') && !determinedAction.toLowerCase().includes('task created')) {
          // If no positive action was determined and no error was explicitly set,
          // it might be an unhandled case or a logic path that didn't set an outcome.
          console.warn(`Request completed without explicit success outcome or error. Action: ${determinedAction}`);
          // Optionally set a default error or adjust status if this state is unexpected.
          // For now, let it return 200 with the determinedAction and null outcome.
          if (responseBody.outcome === null) {
             // Set outcome to null explicitly if it wasn't set
             responseBody.outcome = null;
          }
       }
    }


    console.log(`RRO Final Response (Status ${finalStatus}):`, responseBody);
    return new Response(JSON.stringify(responseBody), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: finalStatus,
    });

  } catch (error) {
    // Catch any unexpected errors during request processing
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    console.error('Unexpected error in RRO serve function:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error', detail: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});