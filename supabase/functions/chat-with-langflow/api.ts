
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
      const backoffMs = Math.min(RETRY_DELAY_MS * (2 ** attempt), 10000); // Exponential backoff capped at 10 seconds
      console.log(`[${requestId}] Retry attempt ${attempt}/${retries} after ${backoffMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
    
    try {
      console.log(`[${requestId}] API request attempt ${attempt + 1}/${retries + 1}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log(`[${requestId}] Request timeout after ${API_TIMEOUT_MS}ms - aborting`);
        controller.abort();
      }, API_TIMEOUT_MS);
      
      try {
        console.log(`[${requestId}] Making request to: ${url}`);
        
        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
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
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (error) {
      lastError = error;
      
      // Don't retry if it's a quota error
      if (isOpenAIQuotaError(error)) {
        console.error(`[${requestId}] OpenAI quota exceeded, not retrying`);
        throw error;
      }
      
      if (error.name === 'AbortError' && attempt === retries) {
        console.error(`[${requestId}] Final attempt timed out`);
        throw new Error('Request timed out after multiple attempts');
      }
      
      console.error(`[${requestId}] API request attempt ${attempt + 1} failed:`, error.message);
      
      if (attempt === retries) {
        throw error;
      }
    }
  }
  
  throw lastError;
}
