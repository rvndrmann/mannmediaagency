
import React from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
} from "react-router-dom";
import { Layout } from "@/components/Layout";

import Index from "./pages/Index";
import ProductShot from "./pages/ProductShot";
import Canvas from "./pages/Canvas";
import Explore from "./pages/Explore";
import MultiAgentChat from "./pages/MultiAgentChat";
import { MCPProvider } from "./contexts/MCPContext";

/**
 * Main application component defining the routing structure
 */
const App: React.FC = () => {
  return (
    <MCPProvider>
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
          <Route
            path="/auth/login"
            element={
              <div className="min-h-screen flex items-center justify-center bg-gray-900">
                <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full">
                  <h1 className="text-2xl font-bold text-white mb-6 text-center">Login</h1>
                  <p className="text-gray-300 mb-4 text-center">Sign in to your account</p>
                </div>
              </div>
            }
          />
          <Route
            path="/auth/register"
            element={
              <div className="min-h-screen flex items-center justify-center bg-gray-900">
                <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full">
                  <h1 className="text-2xl font-bold text-white mb-6 text-center">Register</h1>
                  <p className="text-gray-300 mb-4 text-center">Create a new account</p>
                </div>
              </div>
            }
          />
          <Route
            path="/auth/forgot-password"
            element={
              <div className="min-h-screen flex items-center justify-center bg-gray-900">
                <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full">
                  <h1 className="text-2xl font-bold text-white mb-6 text-center">Forgot Password</h1>
                  <p className="text-gray-300 mb-4 text-center">Reset your password</p>
                </div>
              </div>
            }
          />
          <Route
            path="/auth/reset-password"
            element={
              <div className="min-h-screen flex items-center justify-center bg-gray-900">
                <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full">
                  <h1 className="text-2xl font-bold text-white mb-6 text-center">Reset Password</h1>
                  <p className="text-gray-300 mb-4 text-center">Create a new password</p>
                </div>
              </div>
            }
          />
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
        </Routes>
      </Router>
    </MCPProvider>
  );
};

export default App;
