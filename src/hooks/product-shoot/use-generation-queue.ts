
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ProductShootSettings } from '@/types/product-shoot';

// Define the minimum GenerationResult interface needed
interface GenerationResult {
  id: string;
  status: "completed" | "failed" | "processing" | "pending";
  resultUrl?: string;
  message?: string;
  error?: string;
}

export function useGenerationQueue() {
  const [activeQueue, setActiveQueue] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, GenerationResult>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Adds an image to the generation queue
  const addToQueue = async (
    sourceImageUrl: string,
    prompt: string,
    settings: Partial<ProductShootSettings>
  ): Promise<string | null> => {
    try {
      setIsLoading(true);
      
      // Insert a new record in the product_shot_history table
      const { data, error } = await supabase
        .from('product_shot_history')
        .insert({
          source_image_url: sourceImageUrl,
          result_url: '', // Will be updated later
          prompt: prompt,
          settings: settings || {},
          visibility: 'private',
        })
        .select()
        .single();
        
      if (error) {
        console.error("Error adding to generation queue:", error);
        return null;
      }
      
      // Update the active queue
      const imageId = data.id;
      setActiveQueue(prev => ({
        ...prev,
        [imageId]: true
      }));
      
      // Initialize the result with pending status
      setResults(prev => ({
        ...prev,
        [imageId]: {
          id: imageId,
          status: "pending" // Compatible with GenerationStatus
        }
      }));
      
      // Call the edge function to generate the image
      const { data: processData, error: processError } = await supabase.functions.invoke(
        'generate-product-shot-v2',
        {
          body: {
            id: imageId,
            sourceImageUrl,
            prompt,
            settings
          }
        }
      );
      
      if (processError) {
        console.error("Error processing image:", processError);
        // Update the result with error status
        setResults(prev => ({
          ...prev,
          [imageId]: {
            ...prev[imageId],
            status: "failed",
            error: processError.message
          }
        }));
        return imageId;
      }
      
      // Update the result with processing status
      setResults(prev => ({
        ...prev,
        [imageId]: {
          ...prev[imageId],
          status: "processing"
        }
      }));
      
      return imageId;
    } catch (error) {
      console.error("Error in addToQueue:", error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Check the status of an image in the queue
  const checkStatus = async (imageId: string): Promise<GenerationResult> => {
    try {
      // Get the current status from the database
      const { data, error } = await supabase
        .from('product_shot_history')
        .select('*')
        .eq('id', imageId)
        .single();
        
      if (error) {
        console.error("Error checking image status:", error);
        return {
          id: imageId,
          status: "failed",
          error: error.message
        };
      }
      
      // Update the local state with the latest status
      const status = data.visibility === 'public' ? "completed" : "processing";
      
      const result: GenerationResult = {
        id: imageId,
        status: status,
        resultUrl: data.result_url || undefined
      };
      
      setResults(prev => ({
        ...prev,
        [imageId]: result
      }));
      
      // If the image is complete, remove it from the active queue
      if (status === "completed") {
        setActiveQueue(prev => {
          const newQueue = { ...prev };
          delete newQueue[imageId];
          return newQueue;
        });
      }
      
      return result;
    } catch (error) {
      console.error("Error in checkStatus:", error);
      return {
        id: imageId,
        status: "failed",
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  };

  // Check all active images in the queue
  const checkAllActive = async (): Promise<void> => {
    const activeIds = Object.keys(activeQueue);
    if (activeIds.length === 0) return;
    
    for (const id of activeIds) {
      await checkStatus(id);
    }
  };

  // Effect to poll for status updates
  useEffect(() => {
    const pollInterval = setInterval(() => {
      if (Object.keys(activeQueue).length > 0) {
        checkAllActive();
      }
    }, 3000);
    
    return () => clearInterval(pollInterval);
  }, [activeQueue]);

  return {
    addToQueue,
    checkStatus,
    activeQueue,
    results,
    isLoading
  };
}
