
import { BrowserUseApp } from "@/components/browser-use/BrowserUseApp";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Sidebar } from "@/components/Sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function BrowserUsePage() {
  const isMobile = useIsMobile();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setIsAuthenticated(!!session);
      } catch (error) {
        console.error("Error checking auth:", error);
        toast.error("Authentication error. Please try logging in again.");
      } finally {
        setIsCheckingAuth(false);
      }
    };
    
    checkAuth();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setIsAuthenticated(!!session);
      setIsCheckingAuth(false);
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-lg font-medium">Loading Browser Use API...</p>
        </div>
      </div>
    );
  }
  
  return (
    <ProtectedRoute>
      <SidebarProvider>
        <div className="flex h-screen overflow-hidden">
          {!isMobile && <Sidebar />}
          <main className="flex-1 overflow-y-auto">
            <BrowserUseApp />
          </main>
        </div>
      </SidebarProvider>
    </ProtectedRoute>
  );
}
