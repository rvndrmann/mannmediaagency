
import { TraceDashboard } from "@/components/multi-agent/TraceDashboard";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function TraceAnalyticsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Trace Analytics | AI Collaboration";
    
    // Check authentication status
    const checkAuth = async () => {
      setIsLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/login', { replace: true });
        return;
      }
      
      setUserId(user.id);
      setIsLoading(false);
    };
    
    checkAuth();
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1A1F29] to-[#121827] text-white">
      {userId && <TraceDashboard userId={userId} />}
    </div>
  );
}
