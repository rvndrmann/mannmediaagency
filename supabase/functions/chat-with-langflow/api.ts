
import { checkCache, cacheResponse } from "./cache.ts";
import { API_TIMEOUT_MS, MAX_RETRIES, RETRY_DELAY_MS, OPENAI_API_KEY, ASSISTANT_ID, USE_ASSISTANTS_API, MCP_SERVER_URL, MCP_SERVER_TOKEN, USE_MCP } from "./config.ts";
import { isOpenAIQuotaError } from "./utils.ts";

export async function makeAstraLangflowRequest(
  url: string, 
  headers: Record<string, string>, 
  payload: any, 
  requestId: string,
  retries = MAX_RETRIES
): Promise<any> {
  let lastError;
  
  // Create cache key from payload
  const cacheKey = JSON.stringify(payload);
  const cachedResponse = checkCache(cacheKey);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      const backoffMs = Math.min(RETRY_DELAY_MS * (2 ** attempt), 15000); // Exponential backoff capped at 15 seconds
      console.log(`[${requestId}] Retry attempt ${attempt}/${retries} after ${backoffMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
    
    try {
      console.log(`[${requestId}] API request attempt ${attempt + 1}/${retries + 1}`);
      
      // Create an abort controller for the timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
      
      // Make the request with the abort signal
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      
      // Clear the timeout
      clearTimeout(timeoutId);
      
      console.log(`[${requestId}] Got response with status ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[${requestId}] API Error (${response.status}):`, errorText.substring(0, 500));
        
        // Check if it's an OpenAI quota error
        if (isOpenAIQuotaError(errorText)) {
          throw new Error(`OpenAI quota exceeded: ${errorText.substring(0, 200)}`);
        }
        
        throw new Error(`API error: ${response.status} - ${errorText.substring(0, 200)}`);
      }
      
      const data = await response.json();
      console.log(`[${requestId}] API response received successfully`);
      
      // Cache successful response
      cacheResponse(cacheKey, data);
      
      return data;
    } catch (error) {
      lastError = error;
      
      // Don't retry if it's a quota error
      if (isOpenAIQuotaError(error)) {
        console.error(`[${requestId}] OpenAI quota exceeded, not retrying`);
        throw error;
      }
      
      if (error.name === 'AbortError' || error.message.includes('timeout') || error.message.includes('abort')) {
        console.error(`[${requestId}] Request timed out or aborted on attempt ${attempt + 1}`);
        // Continue to next retry
      } else {
        console.error(`[${requestId}] API request attempt ${attempt + 1} failed:`, error.message);
      }
      
      if (attempt === retries) {
        console.error(`[${requestId}] All retry attempts exhausted`);
        throw new Error(`Request failed after ${retries} retry attempts: ${error.message}`);
      }
    }
  }
  
  throw lastError;
}

export async function makeOpenAIAssistantRequest(
  message: string,
  requestId: string,
  retries = MAX_RETRIES
): Promise<any> {
  console.log(`[${requestId}] Using OpenAI Assistant API with Assistant ID: ${ASSISTANT_ID}`);
  
  if (!OPENAI_API_KEY || !ASSISTANT_ID) {
    throw new Error("OpenAI API key or Assistant ID not configured");
  }
  
  // Create cache key
  const cacheKey = `assistant-${ASSISTANT_ID}-${message}`;
  const cachedResponse = checkCache(cacheKey);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      const backoffMs = Math.min(RETRY_DELAY_MS * (2 ** attempt), 15000);
      console.log(`[${requestId}] Assistant API retry attempt ${attempt}/${retries} after ${backoffMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
    
    try {
      // 1. Create a thread
      const threadResponse = await fetch('https://api.openai.com/v1/threads', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v1'
        },
        body: JSON.stringify({})
      });
      
      if (!threadResponse.ok) {
        const errorText = await threadResponse.text();
        throw new Error(`Failed to create thread: ${errorText.substring(0, 200)}`);
      }
      
      const thread = await threadResponse.json();
      const threadId = thread.id;
      console.log(`[${requestId}] Created thread with ID: ${threadId}`);
      
      // 2. Add a message to the thread
      const messageResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v1'
        },
        body: JSON.stringify({
          role: 'user',
          content: message
        })
      });
      
      if (!messageResponse.ok) {
        const errorText = await messageResponse.text();
        throw new Error(`Failed to add message to thread: ${errorText.substring(0, 200)}`);
      }
      
      console.log(`[${requestId}] Added message to thread`);
      
      // 3. Run the assistant
      const runResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v1'
        },
        body: JSON.stringify({
          assistant_id: ASSISTANT_ID
        })
      });
      
      if (!runResponse.ok) {
        const errorText = await runResponse.text();
        throw new Error(`Failed to run assistant: ${errorText.substring(0, 200)}`);
      }
      
      const run = await runResponse.json();
      const runId = run.id;
      console.log(`[${requestId}] Started run with ID: ${runId}`);
      
      // 4. Poll for the run completion
      let runStatus = run.status;
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes with 5-second intervals
      
      while (runStatus !== 'completed' && runStatus !== 'failed' && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds between polls
        
        const runCheckResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
            'OpenAI-Beta': 'assistants=v1'
          }
        });
        
        if (!runCheckResponse.ok) {
          const errorText = await runCheckResponse.text();
          throw new Error(`Failed to check run status: ${errorText.substring(0, 200)}`);
        }
        
        const runCheck = await runCheckResponse.json();
        runStatus = runCheck.status;
        attempts++;
        
        console.log(`[${requestId}] Run status: ${runStatus}, poll attempt: ${attempts}`);
      }
      
      if (runStatus !== 'completed') {
        throw new Error(`Run did not complete successfully. Final status: ${runStatus}`);
      }
      
      // 5. Get the assistant's messages
      const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v1'
        }
      });
      
      if (!messagesResponse.ok) {
        const errorText = await messagesResponse.text();
        throw new Error(`Failed to retrieve messages: ${errorText.substring(0, 200)}`);
      }
      
      const messages = await messagesResponse.json();
      
      // Get the assistant's response message (the most recent one from the assistant)
      const assistantMessages = messages.data.filter((msg: any) => msg.role === 'assistant');
      
      if (assistantMessages.length === 0) {
        throw new Error('No assistant response found in the thread');
      }
      
      const assistantMessage = assistantMessages[0];
      const responseText = assistantMessage.content[0].text.value;
      
      console.log(`[${requestId}] Received assistant response`);
      
      // Format the response to match Langflow format
      const formattedResponse = {
        outputs: [
          {
            outputs: [
              {
                results: {
                  message: responseText
                }
              }
            ]
          }
        ]
      };
      
      // Cache successful response
      cacheResponse(cacheKey, formattedResponse);
      
      return formattedResponse;
    } catch (error) {
      console.error(`[${requestId}] OpenAI Assistant API attempt ${attempt + 1} failed:`, error);
      
      if (isOpenAIQuotaError(error)) {
        throw error;
      }
      
      if (attempt === retries) {
        throw new Error(`OpenAI Assistant request failed after ${retries} retry attempts: ${error.message}`);
      }
    }
  }
  
  throw new Error("Unexpected error in makeOpenAIAssistantRequest");
}

