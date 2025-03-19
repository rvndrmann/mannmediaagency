
import { useState, useCallback, useRef, useEffect } from "react";

export const useBrowserSession = () => {
  const [iframeLoading, setIframeLoading] = useState(false);
  const [iframeError, setIframeError] = useState<string | null>(null);
  const [pageTitle, setPageTitle] = useState<string | null>(null);
  const [navigationAttempts, setNavigationAttempts] = useState<number>(0);
  const [externalWindowOpened, setExternalWindowOpened] = useState(false);
  
  // Track recently opened URLs to prevent duplicate tabs
  const recentlyOpenedUrls = useRef<Set<string>>(new Set());
  
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
  }, []);
  
  return {
    iframeLoading,
    setIframeLoading,
    iframeError,
    setIframeError,
    pageTitle,
    setPageTitle,
    navigationAttempts,
    setNavigationAttempts,
    externalWindowOpened,
    setExternalWindowOpened,
    hasRecentlyOpened,
    markAsOpened
  };
};
