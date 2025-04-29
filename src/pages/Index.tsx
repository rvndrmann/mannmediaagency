import React from "react";
import { Sidebar } from "@/components/Sidebar";
import { Dashboard } from "@/components/Dashboard";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import Auth from "./Auth";
import { BottomNavBar } from "@/components/mobile/BottomNavBar"; // Import BottomNavBar

/**
 * Main index page component that displays either the dashboard or authentication form
 * based on user's session status
 */
const Index: React.FC = () => {
  const isMobile = useIsMobile();

  
  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    },
  });

  return (
    <SidebarProvider>
      {/* Removed pb-16 md:pb-0 from here */}
      <div className="flex flex-col min-h-screen w-full bg-background">
        {session ? (
          // Added pb-16 md:pb-0 to the main content area when logged in
          <div className="flex h-screen overflow-hidden pb-16 md:pb-0">
            {!isMobile && <Sidebar />}
            <main className="flex-1 overflow-y-auto p-4 md:p-6">
              <Dashboard />
            </main>
            <BottomNavBar /> {/* Add BottomNavBar here */}
          </div>
        ) : (
          <Auth />
        )}
      </div>
    </SidebarProvider>
  );
};

export default Index;
