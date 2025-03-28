
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { GeneratedImage, GenerationResult } from "@/types/product-shoot";
import { saveToHistory } from "./history-service";

interface GenerationQueueItem {
  requestId: string;
  prompt: string;
  retries: number;
  sourceUrl: string;
  settings: any;
}

const POLLING_INTERVAL = 10000; // 10 seconds
const MAX_RETRIES = 12; // 2 minutes total (12 * 10 seconds)

export function useGenerationQueue() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [generationQueue, setGenerationQueue] = useState<GenerationQueueItem[]>([]);

  useEffect(() => {
    if (generationQueue.length === 0) return;

    const pollInterval = setInterval(async () => {
      const updatedQueue = [...generationQueue];
      const newGeneratedImages = [...generatedImages];
      let queueChanged = false;

      for (let i = 0; i < updatedQueue.length; i++) {
        const item = updatedQueue[i];
        
        try {
          console.log(`[Queue] Checking status for request: ${item.requestId}`);
          const response = await supabase.functions.invoke<GenerationResult>(
            'check-generation-status',
            {
              body: { requestId: item.requestId }
            }
          );

          if (response.error) {
            console.error('[Queue] Status check error:', response.error);
            throw new Error(response.error.message);
          }
          
          if (response.data) {
            console.log('[Queue] Status check response:', response.data);
            
            // Find placeholder image index
            const placeholderIndex = newGeneratedImages.findIndex(
              img => img.id === `temp-${item.requestId}`
            );

            if (response.data.status === 'COMPLETED' && response.data.images?.[0]) {
              const completedImage = response.data.images[0];
              
              console.log('[Queue] Generation completed:', completedImage);

              if (placeholderIndex !== -1) {
                // Replace placeholder with completed image
                newGeneratedImages[placeholderIndex] = completedImage;
              } else {
                // Add new completed image
                newGeneratedImages.push(completedImage);
              }
              
              try {
                await saveToHistory(completedImage, item.sourceUrl, item.settings);
                console.log('[Queue] Successfully saved to history:', completedImage);
              } catch (saveError) {
                console.error('[Queue] Error saving to history:', saveError);
                toast.error("Failed to save generation history");
              }

              // Remove from queue
              updatedQueue.splice(i, 1);
              queueChanged = true;
              i--;
              
              toast.success("Image generation complete!");
            } else if (response.data.status === 'FAILED') {
              console.error('[Queue] Generation failed:', response.data.error);
              
              if (placeholderIndex !== -1) {
                // Update placeholder to show failure
                newGeneratedImages[placeholderIndex] = {
                  ...newGeneratedImages[placeholderIndex],
                  status: 'failed'
                };
              }
              
              toast.error(response.data.error || "Generation failed. Please try again.");
              
              // Remove from queue
              updatedQueue.splice(i, 1);
              queueChanged = true;
              i--;
            } else if (item.retries >= MAX_RETRIES) {
              console.log('[Queue] Max retries reached for request:', item.requestId);
              if (placeholderIndex !== -1) {
                // Update placeholder to show failure after max retries
                newGeneratedImages[placeholderIndex] = {
                  ...newGeneratedImages[placeholderIndex],
                  status: 'failed'
                };
              }

              updatedQueue.splice(i, 1);
              queueChanged = true;
              i--;
              toast.error("Generation timed out. Please try again.");
            } else {
              // Update retry count and continue polling
              updatedQueue[i] = {
                ...item,
                retries: item.retries + 1
              };
              queueChanged = true;
              console.log(`[Queue] Still processing, retry ${item.retries + 1}/${MAX_RETRIES}`);
            }
          }
        } catch (error) {
          console.error('[Queue] Polling error:', error);
          // Update retry count but don't remove from queue on network errors
          if (item.retries >= MAX_RETRIES) {
            // If we've hit max retries, mark as failed
            const placeholderIndex = newGeneratedImages.findIndex(
              img => img.id === `temp-${item.requestId}`
            );
            
            if (placeholderIndex !== -1) {
              newGeneratedImages[placeholderIndex] = {
                ...newGeneratedImages[placeholderIndex],
                status: 'failed'
              };
            }
            
            updatedQueue.splice(i, 1);
            i--;
          } else {
            updatedQueue[i] = {
              ...item,
              retries: item.retries + 1
            };
          }
          queueChanged = true;
        }
      }

      if (queueChanged) {
        setGenerationQueue(updatedQueue);
        setGeneratedImages(newGeneratedImages);
      }

      if (updatedQueue.length === 0) {
        setIsGenerating(false);
        clearInterval(pollInterval);
      }
    }, POLLING_INTERVAL);

    return () => clearInterval(pollInterval);
  }, [generationQueue, generatedImages]);

  const addToQueue = (item: Omit<GenerationQueueItem, 'retries'>) => {
    // Create placeholder image
    const placeholderImage: GeneratedImage = {
      id: `temp-${item.requestId}`,
      url: '',
      content_type: 'image/png',
      status: 'processing',
      prompt: item.prompt
    };
    
    console.log('[Queue] Adding to queue:', item);
    console.log('[Queue] Creating placeholder:', placeholderImage);

    setGeneratedImages(prev => [...prev, placeholderImage]);
    setGenerationQueue(prev => [...prev, { ...item, retries: 0 }]);
    setIsGenerating(true);
  };

  // New manual retry function for failed image generations
  const retryCheck = async (imageId: string) => {
    // Find the failed image
    const failedImage = generatedImages.find(img => img.id === imageId && img.status === 'failed');
    
    if (!failedImage) {
      toast.error("Can't retry - image not found or not in failed state");
      return;
    }
    
    // Get the original request ID (removing the 'temp-' prefix if it's a placeholder)
    const requestId = imageId.startsWith('temp-') ? imageId.substring(5) : imageId.split('-')[0];
    
    if (!requestId) {
      toast.error("Unable to retry - could not determine request ID");
      return;
    }
    
    // Mark the image as processing again
    setGeneratedImages(prev => 
      prev.map(img => 
        img.id === imageId
          ? { ...img, status: 'processing' as const }
          : img
      )
    );
    
    try {
      toast.info("Checking image status...");
      
      // Manual check with the API
      const response = await supabase.functions.invoke<GenerationResult>(
        'check-generation-status',
        {
          body: { requestId }
        }
      );
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      if (!response.data) {
        throw new Error("No response received from server");
      }

      // Process the response
      if (response.data.status === 'COMPLETED' && response.data.images?.[0]) {
        const completedImage = response.data.images[0];
        
        // Update the image in state
        setGeneratedImages(prev => 
          prev.map(img => 
            img.id === imageId
              ? completedImage
              : img
          )
        );
        
        toast.success("Successfully retrieved the generated image!");
      } else if (response.data.status === 'IN_QUEUE') {
        // If still processing, add back to queue for continued polling
        const existingQueueItem = generationQueue.find(item => item.requestId === requestId);
        
        if (!existingQueueItem) {
          // Create a new queue item if not already in queue
          setGenerationQueue(prev => [
            ...prev, 
            { 
              requestId, 
              prompt: failedImage.prompt || "", 
              retries: 0,
              sourceUrl: "", // We don't have this info for retries
              settings: {} // We don't have this info for retries
            }
          ]);
          setIsGenerating(true);
          toast.info("Image is still processing. Added back to monitoring queue.");
        } else {
          toast.info("Image is already being monitored.");
        }
      } else {
        // Still failed
        toast.error(response.data.error || "Generation still failed. Please try creating a new image.");
      }
    } catch (error: any) {
      console.error('[Retry] Error:', error);
      
      // Revert back to failed state
      setGeneratedImages(prev => 
        prev.map(img => 
          img.id === imageId
            ? { ...img, status: 'failed' as const }
            : img
        )
      );
      
      toast.error(error.message || "Failed to check image status. Please try again.");
    }
  };

  return {
    isGenerating,
    generatedImages,
    addToQueue,
    setGeneratedImages,
    retryCheck
  };
}
