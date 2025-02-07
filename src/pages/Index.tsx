import { Sidebar } from "@/components/Sidebar";
import { Dashboard } from "@/components/Dashboard";
import { SidebarProvider } from "@/components/ui/sidebar";

const Index = () => {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-white">
        <Sidebar />
        <Dashboard />
      </div>
    </SidebarProvider>
  );
};

export default Index;