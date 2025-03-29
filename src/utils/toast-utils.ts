
import { toast } from "sonner";

// Define our own toast options interface
interface ToastOptions {
  duration?: number;
  id?: string;
  icon?: React.ReactNode;
  description?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  cancel?: {
    label: string;
    onClick?: () => void;
  };
  onDismiss?: () => void;
  onAutoClose?: () => void;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';
  className?: string;
  style?: React.CSSProperties;
}

// Define toast types for different purposes
type ToastType = 'success' | 'error' | 'info' | 'warning';

// Custom toast options for different types
const toastOptions: Record<ToastType, ToastOptions> = {
  success: { duration: 3000 },
  error: { duration: 5000 },
  info: { duration: 3000 },
  warning: { duration: 4000 }
};

// Toast utility functions
export const showToast = {
  success: (message: string, options?: ToastOptions) => {
    toast.success(message, { ...toastOptions.success, ...options });
  },
  
  error: (message: string, options?: ToastOptions) => {
    console.error('Toast error:', message);
    toast.error(message, { ...toastOptions.error, ...options });
  },
  
  info: (message: string, options?: ToastOptions) => {
    toast.info(message, { ...toastOptions.info, ...options });
  },
  
  warning: (message: string, options?: ToastOptions) => {
    toast.warning(message, { ...toastOptions.warning, ...options });
  },
  
  // Special case for connection errors
  connectionError: (message: string, options?: ToastOptions) => {
    console.error('Connection error:', message);
    toast.error(`Connection error: ${message}`, { 
      ...toastOptions.error, 
      ...options, 
      duration: 6000 
    });
  },
  
  // For agent transitions
  agentSwitch: (from: string, to: string, options?: ToastOptions) => {
    toast.info(`Switched from ${from} to ${to} agent`, { 
      ...toastOptions.info, 
      ...options 
    });
  }
};
