// @ts-ignore deno-specific import
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
// @ts-ignore deno-specific import
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2' // Added import
// @ts-ignore Deno requires .ts extension
import { corsHeaders } from '../_shared/cors.ts' // Assuming tsconfig allows .ts imports for Deno

console.log(`[${new Date().toISOString()}] [RRO Boot] Request Router Orchestrator function booting up...`);

// Initialize Supabase client
let supabaseClient: SupabaseClient | null = null;
try {
  console.log(`[${new Date().toISOString()}] [RRO Boot] Attempting to initialize Supabase client...`);
  // @ts-ignore Deno namespace
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  // @ts-ignore Deno namespace
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(`[${new Date().toISOString()}] [RRO Boot Error] Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables.`);
    throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables.');
  }
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  console.log(`[${new Date().toISOString()}] [RRO Boot] Supabase client initialized successfully.`);
} catch (error: unknown) { // Catch as unknown
  const errorMessage = error instanceof Error ? error.message : "Unknown error during Supabase client initialization.";
  console.error(`[${new Date().toISOString()}] [RRO Boot Error] Failed to initialize Supabase client:`, errorMessage);
  // Let the function continue, but the client check later will fail requests.
}

// Global variables to store discovered tools
// Using 'any' for simplicity, consider defining a proper Tool interface later
let scriptAgentTools: any[] = [];
let promptAgentTools: any[] = [];

// Function to discover tools from an agent
async function discoverAgentTools(agentName: string, client: SupabaseClient): Promise<any[]> {
  console.log(`[${new Date().toISOString()}] [Tool Discovery] Discovering tools for agent: ${agentName}...`);
  const listToolsRequestBody = { action: 'list_tools' };
  try {
    // Use the provided client instance
    const { data, error } = await client.functions.invoke(agentName, {
      body: listToolsRequestBody,
    });

    if (error) {
      console.error(`[${new Date().toISOString()}] [Tool Discovery Error] Error invoking list_tools on ${agentName}:`, error.message);
      return []; // Return empty array on invocation error
    }

    // Basic validation of the response structure
    if (data && data.status === 'success' && data.result && Array.isArray(data.result.tools)) {
      console.log(`[${new Date().toISOString()}] [Tool Discovery] Successfully discovered ${data.result.tools.length} tools for ${agentName}.`);
      return data.result.tools; // Return the discovered tools
    } else {
      console.error(`[${new Date().toISOString()}] [Tool Discovery Error] Unexpected response structure or status from ${agentName} list_tools:`, data);
      return []; // Return empty array on unexpected response
    }
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error(`[${new Date().toISOString()}] [Tool Discovery Error] Unexpected error during tool discovery for ${agentName}:`, errorMessage);
    return []; // Return empty array on unexpected error
  }
}