export async function makeMCPRequest(
  message: string,
  requestId: string,
  retries = MAX_RETRIES
): Promise<any> {
  console.log(`[${requestId}] Using Model Context Protocol with server: ${MCP_SERVER_URL}`);
  
  if (!MCP_SERVER_URL) {
    throw new Error("MCP server URL not configured");
  }
  
  // Create cache key
  const cacheKey = `mcp-${message}`;
  const cachedResponse = checkCache(cacheKey);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  
  if (MCP_SERVER_TOKEN) {
    headers['Authorization'] = `Bearer ${MCP_SERVER_TOKEN}`;
  }
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      const backoffMs = Math.min(RETRY_DELAY_MS * (2 ** attempt), 15000);
      console.log(`[${requestId}] MCP retry attempt ${attempt}/${retries} after ${backoffMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
    
    try {
      console.log(`[${requestId}] Making MCP request attempt ${attempt + 1}`);
      
      // Create an abort controller for the timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
      
      // Create MCP context request payload
      const payload = {
        query: message,
        include_citations: true,
        target_audience: "expert",
        response_tokens: 2000,
        enable_image_generation: true,
        enable_video_generation: true
      };
      
      // Make the request with the abort signal
      const response = await fetch(`${MCP_SERVER_URL}/query`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      
      // Clear the timeout
      clearTimeout(timeoutId);
      
      console.log(`[${requestId}] MCP response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[${requestId}] MCP Error (${response.status}):`, errorText.substring(0, 500));
        throw new Error(`MCP API error: ${response.status} - ${errorText.substring(0, 200)}`);
      }
      
      const mcpResponse = await response.json();
      
      // Format the response to match Langflow format
      const formattedResponse = {
        outputs: [
          {
            outputs: [
              {
                results: {
                  message: mcpResponse.response,
                  command: mcpResponse.generated_media ? {
                    type: mcpResponse.generated_media.type,
                    url: mcpResponse.generated_media.url
                  } : null
                }
              }
            ]
          }
        ]
      };
      
      // Cache successful response
      cacheResponse(cacheKey, formattedResponse);
      
      return formattedResponse;
    } catch (error) {
      console.error(`[${requestId}] MCP request attempt ${attempt + 1} failed:`, error);
      
      if (error.name === 'AbortError' || error.message.includes('timeout') || error.message.includes('abort')) {
        console.error(`[${requestId}] MCP request timed out or aborted on attempt ${attempt + 1}`);
      }
      
      if (attempt === retries) {
        throw new Error(`MCP request failed after ${retries} retry attempts: ${error.message}`);
      }
    }
  }
  
  throw new Error("Unexpected error in makeMCPRequest");
}
