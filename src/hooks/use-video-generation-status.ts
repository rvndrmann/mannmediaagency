
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface VideoGenerationStatus {
  status: 'in_queue' | 'processing' | 'completed' | 'failed';
  message: string;
  progress: number;
  timeRemaining?: string;
}

export const useVideoGenerationStatus = (jobId: string | null) => {
  const [status, setStatus] = useState<VideoGenerationStatus>({
    status: 'in_queue',
    message: 'Initializing...',
    progress: 0,
  });

  const checkStatus = useCallback(async () => {
    if (!jobId) return;

    try {
      // Get the job details from the database
      const { data: job, error } = await supabase
        .from('video_generation_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error) throw error;

      const createdAt = new Date(job.created_at);
      const now = new Date();
      const elapsedMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);
      
      // Calculate estimated progress (based on 7-minute expected duration)
      const progress = Math.min(Math.round((elapsedMinutes / 7) * 100), 99);
      
      let timeRemaining = '';
      if (elapsedMinutes < 7) {
        const remaining = Math.ceil(7 - elapsedMinutes);
        timeRemaining = `${remaining} minute${remaining !== 1 ? 's' : ''} remaining`;
      }

      // Update status based on job status and elapsed time
      let message = '';
      if (job.status === 'completed') {
        message = 'Video generation completed!';
      } else if (job.status === 'failed') {
        message = job.error_message || 'Video generation failed';
      } else {
        // For 'in_queue' or 'processing' status
        if (elapsedMinutes < 2) {
          message = 'Initializing video generation...';
        } else if (elapsedMinutes < 4) {
          message = 'Generating video...';
        } else {
          message = 'Finalizing video...';
        }
      }

      setStatus({
        status: job.status,
        message,
        progress: job.status === 'completed' ? 100 : progress,
        timeRemaining: job.status === 'completed' ? undefined : timeRemaining,
      });

      // Return true if the status check should continue
      return job.status === 'in_queue' || job.status === 'processing';
    } catch (error) {
      console.error('Error checking video status:', error);
      toast.error('Failed to check video status');
      return false;
    }
  }, [jobId]);

  return {
    status,
    checkStatus,
  };
};
