
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Index from "@/pages/Index";
import AIAgent from "@/pages/AIAgent";
import CreateVideo from "@/pages/CreateVideo";
import ImageToVideo from "@/pages/ImageToVideo";
import ProductShoot from "@/pages/ProductShoot";
import Metadata from "@/pages/Metadata";
import Plans from "@/pages/Plans";
import Integrations from "@/pages/Integrations";
import AboutUs from "@/pages/AboutUs";
import Contact from "@/pages/Contact";
import Privacy from "@/pages/Privacy";
import Terms from "@/pages/Terms";
import Auth from "@/pages/Auth";
import LoginForm from "@/components/auth/LoginForm";
import Payment from "@/pages/Payment";
import PaymentSuccess from "@/pages/PaymentSuccess";
import PaymentFailure from "@/pages/PaymentFailure";
import PaymentCancel from "@/pages/PaymentCancel";
import Explore from "@/pages/Explore";
import { Toaster } from "@/components/ui/toaster";
import { SidebarProvider } from "@/components/ui/sidebar";
import "./App.css";

function App() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Router>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/ai-agent" element={<AIAgent />} />
            <Route path="/create-video" element={<CreateVideo />} />
            <Route path="/image-to-video" element={<ImageToVideo />} />
            <Route path="/product-shoot" element={<ProductShoot />} />
            <Route path="/metadata" element={<Metadata />} />
            <Route path="/plans" element={<Plans />} />
            <Route path="/integrations" element={<Integrations />} />
            <Route path="/about" element={<AboutUs />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/login" element={<LoginForm />} />
            <Route path="/payment" element={<Payment />} />
            <Route path="/payment/success" element={<PaymentSuccess />} />
            <Route path="/payment/failure" element={<PaymentFailure />} />
            <Route path="/payment/cancel" element={<PaymentCancel />} />
            <Route path="/explore" element={<Explore />} />
          </Routes>
          <Toaster />
        </Router>
      </div>
    </SidebarProvider>
  );
}

export default App;
