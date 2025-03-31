
import { useState, useEffect } from "react";

/**
 * Custom hook that detects if the current device is a mobile device
 * @returns {boolean} Whether the current device is a mobile device
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(false);
  
  useEffect(() => {
    const checkIsMobile = (): void => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Check initially
    checkIsMobile();
    
    // Listen for window resize events
    window.addEventListener("resize", checkIsMobile);
    
    // Clean up event listener on unmount
    return () => {
      window.removeEventListener("resize", checkIsMobile);
    };
  }, []);
  
  return isMobile;
}
