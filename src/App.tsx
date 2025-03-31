
import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import MultiAgentChat from "./pages/MultiAgentChat";
import Index from "./pages/Index";
import { MCPProvider } from "./contexts/MCPContext";

function App() {
  return (
    <MCPProvider>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/multi-agent-chat" element={<MultiAgentChat />} />
        {/* Add other routes as needed */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster position="top-right" />
    </MCPProvider>
  );
}

export default App;
