
import React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import AuthCallback from "@/components/auth/AuthCallback";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ChatSessionProvider } from "@/contexts/ChatSessionContext";

import Index from './pages/Index';
import Auth from './pages/Auth';
import AboutUs from './pages/AboutUs';
import Contact from './pages/Contact';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import BrowserUse from './pages/BrowserUse';
import ProductShoot from './pages/ProductShoot';
import ProductShootV2 from './pages/ProductShootV2';
import ImageToVideo from './pages/ImageToVideo';
import ProductAd from './pages/ProductAd';
import Plans from './pages/Plans';
import CreateVideo from './pages/CreateVideo';
import ProfileSettings from './pages/ProfileSettings';
import Integrations from './pages/Integrations';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentFailure from './pages/PaymentFailure';
import PaymentCancel from './pages/PaymentCancel';
import Payment from './pages/Payment';
import Metadata from './pages/Metadata';
import CustomOrders from './pages/CustomOrders';
import CustomOrderForm from './pages/CustomOrderForm';
import TraceAnalytics from './pages/TraceAnalytics';
import MultiAgentChat from './pages/MultiAgentChat';
import Explore from './pages/Explore';
import Canvas from './pages/Canvas';
import VideoCreator from './pages/VideoCreator';
import LoginForm from './components/auth/LoginForm';
import SignupForm from './components/auth/SignupForm';
import Admin from './pages/Admin';

// Create a client for React Query
const queryClient = new QueryClient();

export default function App() {
  return (
    <div>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
          <ChatSessionProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/auth/login" element={<LoginForm />} />
                <Route path="/auth/signup" element={<SignupForm />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/about" element={<AboutUs />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/browser-use" element={<BrowserUse />} />
                <Route path="/product-shoot" element={<ProductShoot />} />
                <Route path="/product-shoot-v2" element={<ProductShootV2 />} />
                <Route path="/image-to-video" element={<ImageToVideo />} />
                <Route path="/product-ad" element={<ProductAd />} />
                <Route path="/plans" element={<Plans />} />
                <Route path="/create-video" element={<CreateVideo />} />
                <Route path="/video-creator" element={
                  <ProtectedRoute>
                    <VideoCreator />
                  </ProtectedRoute>
                } />
                <Route path="/settings" element={
                  <ProtectedRoute>
                    <ProfileSettings />
                  </ProtectedRoute>
                } />
                <Route path="/profile" element={
                  <ProtectedRoute>
                    <ProfileSettings />
                  </ProtectedRoute>
                } />
                <Route path="/integrations" element={<Integrations />} />
                <Route path="/payment-success" element={<PaymentSuccess />} />
                <Route path="/payment-failure" element={<PaymentFailure />} />
                <Route path="/payment-cancel" element={<PaymentCancel />} />
                <Route path="/payment" element={<Payment />} />
                <Route path="/metadata" element={<Metadata />} />
                <Route path="/custom-orders" element={<CustomOrders />} />
                <Route path="/custom-order" element={<CustomOrderForm />} />
                <Route path="/trace-analytics" element={<TraceAnalytics />} />
                <Route path="/multi-agent-chat" element={<MultiAgentChat />} />
                <Route path="/explore" element={<Explore />} />
                <Route path="/canvas" element={<Canvas />} />
                <Route path="/admin" element={
                  <ProtectedRoute>
                    <Admin />
                  </ProtectedRoute>
                } />
              </Routes>
            </BrowserRouter>
            <Toaster />
            <SonnerToaster position="top-right" richColors />
          </ChatSessionProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </div>
  );
}
