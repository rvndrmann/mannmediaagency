
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Params {
  imageJobs: Record<string, { status: string; result_url: string }>;
}

export const useMediaUpdates = (params: Params) => {
  const [updatedItems, setUpdatedItems] = useState<
    Record<
      string,
      {
        id: string;
        status: string;
        progress: number;
        result_url: string;
      }
    >
  >({});

  useEffect(() => {
    const fetchUpdates = async () => {
      if (!params.imageJobs || Object.keys(params.imageJobs).length === 0) {
        return;
      }

      try {
        // Fetch job updates with error handling
        const { data: imageJobs, error } = await supabase
          .from('image_generation_jobs')
          .select('id, status, result_url')
          .in('id', Object.keys(params.imageJobs));

        if (error) {
          console.error("Error fetching image generation jobs:", error);
          return;
        }

        // Process only if data exists and is valid
        if (imageJobs && Array.isArray(imageJobs)) {
          const newUpdatedItems = { ...updatedItems };
          
          imageJobs.forEach(job => {
            if (job && job.id) {
              newUpdatedItems[job.id] = {
                id: job.id,
                status: job.status || 'pending',
                progress: 100, // Default to 100 if no progress field
                result_url: job.result_url || ''
              };
            }
          });
          
          setUpdatedItems(newUpdatedItems);
        }
      } catch (fetchError) {
        console.error("Failed to fetch media updates:", fetchError);
      }
    };

    fetchUpdates();
    
    // Set up polling interval for updates
    const intervalId = setInterval(fetchUpdates, 5000);
    
    return () => clearInterval(intervalId);
  }, [params.imageJobs]);

  return updatedItems;
};
