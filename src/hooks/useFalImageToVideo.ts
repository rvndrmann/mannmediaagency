import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client"; // Corrected path
import { useToast } from "@/components/ui/use-toast";

// Define the expected response structure from the submit function
interface SubmitResponse {
  request_id?: string;
  error?: string;
  details?: unknown; // Include details for better error diagnosis
}

// Define the expected response structure from the result function
interface ResultResponse {
  status?: "IN_PROGRESS" | "COMPLETED" | "FAILED" | "QUEUED" | "UNKNOWN";
  video_url?: string;
  error?: string;
  details?: unknown; // Include details for better error diagnosis
}

// Optional parameters for the Fal AI API
interface FalImageToVideoOptions {
    duration?: 5 | 10;
    aspect_ratio?: "16:9" | "9:16" | "1:1";
    negative_prompt?: string;
    cfg_scale?: number;
}

const POLLING_INTERVAL_MS = 5000; // Poll every 5 seconds

export function useFalImageToVideo() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [status, setStatus] = useState<ResultResponse["status"] | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const { toast } = useToast();
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Function to clear the polling interval
  const clearPollingInterval = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      console.log("Polling stopped.");
    }
  }, []);

  // Function to submit the job
  const submitJob = useCallback(async (prompt: string, image_url: string, options?: FalImageToVideoOptions) => {
    setIsLoading(true);
    setError(null);
    setRequestId(null);
    setStatus(null);
    setVideoUrl(null);
    clearPollingInterval(); // Clear any previous polling

    console.log("Submitting Fal Image-to-Video job...", { prompt, image_url, options });

    try {
      const { data, error: invokeError } = await supabase.functions.invoke<SubmitResponse>(
        "fal-image-to-video-submit",
        {
          body: { prompt, image_url, ...options },
        }
      );

      if (invokeError) {
        console.error("Error invoking submit function:", invokeError);
        throw new Error(`Failed to submit job: ${invokeError.message}`);
      }

      // Check for errors returned in the function's response body
      if (data?.error) {
          console.error("Error from submit function:", data.error, data.details);
          throw new Error(`Fal AI submission failed: ${data.error}`);
      }

      if (!data?.request_id) {
        console.error("No request_id received from submit function:", data);
        throw new Error("Failed to get request ID from submission response.");
      }

      console.log("Job submitted successfully. Request ID:", data.request_id);
      setRequestId(data.request_id);
      setStatus("QUEUED"); // Initial status after submission
      setIsLoading(false); // Submission is done, polling starts
      toast({ title: "Video Generation Started", description: "Your image-to-video job has been submitted." });

    } catch (err) {
      console.error("Error in submitJob:", err);
      const message = err instanceof Error ? err.message : "An unknown error occurred during submission.";
      setError(message);
      setIsLoading(false);
      toast({ title: "Submission Failed", description: message, variant: "destructive" });
    }
  }, [toast, clearPollingInterval]);

  // Effect to handle polling when requestId changes
  useEffect(() => {
    if (!requestId) {
      clearPollingInterval();
      return;
    }

    const pollForResult = async () => {
      console.log(`Polling for result with request ID: ${requestId}`);
      try {
        const { data, error: invokeError } = await supabase.functions.invoke<ResultResponse>(
          `fal-image-to-video-result/${requestId}` // Pass request_id in the URL path
        );

        if (invokeError) {
          // Handle specific errors like 404 if the function isn't found or ID is invalid early
          console.error("Error invoking result function:", invokeError);
          // Don't necessarily stop polling for all invoke errors, maybe network issues
          // Consider adding retry logic or specific error handling here
          setError(`Polling error: ${invokeError.message}`); // Show polling error
          return; // Keep polling unless it's a fatal error
        }

        // Check for errors returned in the function's response body
        if (data?.error) {
            console.error("Error from result function:", data.error, data.details);
            setError(`Fal AI processing failed: ${data.error}`);
            setStatus("FAILED");
            clearPollingInterval(); // Stop polling on failure
            toast({ title: "Video Generation Failed", description: data.error, variant: "destructive" });
            return;
        }

        console.log("Polling response:", data);
        setStatus(data?.status ?? null);

        if (data?.status === "COMPLETED") {
          console.log("Job completed. Video URL:", data.video_url);
          setVideoUrl(data.video_url ?? null);
          clearPollingInterval(); // Stop polling on completion
          toast({ title: "Video Ready!", description: "Your video has been generated." });
          if (!data.video_url) {
              console.warn("Job completed but no video URL received.");
              setError("Job completed but the video URL is missing.");
          }
        } else if (data?.status === "FAILED") {
          console.error("Job failed as reported by polling status.");
          setError(data.error || "The video generation job failed.");
          clearPollingInterval(); // Stop polling on failure
          toast({ title: "Video Generation Failed", description: data.error || "Unknown reason.", variant: "destructive" });
        } else {
          // Still IN_PROGRESS, QUEUED, or UNKNOWN, continue polling
          console.log(`Job status: ${data?.status}. Continuing poll.`);
        }

      } catch (err) {
        console.error("Error during polling:", err);
        const message = err instanceof Error ? err.message : "An unknown error occurred during polling.";
        setError(message);
        // Decide if polling should stop based on the error type
        // clearPollingInterval(); // Optional: stop polling on any catch
      }
    };

    // Start polling immediately and then set interval
    pollForResult();
    pollingIntervalRef.current = setInterval(pollForResult, POLLING_INTERVAL_MS);
    console.log("Polling started.");

    // Cleanup function to clear interval when component unmounts or requestId changes
    return () => {
      clearPollingInterval();
    };
  }, [requestId, toast, clearPollingInterval]);

  return {
    submitJob,
    isLoading, // Represents submission loading state primarily
    isPolling: !!pollingIntervalRef.current, // Indicates if polling is active
    error,
    requestId,
    status,
    videoUrl,
  };
}