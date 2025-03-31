
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/toaster'
import { ChatSessionProvider } from '@/contexts/ChatSessionContext'

// Create a client for React Query
const queryClient = new QueryClient();

// Get root element and create root
const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Failed to find the root element");

// Create root and render app
createRoot(rootElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ChatSessionProvider>
        <App />
        <Toaster />
      </ChatSessionProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
