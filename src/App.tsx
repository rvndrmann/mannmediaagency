
import { Routes, Route, Navigate, useNavigate, useParams } from "react-router-dom";
import { Toaster } from "sonner";
import { VideoProjectPage } from "./pages/VideoProjectPage";
import Index from "./pages/Index";
import Explore from "./pages/Explore";
import { MCPProvider } from "./contexts/MCPContext";
import { CanvasMcpProvider } from "./contexts/CanvasMcpContext";
import Canvas from "./pages/Canvas";
import ProductShot from "./pages/ProductShot";
import ProductShootV2 from "./pages/ProductShootV2";
import ImageToVideo from "./pages/ImageToVideo";
import BrowserUse from "./pages/BrowserUse";
import TraceAnalytics from "./pages/TraceAnalytics";
import CustomOrders from "./pages/CustomOrders";
import NotFound from "./pages/NotFound";
import { ProjectProvider } from "@/hooks/multi-agent/project-context";
import "./hooks/multi-agent/init";
import LoginForm from "./components/auth/LoginForm";
import SignupForm from "./components/auth/SignupForm";
import AuthCallback from "./components/auth/AuthCallback";
import Admin from "./pages/Admin";
import AdminTaskManagement from "./pages/AdminTaskManagement";
import Plans from "./pages/Plans";
import Payment from "./pages/Payment";
import { useUser } from "./hooks/use-user";
import { ChatPage } from "./pages/ChatPage";
import CreateVideo from "./pages/CreateVideo";
import ProfileSettings from "./pages/ProfileSettings";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { Button } from "./components/ui/button";

// Helper component for protected admin routes
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAdmin, isLoading } = useUser();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    if (!user) {
      return <Navigate to="/auth/login" replace />;
    }
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p className="mb-8">You don't have permission to access this page.</p>
        <Button onClick={() => navigate("/")}>Return to Home</Button>
      </div>
    );
  }

  return <>{children}</>;
};

// Wrapper component to handle projectId extraction for MultiAgentChat route

function App() {
  return (
    <MCPProvider>
      <ProjectProvider>
        <Routes>
          {/* Main routes */}
          <Route path="/" element={<Index />} />
          <Route path="/dashboard" element={<Navigate to="/" replace />} />
          
          {/* Admin routes */}
          <Route path="/canvas" element={<AdminRoute><Canvas /></AdminRoute>} />
          <Route path="/canvas/:projectId" element={<AdminRoute><Canvas /></AdminRoute>} />
          <Route path="/product-shoot" element={<AdminRoute><ProductShot /></AdminRoute>} />
          <Route path="/product-shoot-v2" element={<AdminRoute><ProductShootV2 /></AdminRoute>} />
          <Route path="/image-to-video" element={<AdminRoute><ImageToVideo /></AdminRoute>} />
          <Route path="/browser-use" element={<AdminRoute><BrowserUse /></AdminRoute>} />
          <Route path="/trace-analytics" element={<AdminRoute><TraceAnalytics /></AdminRoute>} />
          <Route path="/video-projects" element={<AdminRoute><VideoProjectPage /></AdminRoute>} />
          <Route path="/video-projects/:projectId" element={<AdminRoute><VideoProjectPage /></AdminRoute>} />
          <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
          <Route path="/admin/tasks" element={<AdminRoute><AdminTaskManagement /></AdminRoute>} />

          {/* Public routes */}
          <Route path="/custom-orders" element={<CustomOrders />} />
          <Route path="/plans" element={<Plans />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/create-video" element={<ProtectedRoute><CreateVideo /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><ProfileSettings /></ProtectedRoute>} />
          <Route path="/chat" element={<ChatPage />} />

          {/* Auth routes */}
          <Route path="/auth/login" element={<LoginForm />} />
          <Route path="/auth/signup" element={<SignupForm />} />
          <Route path="/auth/callback" element={<AuthCallback />} />

          {/* Payment routes */}
          <Route path="/payment" element={<Payment />} />
          
          {/* Fallback routes */}
          <Route path="/not-found" element={<NotFound />} />
          <Route path="*" element={<Navigate to="/not-found" replace />} />
        </Routes>
        <Toaster position="top-right" closeButton />
      </ProjectProvider>
    </MCPProvider>
  );
}

export default App;
