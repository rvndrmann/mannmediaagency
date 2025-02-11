
import { Sidebar } from "@/components/Sidebar";
import { Dashboard } from "@/components/Dashboard";
import { SidebarProvider } from "@/components/ui/sidebar";
import { SplashCursor } from "@/components/ui/splash-cursor";

const Index = () => {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <SplashCursor />
        <Sidebar />
        <Dashboard />
      </div>
    </SidebarProvider>
  );
};

export default Index;
