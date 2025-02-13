import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Index from "./pages/Index";
import CreateVideo from "./pages/CreateVideo";
import Integrations from "./pages/Integrations";
import Plans from "./pages/Plans";
import Auth from "./pages/Auth";
import LoginForm from "./components/auth/LoginForm";
import SignupForm from "./components/auth/SignupForm";
import Payment from "./pages/Payment";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentFailure from "./pages/PaymentFailure";
import PaymentCancel from "./pages/PaymentCancel";
import AIAgent from "./pages/AIAgent";
import { PromotionalBanner } from "@/components/plans/PromotionalBanner";
import Metadata from "./pages/Metadata";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setIsAuthenticated(!!session);
      } catch (error) {
        console.error("Session check error:", error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setIsAuthenticated(!!session);
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return (
      <>
        <PromotionalBanner />
        <Auth />
      </>
    );
  }

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <div className="min-h-screen bg-background font-sans antialiased">
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <TooltipProvider>
          <Routes>
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              }
            />
            <Route path="/auth/login" element={
              <>
                <PromotionalBanner />
                <LoginForm />
              </>
            } />
            <Route path="/auth/signup" element={
              <>
                <PromotionalBanner />
                <SignupForm />
              </>
            } />
            <Route path="/plans" element={<Plans />} />
            <Route
              path="/create-video"
              element={
                <ProtectedRoute>
                  <CreateVideo />
                </ProtectedRoute>
              }
            />
            <Route
              path="/metadata/:storyId?"
              element={
                <ProtectedRoute>
                  <Metadata />
                </ProtectedRoute>
              }
            />
            <Route
              path="/integrations"
              element={
                <ProtectedRoute>
                  <Integrations />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ai-agent"
              element={
                <ProtectedRoute>
                  <AIAgent />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payment"
              element={
                <ProtectedRoute>
                  <Payment />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payment/success"
              element={
                <ProtectedRoute>
                  <PaymentSuccess />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payment/failure"
              element={
                <ProtectedRoute>
                  <PaymentFailure />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payment/cancel"
              element={
                <ProtectedRoute>
                  <PaymentCancel />
                </ProtectedRoute>
              }
            />
          </Routes>
        </TooltipProvider>
      </BrowserRouter>
    </div>
  </QueryClientProvider>
);

export default App;
