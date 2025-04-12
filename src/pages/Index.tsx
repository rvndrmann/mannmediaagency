import React from "react";
import { Sidebar } from "@/components/Sidebar";
import { Dashboard } from "@/components/Dashboard";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import Auth from "./Auth";

/**
 * Main index page component that displays either the dashboard or authentication form
 * based on user's session status
 */
const Index: React.FC = () => {
  const isMobile = useIsMobile();

  // Log environment variables on component mount
  React.useEffect(() => {
    console.log("NODE_ENV in Index:", process.env.NODE_ENV);
    // Note: Vite uses import.meta.env for env vars prefixed with VITE_
    // If REACT_APP_MCP_URL is not prefixed with VITE_, it might not be available here.
    // Check your .env file and Vite configuration.
    console.log("VITE_REACT_APP_MCP_URL in Index:", import.meta.env.VITE_REACT_APP_MCP_URL);
  }, []);
  
  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    },
  });

  return (
    <SidebarProvider>
      <div className="flex flex-col min-h-screen w-full bg-background pb-16 md:pb-0">
        {session ? (
          <div className="flex h-screen overflow-hidden">
            {!isMobile && <Sidebar />}
            <main className="flex-1 overflow-y-auto">
              <Dashboard />
            </main>
          </div>
        ) : (
          <Auth />
        )}
      </div>
    </SidebarProvider>
  );
};

export default Index;
