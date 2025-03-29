
import { toast } from "sonner";

export const showToast = {
  success: (message: string) => {
    toast.success(message);
    console.log("Success toast:", message);
  },
  error: (message: string) => {
    toast.error(message);
    console.error("Error toast:", message);
  },
  info: (message: string) => {
    toast.info(message);
    console.log("Info toast:", message);
  },
  warning: (message: string) => {
    toast.warning(message);
    console.warn("Warning toast:", message);
  }
};
