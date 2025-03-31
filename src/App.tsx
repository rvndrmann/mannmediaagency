
import React from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
} from "react-router-dom";
import { Layout } from "@/components/Layout";
import { MCPProvider } from "./contexts/MCPContext";
import { ProjectProvider } from "./hooks/multi-agent/project-context.tsx";
import { ChatSessionProvider } from "./contexts/ChatSessionContext";

// Import pages
import Index from "./pages/Index";
import ProductShot from "./pages/ProductShot";
import Canvas from "./pages/Canvas";
import Explore from "./pages/Explore";
import MultiAgentChat from "./pages/MultiAgentChat";
import AuthCallback from "./components/auth/AuthCallback";
import LoginForm from "./components/auth/LoginForm";
import SignupForm from "./components/auth/SignupForm";
import ImageToVideo from "./pages/ImageToVideo";
import ProductShootV2 from "./pages/ProductShootV2";
import PricingPlan from "./pages/PricingPlan";
import CustomOrder from "./pages/CustomOrder";
import ProfilePage from "./pages/ProfilePage";

/**
 * Main application component defining the routing structure
 */
const App: React.FC = () => {
  return (
    <ChatSessionProvider>
      <MCPProvider>
        <ProjectProvider>
          <Router>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route
                path="/dashboard"
                element={
                  <Layout>
                    <div className="p-8">
                      <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
                      <p>Welcome to your dashboard</p>
                    </div>
                  </Layout>
                }
              />
              <Route
                path="/settings"
                element={
                  <Layout>
                    <div className="p-8">
                      <h1 className="text-3xl font-bold mb-4">Settings</h1>
                      <p>Manage your settings</p>
                    </div>
                  </Layout>
                }
              />
              <Route
                path="/plans"
                element={
                  <Layout>
                    <PricingPlan />
                  </Layout>
                }
              />
              <Route
                path="/image-to-video"
                element={
                  <Layout>
                    <ImageToVideo />
                  </Layout>
                }
              />
              <Route
                path="/video-creator"
                element={
                  <Layout>
                    <div className="p-8">
                      <h1 className="text-3xl font-bold mb-4">Video Creator</h1>
                      <p>Create your videos</p>
                    </div>
                  </Layout>
                }
              />
              <Route
                path="/ai-agent"
                element={
                  <Layout>
                    <div className="p-8">
                      <h1 className="text-3xl font-bold mb-4">AI Agent</h1>
                      <p>Interact with our AI agent</p>
                    </div>
                  </Layout>
                }
              />
              <Route
                path="/help"
                element={
                  <Layout>
                    <div className="p-8">
                      <h1 className="text-3xl font-bold mb-4">Help Center</h1>
                      <p>Get help and support</p>
                    </div>
                  </Layout>
                }
              />
              <Route path="/auth/login" element={<LoginForm />} />
              <Route path="/auth/signup" element={<SignupForm />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route
                path="/product-shoot"
                element={
                  <Layout>
                    <ProductShot />
                  </Layout>
                }
              />
              <Route
                path="/product-shoot-v2"
                element={
                  <Layout>
                    <ProductShootV2 />
                  </Layout>
                }
              />
              <Route
                path="/explore"
                element={
                  <Layout>
                    <Explore />
                  </Layout>
                }
              />
              <Route
                path="/multi-agent-chat"
                element={<MultiAgentChat />}
              />
              <Route
                path="/canvas"
                element={
                  <Layout>
                    <Canvas />
                  </Layout>
                }
              />
              <Route
                path="/custom-order"
                element={
                  <Layout>
                    <CustomOrder />
                  </Layout>
                }
              />
              <Route
                path="/profile"
                element={
                  <Layout>
                    <ProfilePage />
                  </Layout>
                }
              />
              <Route
                path="/browser-use"
                element={
                  <Layout>
                    <div className="p-8">
                      <h1 className="text-3xl font-bold mb-4">Browser Use</h1>
                      <p>Browser automation tools</p>
                    </div>
                  </Layout>
                }
              />
            </Routes>
          </Router>
        </ProjectProvider>
      </MCPProvider>
    </ChatSessionProvider>
  );
};

export default App;
