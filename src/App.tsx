import { Routes, Route, Navigate, useNavigate, useParams } from "react-router-dom"; // Removed useLocation, Added useParams
import { Toaster } from "sonner";
import MultiAgentChat from "./pages/MultiAgentChat";
import { VideoProjectPage } from "./pages/VideoProjectPage";
import Index from "./pages/Index";
import { MCPProvider } from "./contexts/MCPContext";
import { CanvasMcpProvider } from "./contexts/CanvasMcpContext"; // Added import
import Canvas from "./pages/Canvas";
import ProductShot from "./pages/ProductShot";
import ProductShootV2 from "./pages/ProductShootV2";
import ImageToVideo from "./pages/ImageToVideo";
import BrowserUse from "./pages/BrowserUse";
import TraceAnalytics from "./pages/TraceAnalytics";
import CustomOrders from "./pages/CustomOrders";
import NotFound from "./pages/NotFound";
import { ProjectProvider } from "@/hooks/multi-agent/project-context";
import "./hooks/multi-agent/init"; // Import to auto-initialize the multi-agent system
import LoginForm from "./components/auth/LoginForm";
import SignupForm from "./components/auth/SignupForm";
import AuthCallback from "./components/auth/AuthCallback";
import Admin from "./pages/Admin"; // Import existing Admin page
import AdminTaskManagement from "./pages/AdminTaskManagement"; // Import the new Admin Task page
import Plans from "./pages/Plans"; // Import the Plans component
import Payment from "./pages/Payment"; // Import the Payment component
// import WorkerTasks from "./pages/WorkerTasks"; // Removed import
import { useAuth } from "./hooks/use-auth"; // Import useAuth hook
import { supabase } from "./integrations/supabase/client"; // Import supabase client
import { useEffect, useState } from "react"; // Import React hooks
import { Button } from "./components/ui/button"; // For potential access denied message

// Helper component for protected admin routes
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        // If no user is logged in after auth check, they are not admin
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      // Only proceed if we have a user object
      try {
        setLoading(true); // Ensure loading state is true while checking
        const { data, error } = await supabase.rpc('check_is_admin');
        if (error) {
          console.error("Error checking admin status:", error);
          setIsAdmin(false);
        } else {
          setIsAdmin(!!data); // Set admin status based on RPC result
        }
      } catch (error) {
        console.error("Error checking admin status:", error);
        setIsAdmin(false); // Assume not admin on error
      } finally {
        setLoading(false); // Set loading to false after check completes
      }
    };

    // Only run the check when auth loading is finished
    if (!authLoading) {
      checkAdminStatus();
    }
  }, [user, authLoading]); // Dependencies: user object and auth loading state

  // Show loading indicator while auth or admin check is in progress
  if (authLoading || loading) {
    // Optional: Add a more sophisticated loading spinner here
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  // If loading is finished and user is not admin (or not logged in), show access denied
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p className="mb-8">You don't have permission to access this page.</p>
        <Button onClick={() => navigate("/")}>Return to Home</Button>
      </div>
    );
  }

  // If loading is finished and user is admin, render the protected content
  return <>{children}</>;
};
// ProtectedRoute component removed as it's no longer used for this feature.
// If needed elsewhere, it can be kept or moved to a separate file.


// Wrapper component to handle projectId extraction for MultiAgentChat route
const MultiAgentChatPageWrapper = () => {
  const { projectId } = useParams<{ projectId: string }>();

  // Only render the chat interface if a project ID is present in the URL
  if (!projectId) {
    // Optional: Redirect to a project selection page or show a message
    // For now, returning null to prevent rendering without a required projectId.
    // Consider redirecting: return <Navigate to="/canvas" replace />;
    console.warn("Attempted to access multi-agent chat without a project ID.");
    return null;
  }

  return (
    <CanvasMcpProvider projectId={projectId}>
      <MultiAgentChat />
    </CanvasMcpProvider>
  );
};

function App() {
  return (
    <MCPProvider>
      <ProjectProvider>
        <Routes>
          {/* Main routes */}
          <Route path="/" element={<Index />} />
          <Route path="/dashboard" element={<Index />} />
          {/* Added optional projectId parameter */}
          <Route path="/multi-agent-chat/:projectId?" element={<MultiAgentChatPageWrapper />} />
          <Route path="/canvas" element={<Canvas />} />
          <Route path="/canvas/:projectId" element={<Canvas />} />
          <Route path="/product-shoot" element={<ProductShot />} />
          <Route path="/product-shoot-v2" element={<ProductShootV2 />} />
          <Route path="/image-to-video" element={<ImageToVideo />} />
          <Route path="/browser-use" element={<AdminRoute><BrowserUse /></AdminRoute>} />
          <Route path="/trace-analytics" element={<TraceAnalytics />} />
          <Route path="/custom-orders" element={<CustomOrders />} />
          <Route path="/video-projects" element={<VideoProjectPage />} />
          <Route path="/video-projects/:projectId" element={<VideoProjectPage />} />
          <Route path="/plans" element={<Plans />} /> {/* Add the route for the plans page */}

          {/* Admin routes */}
          <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
          <Route path="/admin/tasks" element={<AdminRoute><AdminTaskManagement /></AdminRoute>} />
{/* Worker routes (Removed) */}
{/* <Route path="/worker/tasks" element={<ProtectedRoute><WorkerTasks /></ProtectedRoute>} /> */}


          {/* Auth routes */}
          <Route path="/auth/login" element={<LoginForm />} />
          <Route path="/auth/signup" element={<SignupForm />} />
          <Route path="/auth/callback" element={<AuthCallback />} />

          {/* Payment routes */}
          <Route path="/payment" element={<Payment />} /> {/* Add the route for the payment page */}
          
          {/* Fallback route for 404 */}
          <Route path="/not-found" element={<NotFound />} />
          <Route path="*" element={<Navigate to="/not-found" replace />} />
        </Routes>
        <Toaster position="top-right" closeButton />
      </ProjectProvider>
    </MCPProvider>
  );
}

export default App;
