
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GeneratedImage, GenerationResult } from '@/types/product-shoot';

export const useGenerationQueue = () => {
  const [queuedItems, setQueuedItems] = useState<GeneratedImage[]>([]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Set up realtime subscription for job status updates
    const channel = supabase
      .channel('image-generation-updates')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'image_generation_jobs',
      }, (payload) => {
        updateJobStatus(payload.new);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const updateJobStatus = (jobData: any) => {
    setQueuedItems((prev) => {
      return prev.map(item => {
        if (item.id === jobData.id) {
          return {
            ...item,
            status: jobData.status,
            resultUrl: jobData.result_url || item.resultUrl,
          };
        }
        return item;
      });
    });
  };

  const checkStatus = async (jobId: string): Promise<GenerationResult> => {
    try {
      const { data, error } = await supabase
        .from('image_generation_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error) {
        throw error;
      }

      return {
        id: data.id,
        status: data.status,
        resultUrl: data.result_url,
      };
    } catch (error) {
      console.error('Error checking job status:', error);
      return {
        id: jobId,
        status: 'failed',
        error: 'Failed to check status',
      };
    }
  };

  const addToQueue = async (
    prompt: string,
    imageUrl: string,
    settings: Record<string, any> = {}
  ): Promise<{ jobId: string; success: boolean }> => {
    try {
      setProcessing(true);
      setError(null);

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error('User not authenticated');
      }

      // Create a job entry
      const { data, error } = await supabase
        .from('image_generation_jobs')
        .insert([
          {
            prompt,
            settings: settings,
            user_id: userData.user.id,
          },
        ])
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Add to local queue
      const newQueueItem: GeneratedImage = {
        id: data.id,
        prompt: data.prompt,
        status: data.status,
        createdAt: typeof data.created_at === 'string' ? data.created_at : new Date().toISOString(),
        inputUrl: imageUrl,
        source_image_url: imageUrl,
        settings: data.settings,
      };

      setQueuedItems((prev) => [...prev, newQueueItem]);

      // Call the edge function to start generation
      const { error: fnError } = await supabase.functions.invoke(
        'generate-product-image',
        {
          body: {
            jobId: data.id,
            prompt: prompt,
            imageUrl: imageUrl,
            settings: settings,
          },
        }
      );

      if (fnError) {
        throw fnError;
      }

      return { jobId: data.id, success: true };
    } catch (error: any) {
      setError(error.message || 'Failed to add job to queue');
      console.error('Error adding to queue:', error);
      return { jobId: '', success: false };
    } finally {
      setProcessing(false);
    }
  };

  const clearItem = (jobId: string) => {
    setQueuedItems((prev) => prev.filter((item) => item.id !== jobId));
  };

  const clearCompleted = () => {
    setQueuedItems((prev) =>
      prev.filter((item) => item.status !== 'completed' && item.status !== 'failed')
    );
  };

  const clearAll = () => {
    setQueuedItems([]);
  };

  return {
    queuedItems,
    processing,
    error,
    addToQueue,
    checkStatus,
    clearItem,
    clearCompleted,
    clearAll,
  };
};
