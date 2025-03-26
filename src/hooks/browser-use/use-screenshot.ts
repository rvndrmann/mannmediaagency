
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CaptureWebsiteResponse } from "./types";

export function useScreenshot() {
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const captureWebsite = useCallback(async (url: string): Promise<CaptureWebsiteResponse> => {
    try {
      setIsCapturing(true);
      setError(null);

      const { data, error } = await supabase.functions.invoke("capture-website", {
        body: { url }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      return data as CaptureWebsiteResponse;
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to capture website");
      console.error("Error capturing website:", error);
      return { error: error instanceof Error ? error.message : "Failed to capture website" };
    } finally {
      setIsCapturing(false);
    }
  }, []);

  const captureScreenshot = useCallback(async (url?: string): Promise<string | null> => {
    if (!url) {
      setError("URL is required for capturing a screenshot");
      return null;
    }

    try {
      setIsCapturing(true);
      
      const response = await captureWebsite(url);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      const screenshotUrl = response.screenshot || response.image_url;
      
      if (!screenshotUrl) {
        throw new Error("No screenshot URL returned");
      }
      
      setScreenshot(screenshotUrl);
      return screenshotUrl;
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to capture screenshot");
      toast.error("Failed to capture screenshot");
      console.error("Error capturing screenshot:", error);
      return null;
    } finally {
      setIsCapturing(false);
    }
  }, [captureWebsite]);

  return {
    screenshot,
    isCapturing,
    error,
    captureScreenshot,
    captureWebsite
  };
}