// Discover tools from agents at startup, only if client initialized
if (supabaseClient) {
  console.log(`[${new Date().toISOString()}] [RRO Boot] Starting agent tool discovery...`);
  // Capture the initialized client in a variable accessible to the async scope
  const discoveryClient = supabaseClient;
  // Use an immediately invoked async function expression (IIAFE) or Promise.all directly
  Promise.all([
    discoverAgentTools('script-agent', discoveryClient),
    discoverAgentTools('prompt-agent', discoveryClient)
  ]).then(([scriptTools, promptTools]) => {
    scriptAgentTools = scriptTools;
    promptAgentTools = promptTools;
    console.log(`[${new Date().toISOString()}] [RRO Boot] Tool discovery completed.`);
    // Optional: Log discovered tool names for verification
    console.log(`[${new Date().toISOString()}] [RRO Boot] Script Agent Tools (${scriptAgentTools.length}):`, scriptAgentTools.map(t => t?.name || 'unknown'));
    console.log(`[${new Date().toISOString()}] [RRO Boot] Prompt Agent Tools (${promptAgentTools.length}):`, promptAgentTools.map(t => t?.name || 'unknown'));
  }).catch(error => {
    // This catch handles errors from Promise.all itself (e.g., if one promise rejects unexpectedly)
    // Individual discovery errors are handled within discoverAgentTools
    console.error(`[${new Date().toISOString()}] [RRO Boot Error] Error during the Promise.all execution for tool discovery:`, error);
  });
} else {
    // Log if discovery is skipped due to client initialization failure
    console.warn(`[${new Date().toISOString()}] [RRO Boot Warn] Supabase client not initialized at startup. Skipping agent tool discovery.`);
}


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
  const requestStartTime = Date.now();
  console.log(`[${new Date().toISOString()}] [RRO Request Start] Received request. Method: ${req.method}, URL: ${req.url}`);

  // Handle preflight requests for CORS
  if (req.method === 'OPTIONS') {
    console.log(`[${new Date().toISOString()}] [RRO CORS] Handling OPTIONS request.`);
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Ensure the request method is POST
    console.log(`[${new Date().toISOString()}] [RRO Check Method] Validating method...`);
    if (req.method !== 'POST') {
      console.error(`[${new Date().toISOString()}] [RRO Error] Method Not Allowed: ${req.method}`);
      return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 405,
      })
    }
    console.log(`[${new Date().toISOString()}] [RRO Check Method] Method is POST.`);

    // Check if Supabase client is initialized
    console.log(`[${new Date().toISOString()}] [RRO Check Client] Checking Supabase client initialization...`);
    if (!supabaseClient) {
        console.error(`[${new Date().toISOString()}] [RRO Error] Supabase client not initialized. Cannot process request.`);
        return new Response(JSON.stringify({ error: 'Internal Server Error: Supabase client not available' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
    console.log(`[${new Date().toISOString()}] [RRO Check Client] Supabase client is initialized.`);

    console.log(`[${new Date().toISOString()}] [RRO Parse Body] Attempting to parse request body...`);
    const body = await req.json();
    console.log(`[${new Date().toISOString()}] [RRO Parse Body] Request body parsed:`, JSON.stringify(body)); // Log stringified body

    // --- Authentication Check ---
    console.log(`[${new Date().toISOString()}] [RRO Auth] Performing authentication check...`);
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) { // Removed supabaseClient check as it's done above
      console.error(`[${new Date().toISOString()}] [RRO Auth Error] Auth header missing.`);
      return new Response(JSON.stringify({ error: 'Unauthorized: Missing credentials.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(jwt);

    if (userError || !user) {
      console.error(`[${new Date().toISOString()}] [RRO Auth Error] Authentication failed:`, userError?.message || 'No user found.');
      return new Response(JSON.stringify({ error: 'Unauthorized: Authentication failed.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }
    console.log(`[${new Date().toISOString()}] [RRO Auth] Authenticated user: ${user.id}`);
    // --- End Authentication Check ---

    let determinedAction = 'No action determined'; // Default action message
    let taskId: string | null = null; // Variable to hold the created task ID for async tasks
    let taskCreationError: string | null = null; // Variable to hold potential task creation errors
    let mcpCallOutcome: any = null; // Variable to hold the result of a direct MCP-style function call
    let mcpCallError: string | null = null; // Variable to hold potential MCP call errors

    // --- Request Routing ---
    console.log(`[${new Date().toISOString()}] [RRO Route] Determining request type...`);

    if (isApproveScriptRequest(body)) {
      // --- Handle /approve script Workflow ---
      console.log(`[${new Date().toISOString()}] [RRO Route] Handling 'approve script' workflow for project: ${body.projectId}`);
      const { projectId } = body;

      try {
        // 1. Fetch the script from the project
        console.log(`[${new Date().toISOString()}] [Approve Script] Fetching script for project ${projectId}...`);
        const { data: projectData, error: fetchError } = await supabaseClient!
          .from('canvas_projects')
          .select('full_script') // Assuming the column name is 'full_script'
          .eq('id', projectId)
          .single();

        if (fetchError || !projectData) {
          console.error(`[${new Date().toISOString()}] [Approve Script Error] Failed to fetch project ${projectId}:`, fetchError?.message || 'No project data');
          throw new Error(`Failed to fetch project or script not found: ${fetchError?.message || 'No project data'}`);
        }
        const scriptContent = projectData.full_script;
        if (!scriptContent) {
          console.error(`[${new Date().toISOString()}] [Approve Script Error] Script content is empty for project ${projectId}`);
          throw new Error(`Script content is empty for project ${projectId}`);
        }
        console.log(`[${new Date().toISOString()}] [Approve Script] Script fetched successfully. Length: ${scriptContent.length}`);

        // 2. Call divide-script function
        console.log(`[${new Date().toISOString()}] [Approve Script] Calling 'divide-script' function...`);
        const { data: divideResult, error: divideError } = await supabaseClient!.functions.invoke(
          'divide-script',
          { body: { script: scriptContent } }
        );

        if (divideError) {
          console.error(`[${new Date().toISOString()}] [Approve Script Error] Error calling 'divide-script':`, divideError);
          throw new Error(`Error calling 'divide-script': ${divideError.message}`);
        }
        if (!divideResult || !Array.isArray(divideResult.scenes)) {
          console.error(`[${new Date().toISOString()}] [Approve Script Error] Invalid response from 'divide-script':`, divideResult);
          throw new Error(`Invalid response from 'divide-script': ${JSON.stringify(divideResult)}`);
        }
        console.log(`[${new Date().toISOString()}] [Approve Script] 'divide-script' returned ${divideResult.scenes.length} scenes.`);

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
          console.log(`[${new Date().toISOString()}] [Approve Script] Inserting ${scenesToInsert.length} scenes into 'canvas_scenes'...`);
          const { error: insertError } = await supabaseClient!
            .from('canvas_scenes')
            .insert(scenesToInsert);

          if (insertError) {
            console.error(`[${new Date().toISOString()}] [Approve Script Error] Failed to insert scenes:`, insertError);
            throw new Error(`Failed to insert scenes: ${insertError.message}`);
          }
          console.log(`[${new Date().toISOString()}] [Approve Script] Scenes inserted successfully.`);
        } else {
           console.log("[${new Date().toISOString()}] [Approve Script] No scenes generated by 'divide-script', nothing to insert.");
        }


        // 4. Trigger Pipeline Runner (Placeholder - Implement actual trigger later)
        console.log(`[${new Date().toISOString()}] [Approve Script] Placeholder: Triggering generation pipeline for project ${projectId}...`);
        // Example: await supabaseClient!.functions.invoke('mcp-pipeline-runner', { body: { projectId } });
        // Or: await callMCPTool('pipeline_runner', 'start_project_generation', { projectId });

        determinedAction = `Successfully processed 'approve script' for project ${projectId}. ${scenesToInsert.length} scenes created. Generation pipeline triggered (placeholder).`;
        mcpCallOutcome = { scenesCreated: scenesToInsert.length }; // Use mcpCallOutcome for success data

      } catch (error) {
        console.error(`[${new Date().toISOString()}] [Approve Script Error] Error during 'approve script' workflow:`, error);
        determinedAction = `Error processing 'approve script': ${error instanceof Error ? error.message : 'Unknown error'}`;
        mcpCallError = error instanceof Error ? error.message : 'Unknown error during approve script workflow';
      }
      // --- End /approve script Workflow ---

    } else if (isIntentRequest(body)) {
      // --- Handle Intent-Based Routing ---
      console.log(`[${new Date().toISOString()}] [RRO Route] Handling intent-based request. Intent: ${body.intent}`);

      // --- Fetch Existing Thread ID ---
      let existingThreadId: string | null = null;
      let initialThreadLookupError: string | null = null;
      if (body.projectId) {
        try {
          console.log(`[${new Date().toISOString()}] [RRO Thread Lookup] Looking up thread ID for project: ${body.projectId}`);
          const { data: threadData, error: threadError } = await supabaseClient!
            .from('project_threads')
            .select('openai_thread_id')
            .eq('project_id', body.projectId)
            .single(); // Use single() as project_id is PK

          if (threadError && threadError.code !== 'PGRST116') { // Ignore 'No rows found' error
            console.error(`[${new Date().toISOString()}] [RRO Thread Lookup Error] DB error fetching thread ID for project ${body.projectId}:`, threadError);
            throw threadError;
          }
          if (threadData) {
            existingThreadId = threadData.openai_thread_id;
            console.log(`[${new Date().toISOString()}] [RRO Thread Lookup] Found existing thread ID: ${existingThreadId}`);
          } else {
            console.log(`[${new Date().toISOString()}] [RRO Thread Lookup] No existing thread ID found for project: ${body.projectId}`);
          }
        } catch (error) {
           console.error(`[${new Date().toISOString()}] [RRO Thread Lookup Error] Exception fetching thread ID for project ${body.projectId}:`, error);
           initialThreadLookupError = error instanceof Error ? error.message : 'Unknown error fetching thread ID.';
           // Logged error, continue and let agent handle thread creation if needed
        }
      } else {
        console.warn(`[${new Date().toISOString()}] [RRO Thread Lookup Warn] No projectId provided in intent request body, cannot manage thread persistence.`);
      }
      // --- End Fetch Existing Thread ID ---

      // If lookup failed critically, maybe return error early (currently just logged)
      // if (initialThreadLookupError && !existingThreadId) { ... }

      console.log(`[${new Date().toISOString()}] [RRO Intent Switch] Routing based on intent: ${body.intent}`);
      switch (body.intent) {
        case 'generate_script': {
          const agentName = 'script-agent';
          const toolName = 'generate_script';
          console.log(`[${new Date().toISOString()}] [RRO Intent: ${body.intent}] Attempting MCP-style call to ${agentName} for tool ${toolName}...`);

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
          console.log(`[${new Date().toISOString()}] [RRO Intent: ${body.intent}] Checking if tool '${toolName}' exists for agent '${agentName}'...`);
          if (!scriptAgentTools.some(tool => tool.name === toolName)) {
              console.error(`[${new Date().toISOString()}] [RRO Error] Tool '${toolName}' not found for agent '${agentName}'. Available: ${scriptAgentTools.map(t => t?.name || 'unknown').join(', ')}`);
              mcpCallError = `Tool '${toolName}' is not available for agent '${agentName}'.`;
              determinedAction = `Error: Tool not found for ${agentName}.`;
              // Skip invocation, error is set, proceed to response generation
          } else {
              // Tool found, proceed with invocation
              console.log(`[${new Date().toISOString()}] [RRO Intent: ${body.intent}] Tool found. Invoking ${agentName} with body:`, JSON.stringify(mcpRequestBody, null, 2));

              // Use try/catch for the async operation
              try {
                  const { data: invokeData, error: invokeError } = await supabaseClient!.functions.invoke(agentName, {
                    body: mcpRequestBody,
                    // No 'noWait: true' - we wait for the result
                  });

                  if (invokeError) {
                    // Handle errors specifically from the invocation itself (network, function not found, etc.)
                    console.error(`[${new Date().toISOString()}] [RRO Error] Error invoking ${agentName}:`, invokeError);
                    determinedAction = `Error invoking ${agentName}`;
                    mcpCallError = invokeError.message;
                  } else if (invokeData) {
                    console.log(`[${new Date().toISOString()}] [RRO Intent: ${body.intent}] ${agentName} response received:`, invokeData);
                    // Check the structure of the returned data for MCP compliance
                    if (typeof invokeData === 'object' && invokeData !== null && 'status' in invokeData) {
                        if (invokeData.status === 'success') {
                          determinedAction = `Successfully invoked ${agentName} for ${toolName}.`;
                          // IMPORTANT: Assumes agent function now returns { result: ..., openai_thread_id: '...' }
                          mcpCallOutcome = invokeData.result; // Store the primary result
                          console.log(`[${new Date().toISOString()}] [RRO Intent: ${body.intent}] Agent call successful. Outcome:`, mcpCallOutcome);
                          // Use block scope to avoid redeclaration errors
                          {
                            const agentReturnedThreadId = invokeData.openai_thread_id;
                            console.log(`[${new Date().toISOString()}] [RRO Thread Save] Checking if thread ID needs saving. Existing: ${existingThreadId}, Returned: ${agentReturnedThreadId}, Project: ${body.projectId}`);
                            // If no thread existed before AND the agent returned one (likely created it)
                            if (!existingThreadId && agentReturnedThreadId && body.projectId) {
                              console.log(`[${new Date().toISOString()}] [RRO Thread Save] Agent returned new thread ID: ${agentReturnedThreadId}. Saving to DB for project ${body.projectId}...`);
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
                                console.log(`[${new Date().toISOString()}] [RRO Thread Save] Successfully saved new thread ID mapping for project ${body.projectId}.`);
                              } catch (dbError) {
                                console.error(`[${new Date().toISOString()}] [RRO Thread Save Error] Failed to save new thread ID mapping for project ${body.projectId}:`, dbError);
                                // Log error, but maybe don't fail the whole request? Depends on requirements.
                              }
                            } else if (existingThreadId && agentReturnedThreadId && existingThreadId !== agentReturnedThreadId) {
                                // Log if the agent somehow returned a *different* thread ID than expected
                                console.warn(`[${new Date().toISOString()}] [RRO Thread Save Warn] Agent returned thread ID ${agentReturnedThreadId} which differs from the initially fetched ${existingThreadId} for project ${body.projectId}. Check agent logic.`);
                                // Optionally update the DB record here if the agent's ID is considered more authoritative
                            } else {
                                console.log(`[${new Date().toISOString()}] [RRO Thread Save] No thread ID update needed.`);
                            }
                          }
                        } else if (invokeData.status === 'error') {
                          determinedAction = `Error reported by ${agentName} for ${toolName}.`;
                          // Try to extract a meaningful error message
                          const agentError = invokeData.error;
                          mcpCallError = typeof agentError === 'string' ? agentError : (agentError?.message || JSON.stringify(agentError) || 'Unknown error structure from agent.');
                          console.error(`[${new Date().toISOString()}] [RRO Error] ${agentName} returned error:`, mcpCallError);
                        } else {
                          // Handle cases where 'status' is present but not 'success' or 'error'
                           determinedAction = `Unexpected status value from ${agentName}: ${invokeData.status}`;
                           mcpCallError = `Unexpected status: ${JSON.stringify(invokeData)}`;
                           console.error(`[${new Date().toISOString()}] [RRO Error]`, mcpCallError);
                        }
                    } else {
                       // Handle cases where the response is not in the expected MCP format
                       determinedAction = `Unexpected response structure from ${agentName}. Expected { status: '...', ... }`;
                       mcpCallError = `Unexpected response format: ${JSON.stringify(invokeData)}`;
                       console.error(`[${new Date().toISOString()}] [RRO Error]`, mcpCallError);
                    }
                  } else {
                    // Handle cases where invocation succeeds but returns no data (should ideally not happen with sync calls)
                    console.error(`[${new Date().toISOString()}] [RRO Error] Invocation of ${agentName} did not return data or specific error.`);
                    determinedAction = `Invocation issue with ${agentName}: No data returned.`;
                    mcpCallError = 'Invocation completed without returning data or a specific error.';
                  }
              } catch (e: unknown) {
                  // Catch any other unexpected errors during the invoke call
                  console.error(`[${new Date().toISOString()}] [RRO Error] Unexpected error during ${agentName} invocation:`, e);
                  determinedAction = `Unexpected error during ${agentName} invocation.`;
                  mcpCallError = e instanceof Error ? e.message : String(e);
              }
          }
          break;
        }
        case 'refine_script': {
          const agentName = 'script-agent';
          const toolName = 'refine_script';
          console.log(`[${new Date().toISOString()}] [RRO Intent: ${body.intent}] Attempting MCP-style call to ${agentName} for tool ${toolName}...`);

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
          console.log(`[${new Date().toISOString()}] [RRO Intent: ${body.intent}] Checking if tool '${toolName}' exists for agent '${agentName}'...`);
          if (!scriptAgentTools.some(tool => tool.name === toolName)) {
              console.error(`[${new Date().toISOString()}] [RRO Error] Tool '${toolName}' not found for agent '${agentName}'. Available: ${scriptAgentTools.map(t => t?.name || 'unknown').join(', ')}`);
              mcpCallError = `Tool '${toolName}' is not available for agent '${agentName}'.`;
              determinedAction = `Error: Tool not found for ${agentName}.`;
          } else {
              // Tool found, proceed with invocation
              console.log(`[${new Date().toISOString()}] [RRO Intent: ${body.intent}] Tool found. Invoking ${agentName} with body:`, JSON.stringify(mcpRequestBody, null, 2));

              try {
                  const { data: invokeData, error: invokeError } = await supabaseClient!.functions.invoke(agentName, {
                    body: mcpRequestBody,
                  });

                  if (invokeError) {
                    console.error(`[${new Date().toISOString()}] [RRO Error] Error invoking ${agentName}:`, invokeError);
                    determinedAction = `Error invoking ${agentName}`;
                    mcpCallError = invokeError.message;
                  } else if (invokeData) {
                    console.log(`[${new Date().toISOString()}] [RRO Intent: ${body.intent}] ${agentName} response received:`, invokeData);
                    if (typeof invokeData === 'object' && invokeData !== null && 'status' in invokeData) {
                        if (invokeData.status === 'success') {
                          determinedAction = `Successfully invoked ${agentName} for ${toolName}.`;
                          // IMPORTANT: Assumes agent function now returns { result: ..., openai_thread_id: '...' }
                          mcpCallOutcome = invokeData.result; // Store the primary result
                          console.log(`[${new Date().toISOString()}] [RRO Intent: ${body.intent}] Agent call successful. Outcome:`, mcpCallOutcome);
                          // Use block scope to avoid redeclaration errors
                          {
                            const agentReturnedThreadId = invokeData.openai_thread_id;
                            console.log(`[${new Date().toISOString()}] [RRO Thread Save] Checking if thread ID needs saving. Existing: ${existingThreadId}, Returned: ${agentReturnedThreadId}, Project: ${body.projectId}`);
                            // If no thread existed before AND the agent returned one (likely created it)
                            if (!existingThreadId && agentReturnedThreadId && body.projectId) {
                              console.log(`[${new Date().toISOString()}] [RRO Thread Save] Agent returned new thread ID: ${agentReturnedThreadId}. Saving to DB for project ${body.projectId}...`);
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
                                console.log(`[${new Date().toISOString()}] [RRO Thread Save] Successfully saved new thread ID mapping for project ${body.projectId}.`);
                              } catch (dbError) {
                                console.error(`[${new Date().toISOString()}] [RRO Thread Save Error] Failed to save new thread ID mapping for project ${body.projectId}:`, dbError);
                              }
                            } else if (existingThreadId && agentReturnedThreadId && existingThreadId !== agentReturnedThreadId) {
                                console.warn(`[${new Date().toISOString()}] [RRO Thread Save Warn] Agent returned thread ID ${agentReturnedThreadId} which differs from the initially fetched ${existingThreadId} for project ${body.projectId}. Check agent logic.`);
                            } else {
                                console.log(`[${new Date().toISOString()}] [RRO Thread Save] No thread ID update needed.`);
                            }
                          }
                        } else if (invokeData.status === 'error') {
                          determinedAction = `Error reported by ${agentName} for ${toolName}.`;
                          const agentError = invokeData.error;
                          mcpCallError = typeof agentError === 'string' ? agentError : (agentError?.message || JSON.stringify(agentError) || 'Unknown error structure from agent.');
                          console.error(`[${new Date().toISOString()}] [RRO Error] ${agentName} returned error:`, mcpCallError);
                        } else {
                           determinedAction = `Unexpected status value from ${agentName}: ${invokeData.status}`;
                           mcpCallError = `Unexpected status: ${JSON.stringify(invokeData)}`;
                           console.error(`[${new Date().toISOString()}] [RRO Error]`, mcpCallError);
                        }
                    } else {
                       determinedAction = `Unexpected response structure from ${agentName}. Expected { status: '...', ... }`;
                       mcpCallError = `Unexpected response format: ${JSON.stringify(invokeData)}`;
                       console.error(`[${new Date().toISOString()}] [RRO Error]`, mcpCallError);
                    }
                  } else {
                    console.error(`[${new Date().toISOString()}] [RRO Error] Invocation of ${agentName} did not return data or specific error.`);
                    determinedAction = `Invocation issue with ${agentName}: No data returned.`;
                    mcpCallError = 'Invocation completed without returning data or a specific error.';
                  }
              } catch (e: unknown) {
                  console.error(`[${new Date().toISOString()}] [RRO Error] Unexpected error during ${agentName} invocation:`, e);
                  determinedAction = `Unexpected error during ${agentName} invocation.`;
                  mcpCallError = e instanceof Error ? e.message : String(e);
              }
          }
          break;
        }
        case 'generate_prompt': {
          const agentName = 'prompt-agent'; // Target function name
          const toolName = 'generate_prompt';
          console.log(`[${new Date().toISOString()}] [RRO Intent: ${body.intent}] Attempting MCP-style call to ${agentName} for tool ${toolName}...`);

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
          console.log(`[${new Date().toISOString()}] [RRO Intent: ${body.intent}] Checking if tool '${toolName}' exists for agent '${agentName}'...`);
          if (!promptAgentTools.some(tool => tool.name === toolName)) {
              console.error(`[${new Date().toISOString()}] [RRO Error] Tool '${toolName}' not found for agent '${agentName}'. Available: ${promptAgentTools.map(t => t?.name || 'unknown').join(', ')}`);
              mcpCallError = `Tool '${toolName}' is not available for agent '${agentName}'.`;
              determinedAction = `Error: Tool not found for ${agentName}.`;
          } else {
              // Tool found, proceed with invocation
              console.log(`[${new Date().toISOString()}] [RRO Intent: ${body.intent}] Tool found. Invoking ${agentName} with body:`, JSON.stringify(mcpRequestBody, null, 2));

              try {
                  const { data: invokeData, error: invokeError } = await supabaseClient!.functions.invoke(agentName, {
                    body: mcpRequestBody,
                  });

                  if (invokeError) {
                    console.error(`[${new Date().toISOString()}] [RRO Error] Error invoking ${agentName}:`, invokeError);
                    determinedAction = `Error invoking ${agentName}`;
                    mcpCallError = invokeError.message;
                  } else if (invokeData) {
                    console.log(`[${new Date().toISOString()}] [RRO Intent: ${body.intent}] ${agentName} response received:`, invokeData);
                     if (typeof invokeData === 'object' && invokeData !== null && 'status' in invokeData) {
                        if (invokeData.status === 'success') {
                          determinedAction = `Successfully invoked ${agentName} for ${toolName}.`;
                          // IMPORTANT: Assumes agent function now returns { result: ..., openai_thread_id: '...' }
                          mcpCallOutcome = invokeData.result; // Store the primary result
                          console.log(`[${new Date().toISOString()}] [RRO Intent: ${body.intent}] Agent call successful. Outcome:`, mcpCallOutcome);
                          // Use block scope to avoid redeclaration errors
                          {
                            const agentReturnedThreadId = invokeData.openai_thread_id;
                            console.log(`[${new Date().toISOString()}] [RRO Thread Save] Checking if thread ID needs saving. Existing: ${existingThreadId}, Returned: ${agentReturnedThreadId}, Project: ${body.projectId}`);
                            // If no thread existed before AND the agent returned one (likely created it)
                            if (!existingThreadId && agentReturnedThreadId && body.projectId) {
                              console.log(`[${new Date().toISOString()}] [RRO Thread Save] Agent returned new thread ID: ${agentReturnedThreadId}. Saving to DB for project ${body.projectId}...`);
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
                                console.log(`[${new Date().toISOString()}] [RRO Thread Save] Successfully saved new thread ID mapping for project ${body.projectId}.`);
                              } catch (dbError) {
                                console.error(`[${new Date().toISOString()}] [RRO Thread Save Error] Failed to save new thread ID mapping for project ${body.projectId}:`, dbError);
                              }
                            } else if (existingThreadId && agentReturnedThreadId && existingThreadId !== agentReturnedThreadId) {
                                console.warn(`[${new Date().toISOString()}] [RRO Thread Save Warn] Agent returned thread ID ${agentReturnedThreadId} which differs from the initially fetched ${existingThreadId} for project ${body.projectId}. Check agent logic.`);
                            } else {
                                console.log(`[${new Date().toISOString()}] [RRO Thread Save] No thread ID update needed.`);
                            }
                          }
                        } else if (invokeData.status === 'error') {
                          determinedAction = `Error reported by ${agentName} for ${toolName}.`;
                          const agentError = invokeData.error;
                          mcpCallError = typeof agentError === 'string' ? agentError : (agentError?.message || JSON.stringify(agentError) || 'Unknown error structure from agent.');
                          console.error(`[${new Date().toISOString()}] [RRO Error] ${agentName} returned error:`, mcpCallError);
                        } else {
                           determinedAction = `Unexpected status value from ${agentName}: ${invokeData.status}`;
                           mcpCallError = `Unexpected status: ${JSON.stringify(invokeData)}`;
                           console.error(`[${new Date().toISOString()}] [RRO Error]`, mcpCallError);
                        }
                    } else {
                       determinedAction = `Unexpected response structure from ${agentName}. Expected { status: '...', ... }`;
                       mcpCallError = `Unexpected response format: ${JSON.stringify(invokeData)}`;
                       console.error(`[${new Date().toISOString()}] [RRO Error]`, mcpCallError);
                    }
                  } else {
                    console.error(`[${new Date().toISOString()}] [RRO Error] Invocation of ${agentName} did not return data or specific error.`);
                    determinedAction = `Invocation issue with ${agentName}: No data returned.`;
                    mcpCallError = 'Invocation completed without returning data or a specific error.';
                  }
              } catch (e: unknown) {
                  console.error(`[${new Date().toISOString()}] [RRO Error] Unexpected error during ${agentName} invocation:`, e);
                  determinedAction = `Unexpected error during ${agentName} invocation.`;
                  mcpCallError = e instanceof Error ? e.message : String(e);
              }
          }
          break;
        }
        case 'generate_image': { // Use block scope
          const assigned_agent = 'ImageGenerationWorker';
          console.log(`[${new Date().toISOString()}] [RRO Intent: ${body.intent}] Creating task for ${assigned_agent}...`);
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
          console.log(`[${new Date().toISOString()}] [RRO Intent: ${body.intent}] Task payload:`, JSON.stringify(task));
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
            console.log(`[${new Date().toISOString()}] [RRO Intent: ${body.intent}] Task created successfully. ID: ${taskId}`);
          } catch (error) {
            console.error(`[${new Date().toISOString()}] [RRO Error] Error creating task for ${assigned_agent}:`, error);
            taskCreationError = error instanceof Error ? error.message : 'Unknown error creating task.';
            determinedAction = `Error creating task for ${assigned_agent}.`;
          }
          break; // Added break statement
        }
        case 'update_scene': { // Use block scope
          const assigned_agent = 'SceneUpdateWorker'; // Or a direct function call if synchronous
          console.log(`[${new Date().toISOString()}] [RRO Intent: ${body.intent}] Creating task for ${assigned_agent}...`);
          const input_payload = {
            taskType: 'update_scene',
            sceneId: body.sceneId || body.parameters?.sceneId, // Get sceneId from standard location or parameters
            updates: body.parameters?.updates, // Expecting an object like { scene_script: '...', image_prompt: '...' }
            projectId: body.projectId,
            // Note: threadId is not typically needed for async scene updates
          };
          // Basic validation
          console.log(`[${new Date().toISOString()}] [RRO Intent: ${body.intent}] Validating parameters...`);
          if (!input_payload.sceneId || !input_payload.updates || typeof input_payload.updates !== 'object' || Object.keys(input_payload.updates).length === 0) {
              console.error(`[${new Date().toISOString()}] [RRO Error] Invalid parameters for ${body.intent}. SceneId: ${input_payload.sceneId}, Updates: ${JSON.stringify(input_payload.updates)}`);
              mcpCallError = 'Missing sceneId or updates for update_scene intent.';
              determinedAction = `Error: Invalid parameters for ${body.intent}.`;
              break; // Exit case
          }
          console.log(`[${new Date().toISOString()}] [RRO Intent: ${body.intent}] Parameters validated.`);

          const task: AgentTaskInput = {
            assigned_agent,
            input_payload,
            project_id: body.projectId,
            scene_id: input_payload.sceneId,
            status: 'pending',
          };
          console.log(`[${new Date().toISOString()}] [RRO Intent: ${body.intent}] Task payload:`, JSON.stringify(task));
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
            console.log(`[${new Date().toISOString()}] [RRO Intent: ${body.intent}] Task created successfully. ID: ${taskId}`);
          } catch (error) {
            console.error(`[${new Date().toISOString()}] [RRO Error] Error creating task for ${assigned_agent}:`, error);
            taskCreationError = error instanceof Error ? error.message : 'Unknown error creating task.';
            determinedAction = `Error creating task for ${assigned_agent}.`;
          }
          break; // Added break statement
        }
        default:
          console.log(`[${new Date().toISOString()}] [RRO Warn] Unknown intent: ${body.intent}`);
          determinedAction = `Unknown intent received: ${body.intent}`;
          mcpCallError = `The requested intent '${body.intent}' is not recognized.`;
          // Status will be set to 400 later
      }
      // --- End Intent-Based Routing ---

    } else {
      // Handle cases where the request body doesn't match known structures
      console.error(`[${new Date().toISOString()}] [RRO Error] Invalid request body structure:`, body);
      determinedAction = 'Invalid request body structure.';
      mcpCallError = 'The request body did not match expected formats (ApproveScript or IntentRequest).';
      // Status will be set to 400 later
    }

    // --- Response Generation ---
    console.log(`[${new Date().toISOString()}] [RRO Response Gen] Generating final response...`);
    // Determine final status based on errors or outcomes
    let finalStatus = 200;
    let responseBody: Record<string, any> = { // Explicit type
      actionTaken: determinedAction,
      // IMPORTANT: Only return the primary outcome, not the internal thread ID details
      outcome: mcpCallOutcome, // Use the processed outcome
    };

    if (taskCreationError) {
      console.log(`[${new Date().toISOString()}] [RRO Response Gen] Task creation error detected.`);
      finalStatus = 500; // Internal Server Error for task creation failure
      responseBody.error = `Failed to create task: ${taskCreationError}`;
      delete responseBody.outcome; // Don't include outcome if there was an error
    } else if (mcpCallError) {
      console.log(`[${new Date().toISOString()}] [RRO Response Gen] MCP call error detected.`);
      // If an MCP-style call resulted in an error
      finalStatus = determinedAction.startsWith('Unknown intent') || determinedAction.startsWith('Error: Invalid parameters') || determinedAction.startsWith('Invalid request body') || determinedAction.startsWith('Error: Tool not found') ? 400 : 500; // Use 400 for client errors, 500 otherwise
      responseBody.error = `Request processing failed: ${mcpCallError}`; // More generic error message
      delete responseBody.outcome; // Don't include outcome if there was an error
    } else if (taskId) {
      console.log(`[${new Date().toISOString()}] [RRO Response Gen] Task ID detected.`);
      // If a task was created successfully, ensure outcome reflects this if not already set
      if (responseBody.outcome === null || typeof responseBody.outcome !== 'object' || !responseBody.outcome.taskId) {
         responseBody.outcome = { taskId: taskId };
      }
      // Status remains 200 (or maybe 202 Accepted if preferred for async tasks)
    } else if (mcpCallOutcome !== null) { // Check if outcome has been set from a direct call
      console.log(`[${new Date().toISOString()}] [RRO Response Gen] MCP call outcome detected.`);
      // Outcome is already set in responseBody initialization
      // Status remains 200
    } else {
       // If no specific outcome, error, or task ID, it might indicate an unexpected path
       console.log(`[${new Date().toISOString()}] [RRO Response Gen] No specific outcome, error, or task ID detected.`);
       // Check if determinedAction indicates success or a handled state
       if (!determinedAction.toLowerCase().includes('success') && !determinedAction.toLowerCase().includes('task created') && !determinedAction.toLowerCase().includes('processed \'approve script\'')) {
          // If no positive action was determined and no error was explicitly set,
          // it might be an unhandled case or a logic path that didn't set an outcome.
          console.warn(`[${new Date().toISOString()}] [RRO Response Gen Warn] Request completed without explicit success outcome or error. Action: ${determinedAction}`);
          // Optionally set a default error or adjust status if this state is unexpected.
          // For now, let it return 200 with the determinedAction and null outcome.
          if (responseBody.outcome === null) {
             // Set outcome to null explicitly if it wasn't set
             responseBody.outcome = null;
          }
       } else {
           console.log(`[${new Date().toISOString()}] [RRO Response Gen] Action determined seems successful or handled, proceeding with 200.`);
       }
    }


    const duration = Date.now() - requestStartTime;
    console.log(`[${new Date().toISOString()}] [RRO Request End] Sending Response (Status ${finalStatus}, Duration: ${duration}ms):`, JSON.stringify(responseBody));
    return new Response(JSON.stringify(responseBody), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: finalStatus,
    });

  } catch (error) {
    // Catch any unexpected errors during request processing
    const duration = Date.now() - requestStartTime;
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    console.error(`[${new Date().toISOString()}] [RRO FATAL Error] Unexpected error in RRO serve function (Duration: ${duration}ms):`, error);
    // Log stack trace if available
    if (error instanceof Error && error.stack) {
        console.error(`[${new Date().toISOString()}] [RRO FATAL Stack Trace]:`, error.stack);
    }
    return new Response(JSON.stringify({ error: 'Internal Server Error', detail: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});