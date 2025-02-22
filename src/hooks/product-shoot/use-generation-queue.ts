
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

const POLLING_INTERVAL = 2000;
const MAX_RETRIES = 30;

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
          console.log(`Checking status for request: ${item.requestId}`);
          const response = await supabase.functions.invoke<GenerationResult>(
            'check-generation-status',
            {
              body: { requestId: item.requestId }
            }
          );

          if (response.error) {
            console.error('Status check error:', response.error);
            throw new Error(response.error.message);
          }
          
          if (response.data) {
            console.log('Status check response:', response.data);
            
            const completedImages = response.data.images?.map(img => ({
              ...img,
              id: `${item.requestId}-${crypto.randomUUID()}`,
              status: 'completed' as const,
              prompt: item.prompt
            })) || [];
            
            const imageIndex = newGeneratedImages.findIndex(
              img => img.id === `temp-${item.requestId}`
            );
            
            if (imageIndex !== -1) {
              if (completedImages.length > 0) {
                newGeneratedImages[imageIndex] = completedImages[0];
                await updateImageJobStatus(item.requestId, 'completed', completedImages[0].url);
              }
            } else if (completedImages.length > 0) {
              newGeneratedImages.push(...completedImages);
              await updateImageJobStatus(item.requestId, 'completed', completedImages[0].url);
            }

            if (response.data.status === 'completed' || response.data.status === 'failed') {
              updatedQueue.splice(i, 1);
              queueChanged = true;
              i--;
              
              if (response.data.status === 'completed' && completedImages.length > 0) {
                try {
                  await saveToHistory(completedImages[0], item.sourceUrl, item.settings);
                  console.log('Successfully saved to history:', completedImages[0]);
                } catch (saveError) {
                  console.error('Error saving to history:', saveError);
                  toast.error("Failed to save generation history");
                }
              } else if (response.data.status === 'failed') {
                console.error('Generation failed:', response.data.error);
                await updateImageJobStatus(item.requestId, 'failed');
                toast.error(response.data.error || "Generation failed. Please try again.");
              }
            } else if (item.retries >= MAX_RETRIES) {
              const imageIndex = newGeneratedImages.findIndex(
                img => img.id === `temp-${item.requestId}`
              );
              
              if (imageIndex !== -1) {
                newGeneratedImages[imageIndex] = {
                  ...newGeneratedImages[imageIndex],
                  status: 'failed'
                };
              }

              await updateImageJobStatus(item.requestId, 'failed');
              updatedQueue.splice(i, 1);
              queueChanged = true;
              i--;
              toast.error("Generation timed out. Please try again.");
            } else {
              updatedQueue[i] = {
                ...item,
                retries: item.retries + 1
              };
              queueChanged = true;
            }
          }
        } catch (error) {
          console.error('Polling error:', error);
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
