
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CaptureWebsiteResponse } from "./types";

export function useScreenshot(
  currentUrl: string | null,
  setScreenshot: (screenshot: string | null) => void,
  setError: (error: string | null) => void
) {
  const captureScreenshot = useCallback(async () => {
    if (!currentUrl) return false;
    
    try {
      const { data, error } = await supabase.functions.invoke('capture-website', {
        body: { 
          url: currentUrl,
          save_browser_data: true 
        }
      });
      
      if (error) {
        console.error("Function error", error);
        return false;
      }
      
      const response = data as CaptureWebsiteResponse;
      
      if (response.error) {
        console.error("Screenshot error:", response.error);
        return false;
      }
      
      if (response.image_url) {
        setScreenshot(response.image_url);
        return true;
      }
      
      return false;
    } catch (err: any) {
      console.error("Error capturing screenshot:", err);
      setError(err.message || "Failed to capture screenshot");
      return false;
    }
  }, [currentUrl, setScreenshot, setError]);

  return { captureScreenshot };
}
