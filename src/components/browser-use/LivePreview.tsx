
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Loader2, WifiOff, RefreshCw, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useEffect, useState } from "react";

interface LivePreviewProps {
  liveUrl: string | null;
  isRunning: boolean;
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error'; 
}

export function LivePreview({ liveUrl, isRunning, connectionStatus }: LivePreviewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [showFallback, setShowFallback] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  // Reset loading state when URL changes
  useEffect(() => {
    if (liveUrl) {
      setIsLoading(true);
      setShowFallback(false);
      setLoadError(null);
      
      // Set a timeout to show fallback UI if iframe takes too long to load
      const timeout = setTimeout(() => {
        if (isLoading) {
          setShowFallback(true);
        }
      }, 10000);
      
      return () => clearTimeout(timeout);
    }
  }, [liveUrl]);

  const handleIframeLoad = () => {
    setIsLoading(false);
    setShowFallback(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setLoadError("Failed to load preview");
    setShowFallback(true);
  };
  
  const renderConnectionStatus = () => {
    switch (connectionStatus) {
      case 'connected':
        return (
          <div className="flex items-center text-green-500">
            <CheckCircle className="w-4 h-4 mr-1" />
            <span className="text-xs">Connected</span>
          </div>
        );
      case 'connecting':
        return (
          <div className="flex items-center text-amber-500">
            <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
            <span className="text-xs">Connecting...</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center text-red-500">
            <AlertCircle className="w-4 h-4 mr-1" />
            <span className="text-xs">Connection error</span>
          </div>
        );
      case 'disconnected':
      default:
        return (
          <div className="flex items-center text-muted-foreground">
            <WifiOff className="w-4 h-4 mr-1" />
            <span className="text-xs">Disconnected</span>
          </div>
        );
    }
  };

  const isVideo = liveUrl?.endsWith('.mp4') || liveUrl?.endsWith('.webm') || liveUrl?.includes('recording');
  
  return (
    <Card className="col-span-1">
      <CardHeader className="px-6 py-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            {isVideo ? "Recording" : "Live Preview"}
          </CardTitle>
          {renderConnectionStatus()}
        </div>
      </CardHeader>
      <CardContent className="p-0 overflow-hidden">
        <div className="relative w-full bg-gray-900 min-h-[400px]">
          {!liveUrl && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              {isRunning ? (
                <>
                  <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
                  <h3 className="text-lg font-medium mb-2">Connecting to browser...</h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    A live preview will appear here once the browser is ready.
                    This may take up to 30 seconds.
                  </p>
                </>
              ) : (
                <>
                  <WifiOff className="w-10 h-10 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No active session</h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Start a new task to see a live preview of the browser here.
                  </p>
                </>
              )}
            </div>
          )}

          {liveUrl && isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
              <div className="flex flex-col items-center">
                <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
                <p className="text-sm text-center">
                  {isVideo ? "Loading recording..." : "Loading live preview..."}
                </p>
              </div>
            </div>
          )}

          {liveUrl && showFallback && loadError && (
            <Alert variant="destructive" className="m-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {loadError}
                <div className="mt-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => window.open(liveUrl, '_blank')}
                  >
                    Open in new tab
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {liveUrl && isVideo ? (
            <video
              key={liveUrl}
              className="w-full h-full"
              controls
              autoPlay
              loop
              onLoadedData={handleIframeLoad}
              onError={handleIframeError}
              style={{ display: isLoading ? 'none' : 'block' }}
            >
              <source src={liveUrl} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          ) : liveUrl ? (
            <iframe
              key={liveUrl}
              src={liveUrl}
              className="w-full h-[600px] border-none"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              style={{ display: isLoading ? 'none' : 'block' }}
            />
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
