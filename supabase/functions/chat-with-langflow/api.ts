
import { API_TIMEOUT_MS, MAX_RETRIES, RETRY_DELAY_MS, OPENAI_API_KEY, ASSISTANT_ID, MCP_SERVER_URL, MCP_SERVER_TOKEN } from "./config.ts";
import { MCPQueryPayload, MCPResponse } from "./types.ts";

// Helper function for retry logic with exponential backoff
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number,
  requestId: string,
  retryDelay: number = RETRY_DELAY_MS
): Promise<any> {
  let retries = 0;
  let lastError;

  while (retries < maxRetries) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
      
      // Create a race between the fetch request and the timeout
      const response = await Promise.race([
        fetch(url, { ...options, signal: controller.signal }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), API_TIMEOUT_MS)
        )
      ]);
      
      clearTimeout(timeoutId);
      
      // Check for 429 error (rate limit)
      if (response.status === 429) {
        console.warn(`[${requestId}] API rate limit hit, attempt ${retries + 1}/${maxRetries}`);
        const delay = retryDelay * Math.pow(2, retries);  // Exponential backoff
        await new Promise(r => setTimeout(r, delay));
        retries++;
        continue;
      }
      
      // For all other responses, try to parse them
      const data = await response.json();
      
      // Check for quota exceeded error within the response
      if (typeof data === 'object' && 
         (JSON.stringify(data).includes('insufficient_quota') || 
          JSON.stringify(data).includes('exceeded your current quota'))) {
        throw new Error('OpenAI quota exceeded: ' + JSON.stringify(data));
      }
      
      return data;
    } catch (error) {
      console.error(`[${requestId}] API request attempt ${retries + 1} failed:`, error);
      lastError = error;
      
      // Don't retry if it's a quota exceeded error
      if (error.message?.includes('quota')) {
        throw error;
      }
      
      const delay = retryDelay * Math.pow(2, retries);  // Exponential backoff
      await new Promise(r => setTimeout(r, delay));
      retries++;
    }
  }
  
  throw lastError || new Error(`Maximum retries (${maxRetries}) exceeded`);
}

// Main function to make request to Astra Langflow
export async function makeAstraLangflowRequest(
  url: string, 
  headers: Record<string, string>, 
  payload: any, 
  requestId: string
): Promise<any> {
  console.log(`[${requestId}] Making request to Astra Langflow: ${url}`);
  
  return await fetchWithRetry(
    url,
    {
      method: "POST",
      headers: headers,
      body: JSON.stringify(payload)
    },
    MAX_RETRIES,
    requestId
  );
}

// Function to make request to OpenAI Assistants API
export async function makeOpenAIAssistantRequest(
  messageContent: string,
  requestId: string
): Promise<any> {
  if (!OPENAI_API_KEY || !ASSISTANT_ID) {
    throw new Error("OpenAI API key or Assistant ID not configured");
  }
  
  console.log(`[${requestId}] Making request to OpenAI Assistants API`);
  
  try {
    // Create a thread
    const threadResponse = await fetchWithRetry(
      "https://api.openai.com/v1/threads",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "OpenAI-Beta": "assistants=v1"
        },
        body: JSON.stringify({})
      },
      MAX_RETRIES,
      requestId
    );
    
    const threadId = threadResponse.id;
    console.log(`[${requestId}] Created thread: ${threadId}`);
    
    // Add a message to the thread
    await fetchWithRetry(
      `https://api.openai.com/v1/threads/${threadId}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "OpenAI-Beta": "assistants=v1"
        },
        body: JSON.stringify({
          role: "user",
          content: messageContent
        })
      },
      MAX_RETRIES,
      requestId
    );
    
    console.log(`[${requestId}] Added message to thread`);
    
    // Run the assistant on the thread
    const runResponse = await fetchWithRetry(
      `https://api.openai.com/v1/threads/${threadId}/runs`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "OpenAI-Beta": "assistants=v1"
        },
        body: JSON.stringify({
          assistant_id: ASSISTANT_ID
        })
      },
      MAX_RETRIES,
      requestId
    );
    
    const runId = runResponse.id;
    console.log(`[${requestId}] Started run: ${runId}`);
    
    // Poll for run completion
    let runStatus = runResponse.status;
    let pollCount = 0;
    const maxPolls = 30; // Maximum number of polling attempts
    
    while (runStatus !== "completed" && runStatus !== "failed" && pollCount < maxPolls) {
      // Exponential backoff for polling
      await new Promise(r => setTimeout(r, 1000 * Math.min(2 ** pollCount, 10)));
      
      const runStatusResponse = await fetchWithRetry(
        `https://api.openai.com/v1/threads/${threadId}/runs/${runId}`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${OPENAI_API_KEY}`,
            "OpenAI-Beta": "assistants=v1"
          }
        },
        MAX_RETRIES,
        requestId
      );
      
      runStatus = runStatusResponse.status;
      console.log(`[${requestId}] Run status: ${runStatus}, poll: ${pollCount + 1}`);
      pollCount++;
    }
    
    if (runStatus !== "completed") {
      throw new Error(`Run did not complete successfully. Status: ${runStatus}`);
    }
    
    // Get the messages from the thread
    const messagesResponse = await fetchWithRetry(
      `https://api.openai.com/v1/threads/${threadId}/messages`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "OpenAI-Beta": "assistants=v1"
        }
      },
      MAX_RETRIES,
      requestId
    );
    
    // Extract the assistant's response
    const assistantMessages = messagesResponse.data.filter((msg: any) => msg.role === "assistant");
    
    if (assistantMessages.length === 0) {
      throw new Error("No assistant messages found in the thread");
    }
    
    const latestMessage = assistantMessages[0];
    
    // Format response to match expected structure
    return {
      outputs: [
        {
          outputs: [
            {
              results: {
                message: latestMessage.content[0].text.value,
                command: null // We could parse commands from the content if needed
              }
            }
          ]
        }
      ]
    };
  } catch (error) {
    console.error(`[${requestId}] Error in OpenAI Assistants API request:`, error);
    throw error;
  }
}

