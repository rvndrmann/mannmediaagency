
import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LivePreviewProps {
  liveUrl: string | null;
  isRunning: boolean;
  connectionStatus?: 'connected' | 'connecting' | 'disconnected' | 'error';
}

export function LivePreview({ liveUrl, isRunning, connectionStatus = 'disconnected' }: LivePreviewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [lastLoadedUrl, setLastLoadedUrl] = useState<string | null>(null);
  
  // Force reload iframe when liveUrl changes
  useEffect(() => {
    if (liveUrl && liveUrl !== lastLoadedUrl) {
      console.log(`LivePreview: New URL detected: ${liveUrl}`);
      setIsLoading(true);
      setLoadError(null);
      setRefreshKey(prev => prev + 1);
      setLastLoadedUrl(liveUrl);
    }
  }, [liveUrl, lastLoadedUrl]);
  
  // Handle connection status changes
  useEffect(() => {
    if (connectionStatus === 'error' && isLoading) {
      setLoadError("Connection to browser failed. Please check settings or try again.");
      setIsLoading(false);
    }
  }, [connectionStatus, isLoading]);
  
  // Handle loading timeout
  useEffect(() => {
    if (!liveUrl || !isLoading) return;
    
    const timeoutId = setTimeout(() => {
      if (isLoading) {
        setLoadError("Preview loading timed out. The browser may still be initializing.");
        setIsLoading(false);
      }
    }, 30000); // 30 second timeout
    
    return () => clearTimeout(timeoutId);
  }, [liveUrl, isLoading]);
  
  const handleIframeLoad = () => {
    console.log("LivePreview: iframe loaded successfully");
    setIsLoading(false);
    setLoadError(null);
  };
  
  const handleIframeError = () => {
    console.error("LivePreview: iframe failed to load");
    setIsLoading(false);
    setLoadError("Failed to load preview. The browser might still be initializing.");
  };
  
  const handleRefresh = () => {
    if (!liveUrl) return;
    
    console.log("LivePreview: Manual refresh requested");
    setIsLoading(true);
    setLoadError(null);
    setRefreshKey(prev => prev + 1);
  };
  
  const isVideoUrl = liveUrl?.endsWith('.mp4') || liveUrl?.endsWith('.webm') || liveUrl?.includes('recording');
  
  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return "Browser connected";
      case 'connecting':
        return "Connecting to browser...";
      case 'disconnected':
        return "Browser disconnected";
      case 'error':
        return "Browser connection error";
      default:
        return "Browser status unknown";
    }
  };
  
  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return "text-green-500";
      case 'connecting':
        return "text-yellow-500";
      case 'disconnected':
        return "text-gray-500";
      case 'error':
        return "text-red-500";
      default:
        return "text-gray-500";
    }
  };
  
  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl">
            {isVideoUrl ? "Session Recording" : "Live Preview"}
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className={`text-sm ${getConnectionStatusColor()}`}>
              {getConnectionStatusText()}
            </span>
            {liveUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading || !liveUrl}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            )}
            {liveUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(liveUrl, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="browser-view-container min-h-[500px] relative">
        {!liveUrl && !isRunning && (
          <div className="flex flex-col items-center justify-center h-full min-h-[500px] bg-gray-50 dark:bg-gray-900 rounded-lg">
            <p className="text-muted-foreground">No active browser session</p>
            <p className="text-sm text-muted-foreground mt-2">
              Start a new task to see live preview
            </p>
          </div>
        )}
        
        {!liveUrl && isRunning && (
          <div className="flex flex-col items-center justify-center h-full min-h-[500px] bg-gray-50 dark:bg-gray-900 rounded-lg">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Initializing browser session...</p>
            <p className="text-sm text-muted-foreground mt-2">
              This may take a few moments
            </p>
          </div>
        )}
        
        {liveUrl && (
          <div className="relative w-full h-full min-h-[500px]">
            {isLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-lg z-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">
                  {isVideoUrl ? "Loading recording..." : "Loading live preview..."}
                </p>
              </div>
            )}
            
            {loadError && (
              <Alert variant="destructive" className="mb-4 absolute inset-x-0 top-0 z-20">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{loadError}</AlertDescription>
              </Alert>
            )}
            
            {isVideoUrl ? (
              <video
                key={refreshKey}
                controls
                autoPlay
                className="w-full h-full min-h-[500px] rounded-lg"
                onLoadStart={() => setIsLoading(true)}
                onLoadedData={() => setIsLoading(false)}
                onError={handleIframeError}
                src={liveUrl}
              />
            ) : (
              <iframe
                key={refreshKey}
                ref={iframeRef}
                src={liveUrl}
                className="w-full h-full min-h-[500px] rounded-lg bg-white"
                onLoad={handleIframeLoad}
                onError={handleIframeError}
                allow="fullscreen"
                sandbox="allow-same-origin allow-scripts allow-forms"
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
