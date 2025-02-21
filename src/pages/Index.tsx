
import { Sidebar } from "@/components/Sidebar";
import { Dashboard } from "@/components/Dashboard";
import { SidebarProvider } from "@/components/ui/sidebar";
import { PromotionalBanner } from "@/components/plans/PromotionalBanner";
import { VideoShowcase } from "@/components/auth/VideoShowcase";
import { HomeExploreSection } from "@/components/explore/HomeExploreSection";
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
        <PromotionalBanner />
        {session ? (
          <div className="flex flex-1">
            <Sidebar />
            <Dashboard />
          </div>
        ) : (
          <div className="flex-1 max-w-[1400px] mx-auto w-full">
            <VideoShowcase />
            <HomeExploreSection />
          </div>
        )}
      </div>
    </SidebarProvider>
  );
};

export default Index;
