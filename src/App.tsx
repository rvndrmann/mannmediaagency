
import React from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
} from "react-router-dom";
import { Layout } from "@/components/Layout";
import { MCPProvider } from "./contexts/MCPContext";
import { ProjectProvider } from "@/hooks/multi-agent/project-context";

// Import pages
import Index from "./pages/Index";
import ProductShot from "./pages/ProductShot";
import Canvas from "./pages/Canvas";
import Explore from "./pages/Explore";
import MultiAgentChat from "./pages/MultiAgentChat";
import AuthCallback from "./components/auth/AuthCallback";
import LoginForm from "./components/auth/LoginForm";
import SignupForm from "./components/auth/SignupForm";

/**
 * Main application component defining the routing structure
 */
const App: React.FC = () => {
  return (
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
                  <div className="p-8">
                    <h1 className="text-3xl font-bold mb-4">Pricing Plans</h1>
                    <p>Choose your plan</p>
                  </div>
                </Layout>
              }
            />
            <Route
              path="/image-to-video"
              element={
                <Layout>
                  <div className="p-8">
                    <h1 className="text-3xl font-bold mb-4">Image to Video</h1>
                    <p>Convert your images to videos</p>
                  </div>
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
              path="/product-shot"
              element={
                <Layout>
                  <ProductShot />
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
  );
};

export default App;
