
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GeneratedImage, GenerationStatus } from '@/types/product-shoot';

interface UseGenerationQueueOptions {
  onImageReady?: (imageData: GeneratedImage) => void;
  onError?: (error: string) => void;
  autoCheckInterval?: number;
}

/**
 * Hook to manage generation queue for product shots
 */
export function useGenerationQueue(options: UseGenerationQueueOptions = {}) {
  const [pendingImageIds, setPendingImageIds] = useState<string[]>([]);
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [checkInterval, setCheckInterval] = useState<number>(options.autoCheckInterval || 3000);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Function to check status of pending images
  const checkPendingImages = useCallback(async () => {
    if (pendingImageIds.length === 0 || processingId) return;

    const nextId = pendingImageIds[0];
    setProcessingId(nextId);

    try {
      // Get the image info from database
      const { data, error } = await supabase
        .from('product_shot_history')
        .select('*')
        .eq('id', nextId)
        .single();

      if (error) {
        console.error("Error checking image status:", error);
        // Remove from queue if there's an error
        setPendingImageIds(prev => prev.filter(id => id !== nextId));
        setProcessingId(null);
        return;
      }

      // Check if image is complete
      if (data) {
        // Convert database status to GenerationStatus
        let status: GenerationStatus;
        if (data.status === 'in_queue') {
          status = 'processing'; // Map in_queue to processing
        } else if (data.status === 'completed' || data.status === 'failed') {
          status = data.status as 'completed' | 'failed';
        } else {
          status = 'pending';
        }

        // If image is complete, notify and remove from queue
        if (status === 'completed' || status === 'failed') {
          // Convert to GeneratedImage format
          const generatedImage: GeneratedImage = {
            id: data.id,
            prompt: data.scene_description || '',
            status,
            createdAt: data.created_at,
            resultUrl: data.result_url,
            inputUrl: data.source_image_url,
            url: data.result_url,
            source_image_url: data.source_image_url,
            settings: typeof data.settings === 'string' 
              ? JSON.parse(data.settings) 
              : (data.settings as Record<string, any>)
          };

          if (status === 'completed' && options.onImageReady) {
            options.onImageReady(generatedImage);
          } else if (status === 'failed' && options.onError) {
            options.onError(`Image generation failed: ${nextId}`);
          }

          // Remove from queue
          setPendingImageIds(prev => prev.filter(id => id !== nextId));
        }
      }
    } catch (error) {
      console.error('Error checking pending images:', error);
    } finally {
      setProcessingId(null);
    }
  }, [pendingImageIds, processingId, options]);

  // Set up polling
  useEffect(() => {
    let timerId: NodeJS.Timeout | undefined;

    if (pendingImageIds.length > 0 && !processingId) {
      setIsPolling(true);
      timerId = setInterval(checkPendingImages, checkInterval);
    } else if (pendingImageIds.length === 0) {
      setIsPolling(false);
      if (timerId) clearInterval(timerId);
    }

    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [pendingImageIds, processingId, checkPendingImages, checkInterval]);

  // Add an image to the queue
  const addToQueue = useCallback((imageId: string) => {
    setPendingImageIds(prev => [...prev, imageId]);
  }, []);

  // Clear all pending images
  const clearQueue = useCallback(() => {
    setPendingImageIds([]);
  }, []);

  // Check a specific image status
  const checkImageStatus = useCallback(async (imageId: string): Promise<GeneratedImage | null> => {
    try {
      const { data, error } = await supabase
        .from('product_shot_history')
        .select('*')
        .eq('id', imageId)
        .single();

      if (error) {
        console.error("Error checking image status:", error);
        return null;
      }

      if (data) {
        // Convert database status to GenerationStatus
        let status: GenerationStatus;
        if (data.status === 'in_queue') {
          status = 'processing'; // Map in_queue to processing
        } else if (data.status === 'completed' || data.status === 'failed') {
          status = data.status as 'completed' | 'failed';
        } else {
          status = 'pending';
        }

        // Convert to GeneratedImage format
        return {
          id: data.id,
          prompt: data.scene_description || '',
          status,
          createdAt: data.created_at,
          resultUrl: data.result_url,
          inputUrl: data.source_image_url,
          url: data.result_url,
          source_image_url: data.source_image_url,
          settings: typeof data.settings === 'string' 
            ? JSON.parse(data.settings) 
            : (data.settings as Record<string, any>)
        };
      }
      return null;
    } catch (error) {
      console.error('Error checking image status:', error);
      return null;
    }
  }, []);

  return {
    pendingImageIds,
    isPolling,
    addToQueue,
    clearQueue,
    checkInterval,
    setCheckInterval,
    checkImageStatus,
    checkPendingImages
  };
}
