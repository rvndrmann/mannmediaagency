
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface JobStatus {
  status: 'IN_QUEUE' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  resultUrl?: string;
  errorMessage?: string;
  falStatus?: string;
}

export function useGenerationQueue(initialJobId?: string) {
  const [jobId, setJobId] = useState<string | null>(initialJobId || null);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [shouldPoll, setShouldPoll] = useState<boolean>(false);

  // Check the status of the job
  const checkStatus = useCallback(async (id: string) => {
    try {
      setIsChecking(true);
      setError(null);
      
      const { data, error } = await supabase.functions.invoke('check-image-status', {
        body: { jobId: id }
      });
      
      if (error) {
        console.error('Error checking status:', error);
        setError(error.message || 'Failed to check status');
        return null;
      }
      
      const response = data as JobStatus;
      
      setStatus(response.status);
      
      if (response.status === 'COMPLETED' && response.resultUrl) {
        setResult(response.resultUrl);
        setShouldPoll(false);
      } else if (response.status === 'FAILED') {
        setError(response.errorMessage || 'Generation failed');
        setShouldPoll(false);
      } else {
        // Still in progress (IN_QUEUE or PROCESSING)
        setShouldPoll(true);
      }
      
      return response;
    } catch (err) {
      console.error('Error in checkStatus:', err);
      setError('Failed to check generation status');
      setShouldPoll(false);
      return null;
    } finally {
      setIsChecking(false);
    }
  }, []);

  // Set up polling for job status
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    
    if (jobId && shouldPoll) {
      timer = setTimeout(() => {
        checkStatus(jobId);
      }, 3000); // Poll every 3 seconds
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [jobId, shouldPoll, checkStatus]);

  // Start checking status when a job ID is set
  useEffect(() => {
    if (jobId) {
      checkStatus(jobId);
    } else {
      // Reset states when no job ID
      setStatus(null);
      setResult(null);
      setError(null);
      setShouldPoll(false);
    }
  }, [jobId, checkStatus]);

  // Retry a failed job
  const retryJob = useCallback(async (id: string) => {
    try {
      setIsChecking(true);
      setError(null);
      
      const { data, error } = await supabase.functions.invoke('retry-image-generation', {
        body: { jobId: id }
      });
      
      if (error) {
        console.error('Error retrying job:', error);
        setError(error.message || 'Failed to retry generation');
        return false;
      }
      
      // Reset states and start polling again
      setStatus('IN_QUEUE');
      setResult(null);
      setShouldPoll(true);
      toast.success('Generation retry initiated');
      
      return true;
    } catch (err) {
      console.error('Error in retryJob:', err);
      setError('Failed to retry generation');
      return false;
    } finally {
      setIsChecking(false);
    }
  }, []);

  return {
    jobId,
    setJobId,
    isChecking,
    result,
    error,
    status,
    checkStatus,
    retryJob
  };
}
