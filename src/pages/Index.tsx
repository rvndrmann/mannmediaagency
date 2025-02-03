import { Sidebar } from "@/components/Sidebar";
import { Dashboard } from "@/components/Dashboard";
import { SidebarProvider } from "@/components/ui/sidebar";

const Index = () => {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <div className="fixed top-0 left-0 h-screen">
          <Sidebar />
        </div>
        <div className="flex-1 ml-64">
          <Dashboard />
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Index;