
import { ManusComputerAgent } from "./ManusComputerAgent";
import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ExternalLink } from "lucide-react";

export function ComputerUseAgent() {
  const [supportsIframes, setSupportsIframes] = useState<boolean>(true);
  const [showFallbackMessage, setShowFallbackMessage] = useState<boolean>(false);
  
  useEffect(() => {
    // Check if browser supports iframe properly
    const testIframe = () => {
      try {
        const iframe = document.createElement('iframe');
        iframe.src = 'about:blank';
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
        
        if (!iframe.contentWindow) {
          setSupportsIframes(false);
        }
        
        // Clean up
        document.body.removeChild(iframe);
      } catch (error) {
        console.error('Error testing iframe support:', error);
        setSupportsIframes(false);
      }
    };
    
    testIframe();
    
    // Check for browser compatibility issues after a delay
    const fallbackTimer = setTimeout(() => {
      const container = document.querySelector('.browser-view-container');
      const iframe = document.querySelector('iframe[title="Browser View"]');
      
      if (!container || !iframe || iframe.clientWidth < 10) {
        setShowFallbackMessage(true);
      }
    }, 2000);
    
    return () => clearTimeout(fallbackTimer);
  }, []);
  
  if (!supportsIframes) {
    return (
      <div className="container mx-auto p-8">
        <Alert variant="destructive" className="mb-8">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle>Browser Compatibility Issue</AlertTitle>
          <AlertDescription>
            Your browser doesn't fully support the iframe functionality needed for the Computer Agent.
            Please try using a different browser like Chrome, Edge, or Firefox.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  return (
    <div className="relative">
      <ManusComputerAgent />
      
      {showFallbackMessage && (
        <div className="absolute top-4 right-4 max-w-md z-50">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Browser View Issue</AlertTitle>
            <AlertDescription>
              The browser view may not be displaying correctly. You can continue using the agent
              by opening sites in external tabs.
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2"
                onClick={() => setShowFallbackMessage(false)}
              >
                Dismiss
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
}
