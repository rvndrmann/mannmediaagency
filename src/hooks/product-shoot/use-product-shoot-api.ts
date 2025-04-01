
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GenerationResponse, StatusResponse } from '@/types/product-shoot';

/**
 * Custom hook for product shot API operations
 */
export function useProductShootApi() {
  const [isLoading, setIsLoading] = useState<boolean>(false);

  /**
   * Submit a generation job to the API
   */
  const submitGenerationJob = useCallback(async (
    sourceImageUrl: string,
    prompt: string,
    settings: Record<string, any> = {}
  ): Promise<GenerationResponse> => {
    try {
      setIsLoading(true);
      
      // Call the RPC function to create a product shot job
      const { data, error } = await supabase.rpc('insert_product_shot', {
        p_source_image_url: sourceImageUrl,
        p_scene_description: prompt,
        p_ref_image_url: '',
        p_settings: settings,
        p_status: 'pending',
        p_user_id: (await supabase.auth.getUser()).data.user?.id || '',
        p_visibility: 'private'
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      return {
        success: true,
        message: 'Generation job submitted successfully',
        imageId: data
      };
    } catch (error) {
      console.error('Error in submitGenerationJob:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to submit generation job'
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Check the status of a generation job
   */
  const checkJobStatus = useCallback(async (jobId: string): Promise<StatusResponse> => {
    try {
      // Call the RPC function to get job status
      const { data, error } = await supabase.rpc('get_product_shot_status', {
        p_id: jobId
      });
      
      if (error) {
        throw new Error(`Failed to check status: ${error.message}`);
      }
      
      if (!data) {
        throw new Error(`No status data found for job ${jobId}`);
      }
      
      return {
        status: data.status as 'pending' | 'processing' | 'completed' | 'failed',
        resultUrl: data.result_url,
        error: data.error_message,
        settings: data.settings
      };
    } catch (error) {
      console.error(`Error checking job status for ${jobId}:`, error);
      return {
        status: 'failed',
        resultUrl: null,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }, []);

  return {
    submitGenerationJob,
    checkJobStatus,
    isLoading
  };
}
