
import { AuthProvider } from "@/components/auth/AuthProvider";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import Routes from "@/Routes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Suspense } from "react";

// Configure the QueryClient with proper error handling
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
      throwOnError: false
    },
    mutations: {
      retry: 3,
      throwOnError: false
    }
  }
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<div>Loading...</div>}>
        <AuthProvider>
          <SidebarProvider>
            <div className="min-h-screen w-full bg-background">
              <Routes />
              <Toaster />
              <Sonner />
            </div>
          </SidebarProvider>
        </AuthProvider>
      </Suspense>
    </QueryClientProvider>
  );
}

export default App;
