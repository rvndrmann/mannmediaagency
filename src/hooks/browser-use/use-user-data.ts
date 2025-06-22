
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { UserCredits } from './types';

export const useUserData = (userId?: string) => {
  const [userCredits, setUserCredits] = useState<UserCredits | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserCredits = async () => {
    if (!userId) {
      setUserCredits(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_credits')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      // Map the data to match UserCredits interface
      const mappedCredits: UserCredits = {
        credits_remaining: data.credits_remaining,
        credits_used: 0, // Default value as this field doesn't exist in DB
        last_updated: data.updated_at
      };

      setUserCredits(mappedCredits);
      setError(null);
    } catch (err) {
      console.error('Error fetching user credits:', err);
      setError('Failed to load user credits');
    } finally {
      setLoading(false);
    }
  };

  const refetchCredits = async () => {
    if (!userId) return;
    
    try {
      const { data, error } = await supabase
        .from('user_credits')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      const mappedCredits: UserCredits = {
        credits_remaining: data.credits_remaining,
        credits_used: 0,
        last_updated: data.updated_at
      };

      setUserCredits(mappedCredits);
    } catch (err) {
      console.error('Error refetching user credits:', err);
    }
  };

  useEffect(() => {
    fetchUserCredits();
  }, [userId]);

  return { userCredits, loading, error, refetchCredits };
};
