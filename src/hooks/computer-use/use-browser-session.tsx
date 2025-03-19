
import { useState, useCallback, useRef, useEffect } from "react";

export const useBrowserSession = () => {
  const [externalWindowOpened, setExternalWindowOpened] = useState(false);
  
  // Track recently opened URLs to prevent duplicate tabs
  const recentlyOpenedUrls = useRef<Set<string>>(new Set());
  const lastOpenedUrl = useRef<string | null>(null);
  
  // Clean up recently opened URLs after a delay
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      recentlyOpenedUrls.current.clear();
    }, 5000); // Clear cache every 5 seconds
    
    return () => clearInterval(cleanupInterval);
  }, []);
  
  const hasRecentlyOpened = useCallback((url: string): boolean => {
    return recentlyOpenedUrls.current.has(url);
  }, []);
  
  const markAsOpened = useCallback((url: string): void => {
    recentlyOpenedUrls.current.add(url);
    lastOpenedUrl.current = url;
  }, []);
  
  const getLastOpenedUrl = useCallback((): string | null => {
    return lastOpenedUrl.current;
  }, []);
  
  return {
    externalWindowOpened,
    setExternalWindowOpened,
    hasRecentlyOpened,
    markAsOpened,
    getLastOpenedUrl
  };
};
