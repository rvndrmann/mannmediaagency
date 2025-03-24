
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Task } from '@/types/message';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';

const POLLING_INTERVAL = 5000; // 5 seconds

interface UseMediaUpdatesProps {
  jobId?: string;
  type: 'image' | 'video';
  onComplete?: (mediaUrl: string) => void;
  onProgress?: (progress: number) => void;
  onError?: (error: string) => void;
}

export const useMediaUpdates = ({
  jobId,
  type,
  onComplete,
  onProgress,
  onError
}: UseMediaUpdatesProps) => {
  const [status, setStatus] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState<boolean>(false);

  // Get the appropriate table name based on type
  const getTableName = () => {
    return type === 'image' ? 'image_generation_jobs' : 'video_generation_jobs';
  };

  // Function to check media status
  const checkMediaStatus = useCallback(async () => {
    if (!jobId) return;

    try {
      const tableName = getTableName();
      
      const { data, error: fetchError } = await supabase
        .from(tableName)
        .select('status, result_url, progress')
        .eq('id', jobId)
        .single();

      if (fetchError) {
        console.error(`Error fetching ${type} status:`, fetchError);
        setError(`Error checking ${type} status`);
        if (onError) onError(`Error checking ${type} status`);
        return;
      }

      if (!data) {
        console.error(`No ${type} data found for ID ${jobId}`);
        setError(`No ${type} found`);
        if (onError) onError(`No ${type} found`);
        return;
      }

      // Update status
      setStatus(data.status);
      
      // Update progress if available
      if (data.progress !== undefined && data.progress !== null) {
        setProgress(data.progress);
        if (onProgress) onProgress(data.progress);
      }

      // Check if media generation is complete
      if (data.status === 'completed' && data.result_url) {
        setMediaUrl(data.result_url);
        setIsPolling(false);
        if (onComplete) onComplete(data.result_url);
        
        toast.success(`${type === 'image' ? 'Image' : 'Video'} generated successfully!`);
      }

      // Check for errors
      if (data.status === 'failed' || data.status === 'error') {
        setError(`${type === 'image' ? 'Image' : 'Video'} generation failed`);
        setIsPolling(false);
        if (onError) onError(`${type === 'image' ? 'Image' : 'Video'} generation failed`);
        
        toast.error(`${type === 'image' ? 'Image' : 'Video'} generation failed. Please try again.`);
      }
    } catch (err) {
      console.error(`Error in checkMediaStatus for ${type}:`, err);
      setError(`Error checking ${type} status`);
      if (onError) onError(`Error checking ${type} status`);
    }
  }, [jobId, type, onComplete, onProgress, onError]);

  // Start polling when jobId changes
  useEffect(() => {
    if (jobId) {
      setIsPolling(true);
      setStatus('pending');
      setProgress(0);
      setMediaUrl(null);
      setError(null);
      
      // Initial check
      checkMediaStatus();
    } else {
      setIsPolling(false);
    }
  }, [jobId, checkMediaStatus]);

  // Set up polling interval
  useEffect(() => {
    if (!isPolling) return;

    const intervalId = setInterval(() => {
      checkMediaStatus();
    }, POLLING_INTERVAL);

    return () => clearInterval(intervalId);
  }, [isPolling, checkMediaStatus]);

  // Helper function to create a task object for the media generation
  const createMediaTask = (name: string, status: Task['status'] = 'pending'): Task => {
    return {
      id: uuidv4(),
      name,
      description: name,
      status
    };
  };

  return {
    status,
    progress,
    mediaUrl,
    error,
    isPolling,
    createMediaTask
  };
};
