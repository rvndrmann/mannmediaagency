
import { toast } from "sonner";
import type { ExternalToast } from "sonner";

// Define toast types for different purposes
type ToastType = 'success' | 'error' | 'info' | 'warning';

// Custom toast options for different types
const toastOptions: Record<ToastType, ExternalToast> = {
  success: { duration: 3000 },
  error: { duration: 5000 },
  info: { duration: 3000 },
  warning: { duration: 4000 }
};

// Toast utility functions
export const showToast = {
  success: (message: string, options?: ExternalToast) => {
    toast.success(message, { ...toastOptions.success, ...options });
  },
  
  error: (message: string, options?: ExternalToast) => {
    console.error('Toast error:', message);
    toast.error(message, { ...toastOptions.error, ...options });
  },
  
  info: (message: string, options?: ExternalToast) => {
    toast.info(message, { ...toastOptions.info, ...options });
  },
  
  warning: (message: string, options?: ExternalToast) => {
    toast.warning(message, { ...toastOptions.warning, ...options });
  },
  
  // Special case for connection errors
  connectionError: (message: string, options?: ExternalToast) => {
    console.error('Connection error:', message);
    toast.error(`Connection error: ${message}`, { 
      ...toastOptions.error, 
      ...options, 
      duration: 6000 
    });
  },
  
  // For agent transitions
  agentSwitch: (from: string, to: string, options?: ExternalToast) => {
    toast.info(`Switched from ${from} to ${to} agent`, { 
      ...toastOptions.info, 
      ...options 
    });
  },
  
  // Specifically for MCP-related messages
  mcp: {
    success: (message: string, options?: ExternalToast) => {
      toast.success(`MCP: ${message}`, { ...toastOptions.success, ...options });
    },
    
    error: (message: string, options?: ExternalToast) => {
      console.error('MCP error:', message);
      toast.error(`MCP error: ${message}`, { 
        ...toastOptions.error, 
        ...options, 
        duration: 6000 
      });
    },
    
    info: (message: string, options?: ExternalToast) => {
      toast.info(`MCP: ${message}`, { ...toastOptions.info, ...options });
    }
  }
};
