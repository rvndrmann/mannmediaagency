
import React from "react";
import { Sidebar } from "@/components/Sidebar";
import { Dashboard } from "@/components/Dashboard";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import Auth from "./Auth";
import { BottomNavBar } from "@/components/mobile/BottomNavBar";

/**
 * Main index page component that displays either the dashboard or authentication form
 * based on user's session status
 */
const Index: React.FC = () => {
  const isMobile = useIsMobile();

  const { data: session, isLoading, error } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error("Session error:", error);
          return null;
        }
        return session;
      } catch (error) {
        console.error("Failed to get session:", error);
        return null;
      }
    },
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show error state if session check failed
  if (error) {
    console.error("Session check error:", error);
    return <Auth />;
  }

  return (
    <SidebarProvider>
      <div className="flex flex-col min-h-screen w-full bg-white">
        {session ? (
          <div className="flex h-screen overflow-hidden pb-16 md:pb-0 bg-white">
            {!isMobile && <Sidebar />}
            <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-white">
              <Dashboard />
            </main>
            <BottomNavBar />
          </div>
        ) : (
          <Auth />
        )}
      </div>
    </SidebarProvider>
  );
};

export default Index;
