
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { BrowserTaskHistory, TaskStatus } from './types';

export const useTaskHistory = (userId?: string) => {
  const [history, setHistory] = useState<BrowserTaskHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    if (!userId) {
      setHistory([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('browser_task_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Cast the status to TaskStatus type
      const typedHistory = (data || []).map(item => ({
        ...item,
        status: item.status as TaskStatus
      }));

      setHistory(typedHistory);
      setError(null);
    } catch (err) {
      console.error('Error fetching task history:', err);
      setError('Failed to load task history');
      toast.error('Failed to load task history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [userId]);

  const refetch = () => {
    fetchHistory();
  };

  return { history, loading, error, refetch };
};
