
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Maximize2, Minimize2, ExternalLink, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

interface LivePreviewProps {
  liveUrl: string | null;
  isRunning: boolean;
}

export function LivePreview({ liveUrl, isRunning }: LivePreviewProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Add effect to handle iframe load events
  useEffect(() => {
    setIsLoading(true);
  }, [liveUrl, refreshKey]);
  
  const handleIframeLoad = () => {
    setIsLoading(false);
  };
  
  const handleIframeError = () => {
    setIsLoading(false);
    toast.error("Failed to load live preview. It may still be initializing.");
  };
  
  const refreshIframe = () => {
    setIsLoading(true);
    setRefreshKey(prev => prev + 1);
    toast.info("Refreshing live preview...");
  };
  
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };
  
  // Don't return null if no liveUrl - still show the component with a message
  // This avoids layout shifts when the URL becomes available
  
  const fullscreenClass = isFullscreen 
    ? "fixed top-0 left-0 right-0 bottom-0 z-50 p-4 bg-background/90 backdrop-blur" 
    : "";
  
  const iframeHeight = isFullscreen ? "calc(100vh - 8rem)" : "600px";
  
  return (
    <div className={`${fullscreenClass} flex flex-col`}>
      <Card className={`w-full ${isFullscreen ? "h-full" : ""}`}>
        <CardHeader className="flex flex-row items-center justify-between p-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isRunning ? "bg-green-500" : "bg-gray-400"}`}></div>
            Live Preview
            {isLoading && <RefreshCw className="h-4 w-4 animate-spin ml-2" />}
          </CardTitle>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="icon"
              onClick={refreshIframe}
              disabled={!liveUrl}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
            <Button 
              variant="outline" 
              size="icon"
              onClick={toggleFullscreen}
              disabled={!liveUrl}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            {liveUrl && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => window.open(liveUrl, '_blank')}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-hidden">
          {liveUrl ? (
            <iframe 
              key={`iframe-${refreshKey}`}
              src={liveUrl}
              className="w-full border-0"
              style={{ height: iframeHeight }}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              title="Browser Automation Live Preview"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
            />
          ) : (
            <Alert className="m-4">
              <AlertDescription>
                {isRunning 
                  ? "Live preview is initializing. Please wait a moment..."
                  : "No live preview available. Start a task to see the browser automation in real-time."}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
