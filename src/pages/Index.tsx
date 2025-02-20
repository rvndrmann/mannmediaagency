
import { Sidebar } from "@/components/Sidebar";
import { Dashboard } from "@/components/Dashboard";
import { SidebarProvider } from "@/components/ui/sidebar";
import { PromotionalBanner } from "@/components/plans/PromotionalBanner";

const Index = () => {
  return (
    <SidebarProvider>
      <div className="flex flex-col min-h-screen w-full bg-background">
        <PromotionalBanner />
        <div className="flex flex-1">
          <Sidebar />
          <Dashboard />
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Index;
