
import { useState, useEffect } from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    
    // Set initial value
    checkMobile();
    
    // Add event listener
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', checkMobile);
    } else {
      // Fallback for older browsers
      window.addEventListener('resize', checkMobile);
    }
    
    return () => {
      if (typeof mql.removeEventListener === 'function') {
        mql.removeEventListener('change', checkMobile);
      } else {
        window.removeEventListener('resize', checkMobile);
      }
    };
  }, []);

  return !!isMobile;
}
