import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import MultiAgentChat from "./pages/MultiAgentChat";
import Index from "./pages/Index";
import { MCPProvider } from "./contexts/MCPContext";
import Canvas from "./pages/Canvas";
import ProductShot from "./pages/ProductShot";
import ProductShootV2 from "./pages/ProductShootV2";
import ImageToVideo from "./pages/ImageToVideo";
import BrowserUse from "./pages/BrowserUse";
import TraceAnalytics from "./pages/TraceAnalytics";
import CustomOrders from "./pages/CustomOrders";
import NotFound from "./pages/NotFound";
import { ProjectProvider } from "./hooks/multi-agent/project-context";
import "./hooks/multi-agent/init"; // Import to auto-initialize the multi-agent system

function App() {
  return (
    <MCPProvider>
      <Routes>
        {/* Main routes */}
        <Route path="/" element={<Index />} />
        <Route path="/dashboard" element={<Index />} />
        <Route path="/multi-agent-chat" element={<MultiAgentChat />} />
        <Route 
          path="/canvas" 
          element={
            <ProjectProvider>
              <Canvas />
            </ProjectProvider>
          } 
        />
        <Route path="/product-shoot" element={<ProductShot />} />
        <Route path="/product-shoot-v2" element={<ProductShootV2 />} />
        <Route path="/image-to-video" element={<ImageToVideo />} />
        <Route path="/browser-use" element={<BrowserUse />} />
        <Route path="/trace-analytics" element={<TraceAnalytics />} />
        <Route path="/custom-orders" element={<CustomOrders />} />
        
        {/* Fallback route for 404 */}
        <Route path="/not-found" element={<NotFound />} />
        <Route path="*" element={<Navigate to="/not-found" replace />} />
      </Routes>
      <Toaster position="top-right" />
    </MCPProvider>
  );
}

export default App;
