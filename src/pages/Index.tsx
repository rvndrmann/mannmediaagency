
import { Sidebar } from "@/components/Sidebar";
import { Dashboard } from "@/components/Dashboard";
import { SidebarProvider } from "@/components/ui/sidebar";
import { VideoShowcase } from "@/components/auth/VideoShowcase";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    },
  });

  return (
    <SidebarProvider>
      <div className="flex flex-col min-h-screen w-full bg-background">
        {session ? (
          <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto">
              <Dashboard />
            </main>
          </div>
        ) : (
          <div className="flex-1">
            <div className="w-full">
              <VideoShowcase />
            </div>
          </div>
        )}
      </div>
    </SidebarProvider>
  );
};

export default Index;
