
import { TraceDashboard } from "@/components/multi-agent/TraceDashboard";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function TraceAnalytics() {
  const [userId, setUserId] = useState<string | null>(null);
  
  useEffect(() => {
    document.title = "Trace Analytics";
    
    // Get current user
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    
    fetchUser();
  }, []);
  
  if (!userId) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Loading analytics...</h2>
          <p className="text-gray-500">Please wait while we load your data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <TraceDashboard />
    </div>
  );
}
