
import { Sidebar } from "@/components/Sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

interface ProductShootLayoutProps {
  children: React.ReactNode;
}

export function ProductShootLayout({ children }: ProductShootLayoutProps) {
  return (
    <SidebarProvider defaultOpen>
      <div className="flex flex-col min-h-screen w-full bg-background">
        <div className="flex flex-1">
          <Sidebar />
          <main className="flex-1 relative">
            <div className="p-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
