
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CaptureWebsiteResponse } from "./types";

export function useScreenshot(
  currentUrl: string | null,
  setScreenshot: (screenshot: string | null) => void,
  setError: (error: string | null) => void
) {
  const captureScreenshot = useCallback(async (): Promise<string | null> => {
    if (!currentUrl) {
      setError("No URL to capture screenshot from");
      return null;
    }
    
    try {
      setError(null);
      
      const { data, error } = await supabase.functions.invoke('capture-website', {
        body: { url: currentUrl }
      });
      
      if (error) {
        console.error("Error invoking capture-website function:", error);
        setError(`Failed to capture screenshot: ${error.message}`);
        return null;
      }
      
      const response = data as CaptureWebsiteResponse;
      
      if (response.error) {
        console.error("Screenshot capture error:", response.error);
        setError(`Screenshot error: ${response.error}`);
        return null;
      }
      
      // Handle both image_url (from API) and screenshot (for backwards compatibility)
      if (response.image_url) {
        setScreenshot(response.image_url);
        return response.image_url;
      } else if (response.screenshot) {
        setScreenshot(response.screenshot);
        return response.screenshot;
      } else {
        setError("No screenshot URL returned");
        return null;
      }
    } catch (error) {
      console.error("Error capturing screenshot:", error);
      setError(error instanceof Error ? error.message : "Unknown error capturing screenshot");
      return null;
    }
  }, [currentUrl, setScreenshot, setError]);
  
  return { captureScreenshot };
}
