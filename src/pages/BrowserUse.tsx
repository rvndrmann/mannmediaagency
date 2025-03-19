
import { BrowserUseApp } from "@/components/browser-use/BrowserUseApp";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Sidebar } from "@/components/Sidebar";
import { useIsMobile } from "@/hooks/use-mobile";

export default function BrowserUsePage() {
  const isMobile = useIsMobile();
  
  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden">
        {!isMobile && <Sidebar />}
        <main className="flex-1 overflow-y-auto">
          <BrowserUseApp />
        </main>
      </div>
    </SidebarProvider>
  );
}
