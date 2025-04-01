
import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Canvas from './pages/Canvas';
import { Layout } from './components/Layout';
import { ThemeProvider } from "@/components/theme-provider"
import { ProjectProvider } from '@/hooks/multi-agent/project-context';
import { ChatSessionProvider } from '@/contexts/ChatSessionContext';
import { MCPProvider } from '@/contexts/MCPContext';
import { Toaster } from "@/components/ui/toaster"
import MultiAgentChatPage from "./pages/MultiAgentChatPage";

function App() {
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  
  return (
    <div className="App">
      <ThemeProvider defaultTheme="system" storageKey="vite-react-theme">
        <ProjectProvider>
          <ChatSessionProvider>
            <MCPProvider>
              <Routes>
                <Route path="/" element={<Layout><div>Home Page</div></Layout>} />
                <Route path="/canvas" element={<Canvas />} />
                <Route path="/multi-agent-chat" element={<MultiAgentChatPage />} />
              </Routes>
              <Toaster />
            </MCPProvider>
          </ChatSessionProvider>
        </ProjectProvider>
      </ThemeProvider>
    </div>
  );
}

export default App;
