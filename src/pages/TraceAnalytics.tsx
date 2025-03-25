
import { TraceDashboard } from "@/components/multi-agent/TraceDashboard";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";

interface TraceAnalyticsProps {
  // Add any props needed here
}

export default function TraceAnalytics({ }: TraceAnalyticsProps) {
  const { user } = useAuth();
  
  useEffect(() => {
    document.title = "Trace Analytics | AI Collaboration";
  }, []);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-white">Please log in to view trace analytics.</p>
      </div>
    );
  }

  return (
    <TraceDashboard 
      userId={user.id} 
    />
  );
}
