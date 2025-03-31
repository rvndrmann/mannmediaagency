
import { Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import MultiAgentChat from "./pages/MultiAgentChat";
import { MCPProvider } from "./contexts/MCPContext";
import { ChatSessionProvider } from "./contexts/ChatSessionContext";

function App() {
  return (
    <ChatSessionProvider>
      <MCPProvider>
        <Routes>
          <Route path="/multi-agent-chat" element={<MultiAgentChat />} />
          {/* Add other routes as needed */}
        </Routes>
        <Toaster position="top-right" />
      </MCPProvider>
    </ChatSessionProvider>
  );
}

export default App;
