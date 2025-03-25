import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

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

      // Modify the query result processing to handle potential errors
      const { data: imageJobs } = await supabase
        .from('image_generation_jobs')
        .select('id, status, result_url')
        .in('id', Object.keys(params.imageJobs));

      // Process only if data exists and is valid
      if (imageJobs && Array.isArray(imageJobs)) {
        imageJobs.forEach(job => {
          if (job && job.id) {
            updatedItems[job.id] = {
              id: job.id,
              status: job.status,
              progress: 100, // Default to 100 if no progress field
              result_url: job.result_url
            };
          }
        });
      }

      setUpdatedItems(updatedItems);
    };

    fetchUpdates();
  }, [params.imageJobs]);

  return updatedItems;
};
