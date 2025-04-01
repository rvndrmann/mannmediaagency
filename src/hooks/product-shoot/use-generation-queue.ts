
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "../use-user";
import { toast } from "sonner";
import { StatusResponse } from "@/types/product-shoot";

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
      // Direct database access approach to avoid typing issues
      const insertion = await supabase.rpc('insert_product_shot', {
        p_source_image_url: sourceImageUrl,
        p_scene_description: prompt,
        p_ref_image_url: sourceImageUrl,
        p_settings: {
          stylePreset: options.stylePreset || 'product',
          version: options.version || 'v1',
          placement: options.placement || 'product',
          background: options.background || 'transparent',
          outputFormat: options.outputFormat || 'png',
          imageWidth: options.imageWidth || 768,
          imageHeight: options.imageHeight || 768,
          quality: options.quality || 'standard'
        },
        p_status: 'processing',
        p_user_id: user.id,
        p_visibility: 'private'
      });

      // Handle error response
      if (typeof insertion === 'object' && 'error' in insertion && insertion.error) {
        throw new Error(insertion.error);
      }

      // Get the ID from the result
      const imageId = insertion as string;

      if (!imageId) {
        throw new Error("Failed to add image to generation queue");
      }

      // Initiate the generation
      const { error: genError } = await supabase.functions.invoke('initiate-image-generation', {
        body: { image_id: imageId }
      });

      if (genError) {
        throw genError;
      }

      return imageId;
    } catch (error) {
      console.error("Error adding to generation queue:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(`Generation error: ${errorMessage}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const checkStatus = useCallback(async (imageId: string): Promise<StatusResponse> => {
    try {
      // Use RPC to get status
      const result = await supabase.rpc('get_product_shot_status', {
        p_id: imageId
      });

      if (result.error) {
        throw result.error;
      }

      const data = result.data;

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
