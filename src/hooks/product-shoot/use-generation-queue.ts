
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "../use-user";
import { toast } from "sonner";

export function useGenerationQueue() {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useUser();

  const addToQueue = useCallback(async (
    sourceImageUrl: string,
    prompt: string,
    options: {
      stylePreset?: string;
      version?: string;
      placement?: string;
      background?: string;
      outputFormat?: string;
      imageWidth?: number;
      imageHeight?: number;
      quality?: string;
    } = {}
  ): Promise<string | null> => {
    if (!user) {
      toast.error("You must be logged in to generate images");
      return null;
    }

    setIsLoading(true);

    try {
      // Insert into product_shots table
      const { data, error } = await supabase
        .from('product_shots')
        .insert({
          source_image_url: sourceImageUrl,
          scene_description: prompt, // Use scene_description instead of prompt
          ref_image_url: sourceImageUrl,
          settings: {
            stylePreset: options.stylePreset || 'product',
            version: options.version || 'v1',
            placement: options.placement || 'product',
            background: options.background || 'transparent',
            outputFormat: options.outputFormat || 'png',
            imageWidth: options.imageWidth || 768,
            imageHeight: options.imageHeight || 768,
            quality: options.quality || 'standard'
          },
          status: 'processing', // Use processing instead of in_queue
          user_id: user.id,
          visibility: 'private'
        })
        .select('id');

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error("Failed to add image to generation queue");
      }

      // Initiate the generation
      const { error: genError } = await supabase.functions.invoke('initiate-image-generation', {
        body: { image_id: data[0].id }
      });

      if (genError) {
        throw genError;
      }

      return data[0].id;
    } catch (error) {
      console.error("Error adding to generation queue:", error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const checkStatus = useCallback(async (imageId: string) => {
    try {
      // Check the status in database
      const { data, error } = await supabase
        .from('product_shots')
        .select('*')
        .eq('id', imageId)
        .single();

      if (error) {
        throw error;
      }

      if (!data) {
        return {
          status: 'failed',
          error: 'Image not found',
          resultUrl: null
        };
      }

      // Map database status to our status types
      let status: 'pending' | 'processing' | 'completed' | 'failed';
      switch (data.status) {
        case 'completed':
          status = 'completed';
          break;
        case 'failed':
          status = 'failed';
          break;
        case 'in_queue':
        case 'processing':
          status = 'processing';
          break;
        default:
          status = 'pending';
      }

      const settings = typeof data.settings === 'string' 
        ? JSON.parse(data.settings)
        : data.settings as Record<string, any>;

      return {
        status,
        resultUrl: data.result_url,
        error: data.error_message || null,
        settings
      };
    } catch (error) {
      console.error("Error checking image status:", error);
      return {
        status: 'failed',
        error: 'Failed to check status',
        resultUrl: null
      };
    }
  }, []);

  return {
    isLoading,
    addToQueue,
    checkStatus
  };
}
