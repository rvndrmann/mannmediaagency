
import React, { useEffect, useState } from 'react';
import { TraceDashboard } from '@/components/traces/TraceDashboard';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TraceDashboardProps {
  userId?: string; // Made optional to match the component
}

const TraceAnalytics: React.FC = () => {
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function getUserId() {
      try {
        setIsLoading(true);
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
          throw error;
        }
        
        if (user) {
          setUserId(user.id);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        toast({
          title: 'Authentication Error',
          description: 'Failed to fetch user data. Please try logging in again.',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    }
    
    getUserId();
  }, [toast]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Trace Analytics</h1>
      {userId && <TraceDashboard userId={userId} />}
    </div>
  );
};

export default TraceAnalytics;
