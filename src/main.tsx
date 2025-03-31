
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/toaster'
import { ChatSessionProvider } from '@/contexts/ChatSessionContext'
import { BrowserRouter } from 'react-router-dom'

// Create a client for React Query with proper error handling and retry configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      meta: {
        onError: (error) => {
          console.error('Query error:', error);
        }
      }
    },
    mutations: {
      retry: 0,
      meta: {
        onError: (error) => {
          console.error('Mutation error:', error);
        }
      }
    }
  },
});

// Get root element and create root
const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Failed to find the root element");

// Create root and render app
createRoot(rootElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ChatSessionProvider>
          <App />
          <Toaster />
        </ChatSessionProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>
);
