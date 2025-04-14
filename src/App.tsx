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
import { useUser } from "./hooks/use-user"; // Import useUser hook instead of useAuth
import { ChatPage } from "./pages/ChatPage"; // Import ChatPage component
import ProfileSettings from "./pages/ProfileSettings"; // Import ProfileSettings page
import ProtectedRoute from "./components/auth/ProtectedRoute"; // Import ProtectedRoute component
// import { supabase } from "./integrations/supabase/client"; // No longer needed here
import { useEffect, useState } from "react"; // Import React hooks (useState might not be needed anymore)
import { Button } from "./components/ui/button"; // For potential access denied message

// Helper component for protected admin routes
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  // Use useUser hook to get user, isAdmin status, and loading state
  const { user, isAdmin, isLoading } = useUser();
  const navigate = useNavigate();

  // Removed the useEffect and useState for local isAdmin/loading,
  // as we get this directly from the useUser hook now.

  // Show loading indicator while useUser is loading
  if (isLoading) {
    // Optional: Add a more sophisticated loading spinner here
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  // If loading is finished and user is not admin (or not logged in), show access denied
  // Also check if user exists, otherwise non-logged in users might see the denied message briefly
  if (!isAdmin) {
    // First, check if the user is logged in at all. If not, redirect to login.
    if (!user) {
      return <Navigate to="/auth/login" replace />;
    }
    // If the user is logged in but is not an admin, show the Access Denied message.
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
          {/* Added optional projectId parameter & AdminRoute */}
          <Route path="/multi-agent-chat/:projectId?" element={<AdminRoute><MultiAgentChatPageWrapper /></AdminRoute>} />
          <Route path="/canvas" element={<AdminRoute><Canvas /></AdminRoute>} />
          <Route path="/canvas/:projectId" element={<AdminRoute><Canvas /></AdminRoute>} />
          <Route path="/product-shoot" element={<AdminRoute><ProductShot /></AdminRoute>} />
          <Route path="/product-shoot-v2" element={<AdminRoute><ProductShootV2 /></AdminRoute>} />
          <Route path="/image-to-video" element={<AdminRoute><ImageToVideo /></AdminRoute>} />
          <Route path="/browser-use" element={<AdminRoute><BrowserUse /></AdminRoute>} />
          <Route path="/trace-analytics" element={<AdminRoute><TraceAnalytics /></AdminRoute>} />
          <Route path="/custom-orders" element={<CustomOrders />} /> {/* Public */}
          <Route path="/video-projects" element={<AdminRoute><VideoProjectPage /></AdminRoute>} />
          <Route path="/video-projects/:projectId" element={<AdminRoute><VideoProjectPage /></AdminRoute>} />
          <Route path="/plans" element={<Plans />} /> {/* Add the route for the plans page */}
          <Route path="/settings" element={<ProtectedRoute><ProfileSettings /></ProtectedRoute>} /> {/* Add the route for profile settings */}

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
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/not-found" element={<NotFound />} />
          <Route path="*" element={<Navigate to="/not-found" replace />} />
        </Routes>
        <Toaster position="top-right" closeButton />
      </ProjectProvider>
    </MCPProvider>
  );
}

export default App;
