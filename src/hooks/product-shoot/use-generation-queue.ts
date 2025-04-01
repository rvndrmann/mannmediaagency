
import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Hook for managing a queue of image generation jobs
 */
export function useGenerationQueue() {
  const [queue, setQueue] = useState<string[]>([]);
  const [isPolling, setIsPolling] = useState(false);
  const [completedJobs, setCompletedJobs] = useState<string[]>([]);
  const [failedJobs, setFailedJobs] = useState<string[]>([]);
  const intervalRef = useRef<number | null>(null);
  const checkStatusFunctionRef = useRef<((id: string) => Promise<any>) | null>(null);

  // Add a job to the queue
  const addToQueue = useCallback((jobId: string) => {
    setQueue(prev => [...prev, jobId]);
  }, []);

  // Set the check status function
  const setCheckStatusFunction = useCallback((checkFunction: (id: string) => Promise<any>) => {
    checkStatusFunctionRef.current = checkFunction;
  }, []);

  // Start polling for job statuses
  const startPolling = useCallback(() => {
    if (isPolling || queue.length === 0 || !checkStatusFunctionRef.current) return;
    
    setIsPolling(true);
    
    // Clear any existing interval
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
    }
    
    // Set up polling interval
    intervalRef.current = window.setInterval(async () => {
      if (queue.length === 0) {
        if (intervalRef.current) {
          window.clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setIsPolling(false);
        return;
      }
      
      const currentQueue = [...queue];
      const remainingJobs: string[] = [];
      const newCompletedJobs: string[] = [];
      const newFailedJobs: string[] = [];
      
      for (const jobId of currentQueue) {
        if (!checkStatusFunctionRef.current) continue;
        
        try {
          const status = await checkStatusFunctionRef.current(jobId);
          
          if (status.status === 'completed') {
            newCompletedJobs.push(jobId);
          } else if (status.status === 'failed') {
            newFailedJobs.push(jobId);
          } else {
            remainingJobs.push(jobId);
          }
        } catch (error) {
          console.error(`Error checking job ${jobId}:`, error);
          remainingJobs.push(jobId);
        }
      }
      
      setQueue(remainingJobs);
      
      if (newCompletedJobs.length > 0) {
        setCompletedJobs(prev => [...prev, ...newCompletedJobs]);
      }
      
      if (newFailedJobs.length > 0) {
        setFailedJobs(prev => [...prev, ...newFailedJobs]);
      }
      
      if (remainingJobs.length === 0) {
        if (intervalRef.current) {
          window.clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setIsPolling(false);
      }
    }, 3000); // Poll every 3 seconds
    
  }, [isPolling, queue]);

  // Check status of a specific job
  const checkStatus = useCallback(async (jobId: string) => {
    if (!checkStatusFunctionRef.current) return null;
    
    try {
      return await checkStatusFunctionRef.current(jobId);
    } catch (error) {
      console.error(`Error checking status for job ${jobId}:`, error);
      return null;
    }
  }, []);

  // Cleanup the interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Automatically start polling when a new job is added to the queue
  useEffect(() => {
    if (queue.length > 0 && !isPolling && checkStatusFunctionRef.current) {
      startPolling();
    }
  }, [queue, isPolling, startPolling]);

  return {
    addToQueue,
    setCheckStatusFunction,
    checkStatus,
    startPolling,
    isPolling,
    queueLength: queue.length,
    completedJobs,
    failedJobs
  };
}
