
import { Sidebar } from "@/components/Sidebar";
import { Dashboard } from "@/components/Dashboard";
import { SidebarProvider } from "@/components/ui/sidebar";
import { PromotionalBanner } from "@/components/plans/PromotionalBanner";
import { Suspense } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Loader2 } from "lucide-react";

const Index = () => {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    }>
      <div className="flex flex-col min-h-screen w-full bg-background">
        <PromotionalBanner />
        <div className="flex flex-1">
          <Sidebar />
          <Dashboard />
        </div>
      </div>
    </Suspense>
  );
};

export default Index;
