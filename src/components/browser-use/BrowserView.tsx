
import { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LivePreview } from "./LivePreview";
import { Loader2, Camera, ExternalLink, Globe } from "lucide-react";
import { ConnectionStatus } from '@/hooks/browser-use/types';

interface BrowserViewProps {
  liveUrl: string | null;
  currentUrl: string | null;
  setCurrentUrl: (url: string) => void;
  screenshot: string | null;
  captureScreenshot: () => Promise<string>;
  connectionStatus: ConnectionStatus;
}

export function BrowserView({
  liveUrl,
  currentUrl,
  setCurrentUrl,
  screenshot,
  captureScreenshot,
  connectionStatus
}: BrowserViewProps) {
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [isCapturingScreenshot, setIsCapturingScreenshot] = useState(false);
  
  // Load screenshot from localStorage on mount
  useEffect(() => {
    const savedScreenshot = localStorage.getItem('workerAI_lastScreenshot');
    if (savedScreenshot) {
      setScreenshotUrl(savedScreenshot);
    }
  }, []);
  
  // Update screenshot URL when the screenshot prop changes
  useEffect(() => {
    if (screenshot) {
      setScreenshotUrl(screenshot);
      localStorage.setItem('workerAI_lastScreenshot', screenshot);
    }
  }, [screenshot]);
  
  // Handle screenshot capture
  const handleCaptureScreenshot = async () => {
    if (!liveUrl || connectionStatus !== 'connected') return;
    
    setIsCapturingScreenshot(true);
    
    try {
      const result = await captureScreenshot();
      console.log('Screenshot result:', result);
    } catch (error) {
      console.error('Error capturing screenshot:', error);
    } finally {
      setIsCapturingScreenshot(false);
    }
  };
  
  // Determine the content to display
  const renderContent = () => {
    if (liveUrl && connectionStatus === 'connected') {
      return <LivePreview url={liveUrl} />;
    }
    
    if (screenshotUrl) {
      return (
        <div className="p-4">
          <p className="text-sm text-muted-foreground mb-2">Last screenshot:</p>
          <img 
            src={screenshotUrl} 
            alt="Browser screenshot" 
            className="w-full h-auto rounded-md border border-gray-200 shadow-sm" 
          />
        </div>
      );
    }
    
    // Default disconnected state
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <Globe className="h-12 w-12 text-muted-foreground mb-4 opacity-30" />
        <h3 className="text-lg font-medium mb-2">No active browser session</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Start a task to launch a browser session.
        </p>
      </div>
    );
  };
  
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-none">
        <div className="flex items-center justify-between">
          <CardTitle>Browser View</CardTitle>
          
          {liveUrl && (
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleCaptureScreenshot}
                disabled={isCapturingScreenshot || connectionStatus !== 'connected'}
              >
                {isCapturingScreenshot ? 
                  <Loader2 className="h-4 w-4 animate-spin mr-1" /> : 
                  <Camera className="h-4 w-4 mr-1" />
                }
                Capture
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                asChild
              >
                <a 
                  href={liveUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>Open</span>
                </a>
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-[calc(100vh-370px)] md:h-[450px]">
          {renderContent()}
        </ScrollArea>
      </CardContent>
      
      <CardFooter className="flex-none">
        <div className="w-full flex items-center gap-2">
          <Input
            placeholder="Current URL"
            value={currentUrl || ''}
            onChange={(e) => setCurrentUrl(e.target.value)}
            disabled={connectionStatus !== 'connected'}
            className="flex-1"
          />
          <div className="flex items-center justify-center w-3 h-3 rounded-full">
            {connectionStatus === 'connected' ? (
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
            ) : connectionStatus === 'connecting' ? (
              <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div>
            ) : (
              <div className="w-2 h-2 rounded-full bg-gray-300"></div>
            )}
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
