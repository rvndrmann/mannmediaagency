
import { CACHE_TTL_MS } from "./config.ts";

// Response cache to avoid duplicate processing
const responseCache = new Map<string, { data: any; timestamp: number }>();

// Check cache for existing response
export function checkCache(cacheKey: string) {
  if (responseCache.has(cacheKey)) {
    const cachedItem = responseCache.get(cacheKey);
    const now = Date.now();
    
    if (now - cachedItem!.timestamp < CACHE_TTL_MS) {
      console.log(`Cache hit for key: ${cacheKey.substring(0, 20)}...`);
      return cachedItem!.data;
    } else {
      // Expired cache entry
      responseCache.delete(cacheKey);
    }
  }
  return null;
}

// Store response in cache
export function cacheResponse(cacheKey: string, data: any) {
  responseCache.set(cacheKey, {
    data,
    timestamp: Date.now()
  });
  
  // Clean up old cache entries
  const now = Date.now();
  for (const [key, value] of responseCache.entries()) {
    if (now - value.timestamp > CACHE_TTL_MS) {
      responseCache.delete(key);
    }
  }
}
