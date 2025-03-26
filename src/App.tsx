
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from 'next-themes';
import { Toaster } from "@/components/ui/toaster";
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
import Canvas from './pages/Canvas';  // Import the Canvas component
import './App.css';

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <Router>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
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
          <Route path="/settings" element={<ProfileSettings />} />
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
          <Route path="/canvas" element={<Canvas />} />  {/* Add the Canvas route */}
        </Routes>
        <Toaster />
      </Router>
    </ThemeProvider>
  );
}

export default App;
