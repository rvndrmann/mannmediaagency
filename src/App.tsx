
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
import AuthCallback from "./components/auth/AuthCallback";
import Payment from "./pages/Payment";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentFailure from "./pages/PaymentFailure";
import PaymentCancel from "./pages/PaymentCancel";
import AIAgent from "./pages/AIAgent";
import ProductShoot from "./pages/ProductShoot";
import ProductShootV2 from "./pages/ProductShootV2";
import Metadata from "./pages/Metadata";
import ImageToVideo from "./pages/ImageToVideo";
import AboutUs from "./pages/AboutUs";
import Contact from "./pages/Contact";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Explore from "./pages/Explore";
import Admin from "./pages/Admin";
import VideoTemplates from "./pages/VideoTemplates";
import { ThemeProvider } from "next-themes";
import ProfileSettings from "@/pages/ProfileSettings";
import { BottomNav } from "./components/mobile/BottomNav";
import CustomOrderForm from "./pages/CustomOrderForm";

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
    return <Auth />;
  }

  return <>{children}</>;
};

const App = () => (
  <ThemeProvider defaultTheme="dark" enableSystem>
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background font-sans antialiased">
        <BrowserRouter>
          <TooltipProvider>
            <Routes>
              <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/explore" element={<ProtectedRoute><Explore /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><ProfileSettings /></ProtectedRoute>} />
              <Route path="/auth/login" element={<LoginForm />} />
              <Route path="/auth/signup" element={<SignupForm />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/plans" element={<Plans />} />
              <Route path="/about" element={<AboutUs />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/create-video" element={<ProtectedRoute><CreateVideo /></ProtectedRoute>} />
              <Route path="/product-shoot" element={<ProtectedRoute><ProductShoot /></ProtectedRoute>} />
              <Route path="/product-shoot-v2" element={<ProtectedRoute><ProductShootV2 /></ProtectedRoute>} />
              <Route path="/image-to-video" element={<ProtectedRoute><ImageToVideo /></ProtectedRoute>} />
              <Route path="/video-templates" element={<ProtectedRoute><VideoTemplates /></ProtectedRoute>} />
              <Route path="/metadata/:storyId?" element={<ProtectedRoute><Metadata /></ProtectedRoute>} />
              <Route path="/integrations" element={<ProtectedRoute><Integrations /></ProtectedRoute>} />
              <Route path="/ai-agent" element={<ProtectedRoute><AIAgent /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
              <Route path="/payment" element={<Payment />} />
              <Route path="/payment/success" element={<ProtectedRoute><PaymentSuccess /></ProtectedRoute>} />
              <Route path="/payment/failure" element={<ProtectedRoute><PaymentFailure /></ProtectedRoute>} />
              <Route path="/payment/cancel" element={<ProtectedRoute><PaymentCancel /></ProtectedRoute>} />
              <Route path="/order/:accessCode" element={<CustomOrderForm />} />
              <Route path="/custom-order/:accessCode" element={<CustomOrderForm />} />
            </Routes>
            <BottomNav />
          </TooltipProvider>
          <Toaster />
          <Sonner />
        </BrowserRouter>
      </div>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
