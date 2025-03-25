import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import './index.css';
import { Toaster } from './components/ui/toaster';
import { Toaster as SonnerToaster } from './components/ui/sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Import all page components
import Index from './pages/Index';
import Auth from './pages/Auth';
import MultiAgentChatPage from './pages/MultiAgentChat';
import TraceAnalyticsPage from './pages/TraceAnalytics';

// Create a client for React Query
const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />}>
            <Route index element={<Index />} />
            <Route path="login" element={<Auth />} />
            <Route path="signup" element={<Auth mode="signup" />} />
            <Route path="multi-agent-chat" element={<MultiAgentChatPage />} />
            <Route path="trace-analytics" element={<TraceAnalyticsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster />
      <SonnerToaster position="top-right" />
    </QueryClientProvider>
  </React.StrictMode>
);
