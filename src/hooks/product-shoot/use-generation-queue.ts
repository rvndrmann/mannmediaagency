
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

const POLLING_INTERVAL = 15000; // Changed from 2000 to 15000 (15 seconds)
const MAX_RETRIES = 8; // Changed from 30 to 8 to maintain similar total wait time

export function useGenerationQueue() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [generationQueue, setGenerationQueue] = useState<GenerationQueueItem[]>([]);

  const updateImageJobStatus = async (requestId: string, status: string, resultUrl?: string) => {
    try {
      const updateData: any = {
        status: status
      };
      
      if (resultUrl) {
        updateData.result_url = resultUrl;
      }

      const { error } = await supabase
        .from('image_generation_jobs')
        .update(updateData)
        .eq('request_id', requestId);

      if (error) {
        console.error('Error updating image job status:', error);
      }
    } catch (err) {
      console.error('Error in updateImageJobStatus:', err);
    }
  };

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

            if (response.data.status === 'completed' && response.data.images?.[0]) {
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
            } else if (response.data.status === 'failed') {
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
          // Don't remove from queue on error, will retry next interval
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

  return {
    isGenerating,
    generatedImages,
    addToQueue,
    setGeneratedImages
  };
}
