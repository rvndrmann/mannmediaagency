
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MediaUpdate {
  jobId: string;
  progress?: number;
  resultUrl?: string;
  status?: string;
  error?: string;
}

export const useMediaUpdates = (jobIds: string[] = []) => {
  const [updates, setUpdates] = useState<Record<string, MediaUpdate>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobIds.length) return;

    const fetchMediaUpdates = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch image generation jobs
        const { data: imageData, error: imageError } = await supabase
          .from('image_generation_jobs')
          .select('id, status, progress, result_url')
          .in('id', jobIds);

        // Fetch video generation jobs
        const { data: videoData, error: videoError } = await supabase
          .from('video_generation_jobs')
          .select('id, status, progress, result_url')
          .in('id', jobIds);

        if (imageError || videoError) {
          console.error('Error fetching media updates:', imageError || videoError);
          setError('Failed to fetch media updates');
          return;
        }

        // Combine data from both sources
        const combinedData = [...(imageData || []), ...(videoData || [])];
        
        // Process the results
        const newUpdates: Record<string, MediaUpdate> = {};
        
        combinedData.forEach(item => {
          if (!item) return;
          
          newUpdates[item.id] = {
            jobId: item.id,
            status: item.status,
            progress: typeof item.progress === 'number' ? item.progress : undefined,
            resultUrl: item.result_url || undefined
          };
        });

        setUpdates(prev => ({ ...prev, ...newUpdates }));
      } catch (err) {
        console.error('Error in useMediaUpdates:', err);
        setError('An unexpected error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMediaUpdates();

    // Set up real-time subscription
    const subscription = supabase
      .channel('media-updates')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'image_generation_jobs',
        filter: `id=in.(${jobIds.join(',')})` 
      }, (payload) => {
        if (payload.new) {
          const { id, status, progress, result_url } = payload.new as any;
          
          setUpdates(prev => ({
            ...prev,
            [id]: {
              jobId: id,
              status,
              progress: typeof progress === 'number' ? progress : undefined,
              resultUrl: result_url || undefined
            }
          }));
          
          // Notify user of completed jobs
          if (status === 'completed' && result_url) {
            toast.success('Media generation completed!');
          } else if (status === 'failed') {
            toast.error('Media generation failed');
          }
        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [jobIds]);

  return { updates, isLoading, error };
};
