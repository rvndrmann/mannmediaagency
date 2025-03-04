
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Auth from "@/pages/Auth";
import AuthCallback from "@/components/auth/AuthCallback";
import PrivateRoute from "@/components/auth/PrivateRoute";
import { 
  Sidebar, 
  SidebarHeader, 
  SidebarContent, 
  SidebarFooter 
} from "@/components/ui/sidebar";
import { Navigation } from "@/components/sidebar/Navigation";
import { ProfileSection } from "@/components/sidebar/ProfileSection";
import Index from "@/pages/Index";
import Explore from "@/pages/Explore";
import ProductShoot from "@/pages/ProductShoot";
import ProductShootV2 from "@/pages/ProductShootV2";
import ProductAd from "@/pages/ProductAd";
import ImageToVideo from "@/pages/ImageToVideo";
import Admin from "@/pages/Admin";
import FormSubmission from "@/pages/FormSubmission";
import FormSuccess from "@/pages/FormSuccess";
import PaymentLink from "@/pages/PaymentLink";
import AIAgent from "@/pages/AIAgent";
import CreateVideo from "@/pages/CreateVideo";
import Privacy from "@/pages/Privacy";
import Terms from "@/pages/Terms";
import AboutUs from "@/pages/AboutUs";
import Contact from "@/pages/Contact";
import ProfileSettings from "@/pages/ProfileSettings";
import Plans from "@/pages/Plans";
import Payment from "@/pages/Payment";
import PaymentSuccess from "@/pages/PaymentSuccess";
import PaymentFailure from "@/pages/PaymentFailure";
import PaymentCancel from "@/pages/PaymentCancel";
import Integrations from "@/pages/Integrations";
import { Toaster } from "@/components/ui/sonner";
import { BottomNav } from "@/components/mobile/BottomNav";
import { useNavigate } from "react-router-dom";
import "@/App.css";

// Routes that should have the sidebar
const routesWithSidebar = [
  "/",
  "/dashboard",
  "/explore",
  "/product-shoot",
  "/product-shoot-v2",
  "/product-ad",
  "/image-to-video",
  "/ai-agent",
  "/create-video",
  "/profile",
  "/plans",
  "/admin",
  "/integrations",
];

function App() {
  const currentPath = window.location.pathname;
  const showSidebar = routesWithSidebar.includes(currentPath) || 
                      routesWithSidebar.some(route => currentPath.startsWith(route + "/"));

  return (
    <Router>
      <div className="flex h-screen overflow-hidden">
        {showSidebar && (
          <Sidebar>
            <SidebarHeader>
              <div className="text-2xl font-bold">GLIVE</div>
            </SidebarHeader>
            <SidebarContent>
              <Navigation />
            </SidebarContent>
            <SidebarFooter>
              <ProfileSection />
            </SidebarFooter>
          </Sidebar>
        )}

        <main className="flex-1 overflow-y-auto bg-background">
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth/*" element={<Auth />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            
            {/* Public form and payment routes */}
            <Route path="/form/:formId" element={<FormSubmission />} />
            <Route path="/form-success" element={<FormSuccess />} />
            <Route path="/payment-link/:paymentId" element={<PaymentLink />} />
            
            {/* Private routes */}
            <Route path="/dashboard" element={<PrivateRoute element={<Index />} />} />
            <Route path="/explore" element={<PrivateRoute element={<Explore />} />} />
            <Route path="/product-shoot" element={<PrivateRoute element={<ProductShoot />} />} />
            <Route path="/product-shoot-v2" element={<PrivateRoute element={<ProductShootV2 />} />} />
            <Route path="/product-ad" element={<PrivateRoute element={<ProductAd />} />} />
            <Route path="/image-to-video" element={<PrivateRoute element={<ImageToVideo />} />} />
            <Route path="/ai-agent" element={<PrivateRoute element={<AIAgent />} />} />
            <Route path="/create-video" element={<PrivateRoute element={<CreateVideo />} />} />
            <Route path="/profile" element={<PrivateRoute element={<ProfileSettings />} />} />
            <Route path="/plans" element={<PrivateRoute element={<Plans />} />} />
            <Route path="/payment" element={<PrivateRoute element={<Payment />} />} />
            <Route path="/payment/success" element={<PrivateRoute element={<PaymentSuccess />} />} />
            <Route path="/payment/failure" element={<PrivateRoute element={<PaymentFailure />} />} />
            <Route path="/payment/cancel" element={<PrivateRoute element={<PaymentCancel />} />} />
            <Route path="/integrations" element={<PrivateRoute element={<Integrations />} />} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={<Admin />} />
            
            {/* Public information pages */}
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/about" element={<AboutUs />} />
            <Route path="/contact" element={<Contact />} />
          </Routes>
        </main>

        {showSidebar && <BottomNav />}
      </div>
      <Toaster position="top-right" />
    </Router>
  );
}

export default App;
