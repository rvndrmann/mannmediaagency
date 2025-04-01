
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { StatusResponse } from '@/types/product-shoot';
import { CommandExecutionState } from "@/hooks/multi-agent/types";

export const useGenerationQueue = () => {
  const [queueStatus, setQueueStatus] = useState<Record<string, StatusResponse>>({});
  const [processingIds, setProcessingIds] = useState<string[]>([]);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [failedIds, setFailedIds] = useState<string[]>([]);
  const [isPolling, setIsPolling] = useState<boolean>(false);

  // Add an ID to the processing queue
  const addToQueue = (imageId: string) => {
    setProcessingIds(prev => [...prev, imageId]);
    setQueueStatus(prev => ({
      ...prev,
      [imageId]: {
        status: 'pending',
        resultUrl: null,
        error: null
      }
    }));
  };

  // Submit a new generation job using RPC
  const submitGenerationJob = async (sourceImageUrl: string, prompt: string, settings: any = {}) => {
    try {
      // Call the insert_product_shot RPC function
      const { data, error } = await supabase
        .rpc('insert_product_shot', {
          p_source_image_url: sourceImageUrl,
          p_scene_description: prompt,
          p_ref_image_url: '',
          p_settings: settings,
          p_status: 'pending',
          p_user_id: '',  // This would typically come from authentication
          p_visibility: 'private'
        });

      if (error) {
        console.error('Error submitting generation job:', error.message);
        throw new Error(error.message);
      }

      if (data) {
        const jobId = data;
        console.log('Generation job submitted with ID:', jobId);
        
        // Add the job to the queue for tracking
        addToQueue(jobId);
        
        return jobId;
      }
      
      throw new Error('No job ID returned from submission');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error in submitGenerationJob:', errorMessage);
      throw errorMessage;
    }
  };

  // Check the status of a generation job using RPC
  const checkJobStatus = async (jobId: string): Promise<StatusResponse> => {
    try {
      // Call the get_product_shot_status RPC function
      const { data, error } = await supabase
        .rpc('get_product_shot_status', {
          p_id: jobId
        });

      if (error) {
        throw new Error(`Failed to check status: ${error.message}`);
      }

      if (!data) {
        throw new Error(`No status data found for job ${jobId}`);
      }

      // Map the response to our StatusResponse type
      const statusResponse: StatusResponse = {
        status: data.status as 'pending' | 'processing' | 'completed' | 'failed',
        resultUrl: data.result_url,
        error: data.error_message,
        settings: data.settings
      };

      // Update our local state with the latest status
      setQueueStatus(prev => ({
        ...prev,
        [jobId]: statusResponse
      }));

      // If the job is completed or failed, update our lists
      if (statusResponse.status === 'completed') {
        setCompletedIds(prev => {
          if (!prev.includes(jobId)) {
            return [...prev, jobId];
          }
          return prev;
        });
        setProcessingIds(prev => prev.filter(id => id !== jobId));
      } else if (statusResponse.status === 'failed') {
        setFailedIds(prev => {
          if (!prev.includes(jobId)) {
            return [...prev, jobId];
          }
          return prev;
        });
        setProcessingIds(prev => prev.filter(id => id !== jobId));
      }

      return statusResponse;
    } catch (error) {
      console.error(`Error checking job status for ${jobId}:`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Update queue status with the error
      const errorStatus: StatusResponse = {
        status: 'failed',
        resultUrl: null,
        error: errorMessage
      };
      
      setQueueStatus(prev => ({
        ...prev,
        [jobId]: errorStatus
      }));
      
      setFailedIds(prev => {
        if (!prev.includes(jobId)) {
          return [...prev, jobId];
        }
        return prev;
      });
      
      setProcessingIds(prev => prev.filter(id => id !== jobId));
      
      return errorStatus;
    }
  };

  // Start polling for job status updates
  const startPolling = () => {
    if (!isPolling && processingIds.length > 0) {
      setIsPolling(true);
    }
  };

  // Stop polling for job status updates
  const stopPolling = () => {
    setIsPolling(false);
  };

  // Poll for job status updates
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isPolling && processingIds.length > 0) {
      interval = setInterval(async () => {
        for (const jobId of processingIds) {
          await checkJobStatus(jobId);
        }
        
        // If no more jobs are processing, stop polling
        if (processingIds.length === 0) {
          stopPolling();
        }
      }, 3000); // Poll every 3 seconds
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isPolling, processingIds]);

  return {
    submitGenerationJob,
    checkJobStatus,
    startPolling,
    stopPolling,
    queueStatus,
    processingIds,
    completedIds,
    failedIds,
    isPolling
  };
};