// Function to make request to MCP server
export async function makeMCPRequest(
  messageContent: string,
  requestId: string
): Promise<any> {
  if (!MCP_SERVER_URL || !MCP_SERVER_TOKEN) {
    throw new Error("MCP Server URL or token not configured");
  }
  
  console.log(`[${requestId}] Making request to MCP Server: ${MCP_SERVER_URL}`);
  
  // Extract potential tool references from the message
  const toolPattern = /(product shot|image to video|product-shot v[12]|image-to-video)/i;
  const toolMatch = messageContent.match(toolPattern);
  const toolMentioned = toolMatch ? toolMatch[0].toLowerCase() : null;
  
  // Prepare specialized payload based on detected tool
  const payload: MCPQueryPayload = {
    query: messageContent,
    include_citations: true,
    target_audience: "intermediate",
    response_tokens: 1000,
    enable_image_generation: true,
    enable_video_generation: true,
    available_tools: [
      {
        tool_name: "product-shot-v1",
        description: "Generate product images using the Product Shot V1 tool",
        required_parameters: ["prompt", "imageSize"]
      },
      {
        tool_name: "product-shot-v2",
        description: "Generate enhanced product images using the Product Shot V2 tool",
        required_parameters: ["prompt"]
      },
      {
        tool_name: "image-to-video",
        description: "Convert images to videos with animation effects",
        required_parameters: ["prompt", "sourceImageUrl", "aspectRatio"]
      }
    ]
  };
  
  if (toolMentioned) {
    console.log(`[${requestId}] Tool detected in message: ${toolMentioned}`);
    
    if (toolMentioned.includes("product shot") || toolMentioned.includes("product-shot")) {
      // Determine which product shot version
      const isV2 = toolMentioned.includes("v2") || toolMentioned.includes("2");
      payload.suggested_tool = isV2 ? "product-shot-v2" : "product-shot-v1";
    } else if (toolMentioned.includes("image to video") || toolMentioned.includes("image-to-video")) {
      payload.suggested_tool = "image-to-video";
    }
  }
  
  try {
    const response = await fetchWithRetry(
      `${MCP_SERVER_URL}/api/query`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${MCP_SERVER_TOKEN}`
        },
        body: JSON.stringify(payload)
      },
      MAX_RETRIES,
      requestId
    );
    
    const mcpResponse = response as MCPResponse;
    
    // Process the response for any tool selection or media generation commands
    let command = null;
    
    // Check for tool selection
    if (mcpResponse.selected_tool) {
      console.log(`[${requestId}] MCP selected tool: ${mcpResponse.selected_tool}`);
      
      const toolParams = mcpResponse.tool_parameters || {};
      
      command = {
        feature: mcpResponse.selected_tool,
        action: "create",
        parameters: {
          ...toolParams,
          prompt: toolParams.prompt || messageContent
        },
        confidence: mcpResponse.tool_selection_confidence || 0.8
      };
    } 
    // Check for media generation as fallback
    else if (mcpResponse.generated_media) {
      command = {
        type: mcpResponse.generated_media.type,
        url: mcpResponse.generated_media.url,
        prompt: mcpResponse.generated_media.prompt
      };
    }
    
    // Format response to match expected structure
    return {
      outputs: [
        {
          outputs: [
            {
              results: {
                message: mcpResponse.response,
                command: command
              }
            }
          ]
        }
      ]
    };
  } catch (error) {
    console.error(`[${requestId}] Error in MCP Server request:`, error);
    throw error;
  }
}
