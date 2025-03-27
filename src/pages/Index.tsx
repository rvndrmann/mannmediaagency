
import { Sidebar } from "@/components/Sidebar";
import { Dashboard } from "@/components/Dashboard";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import Auth from "./Auth";

const Index = () => {
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
