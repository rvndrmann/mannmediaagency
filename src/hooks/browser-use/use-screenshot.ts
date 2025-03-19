
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CaptureWebsiteResponse } from "./types";

export function useScreenshot(
  currentUrl: string | null,
  setScreenshot: (screenshot: string | null) => void,
  setError: (error: string | null) => void
) {
  const captureScreenshot = useCallback(async () => {
    if (!currentUrl) {
      setError("No URL to capture screenshot from");
      return;
    }
    
    try {
      setError(null);
      
      const { data, error } = await supabase.functions.invoke('capture-website', {
        body: { url: currentUrl }
      });
      
      if (error) {
        console.error("Error invoking capture-website function:", error);
        setError(`Failed to capture screenshot: ${error.message}`);
        return;
      }
      
      const response = data as CaptureWebsiteResponse;
      
      if (response.error) {
        console.error("Screenshot capture error:", response.error);
        setError(`Screenshot error: ${response.error}`);
        return;
      }
      
      if (response.imageUrl) {
        setScreenshot(response.imageUrl);
      } else {
        setError("No screenshot URL returned");
      }
    } catch (error) {
      console.error("Error capturing screenshot:", error);
      setError(error instanceof Error ? error.message : "Unknown error capturing screenshot");
    }
  }, [currentUrl, setScreenshot, setError]);
  
  return { captureScreenshot };
}
