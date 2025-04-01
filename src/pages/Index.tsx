
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { Dashboard } from "@/components/Dashboard";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import Auth from "./Auth";

/**
 * Main index page component that displays either the dashboard or authentication form
 * based on user's session status
 */
const Index: React.FC = () => {
  const isMobile = useIsMobile();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  
  // If user tries to access a protected route and isn't logged in, redirect to login
  useEffect(() => {
    if (!loading && !user) {
      // The Auth component will handle displaying the login UI
      // We don't need to navigate away from the index page
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="size-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex flex-col min-h-screen w-full bg-background pb-16 md:pb-0">
        {user ? (
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
