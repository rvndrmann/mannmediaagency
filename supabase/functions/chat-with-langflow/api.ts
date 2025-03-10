
import { checkCache, cacheResponse } from "./cache.ts";
import { API_TIMEOUT_MS, MAX_RETRIES, RETRY_DELAY_MS } from "./config.ts";
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
      
      // Create a manually controlled timeout
      const fetchPromise = fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), API_TIMEOUT_MS)
      );
      
      // Race the fetch against the timeout
      const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;
      
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
      
      if (error.name === 'AbortError' || error.message.includes('timeout')) {
        console.error(`[${requestId}] Request timed out on attempt ${attempt + 1}`);
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
