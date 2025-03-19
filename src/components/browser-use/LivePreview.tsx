
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Maximize2, Minimize2, ExternalLink, RefreshCw, PlayCircle } from "lucide-react";
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
  const [isVideo, setIsVideo] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempts, setLoadAttempts] = useState(0);
  
  // Log live URL changes to help with debugging
  useEffect(() => {
    console.log(`LivePreview: liveUrl changed to ${liveUrl}`);
    // Reset load attempts when URL changes
    setLoadAttempts(0);
    setLoadError(null);
  }, [liveUrl]);
  
  // Detect if the URL is for a recording (usually mp4 or webm)
  useEffect(() => {
    if (liveUrl) {
      const isVideoUrl = 
        liveUrl.endsWith('.mp4') || 
        liveUrl.endsWith('.webm') || 
        liveUrl.includes('recording') ||
        liveUrl.includes('media');
      
      setIsVideo(isVideoUrl);
      console.log(`URL type detection: ${liveUrl} is ${isVideoUrl ? 'video' : 'iframe'}`);
      
      // Auto-refresh iframe a few times when we first get a URL
      // This helps with cases where the preview might not be ready immediately
      if (!isVideoUrl && loadAttempts === 0) {
        const initialRefreshes = setInterval(() => {
          if (loadAttempts < 3) {
            console.log(`Auto-refreshing iframe (attempt ${loadAttempts + 1}/3)`);
            setRefreshKey(prev => prev + 1);
            setLoadAttempts(prev => prev + 1);
          } else {
            clearInterval(initialRefreshes);
          }
        }, 3000);
        
        return () => clearInterval(initialRefreshes);
      }
    } else {
      setIsVideo(false);
    }
  }, [liveUrl, loadAttempts]);
  
  // Add effect to handle iframe load events
  useEffect(() => {
    if (liveUrl) {
      setIsLoading(true);
      setLoadError(null);
    }
  }, [liveUrl, refreshKey]);
  
  const handleIframeLoad = () => {
    console.log("Iframe loaded successfully");
    setIsLoading(false);
    setLoadError(null);
  };
  
  const handleIframeError = () => {
    console.error("Failed to load iframe preview");
    setIsLoading(false);
    
    if (loadAttempts < 5) {
      // Only show error message after a few attempts
      setLoadError("Still initializing preview. Please wait or try refreshing.");
    } else {
      setLoadError("Failed to load preview. The browser session might not be accessible yet.");
      toast.error("Failed to load preview. Try refreshing in a moment.");
    }
  };
  
  const handleVideoError = () => {
    console.error("Video failed to load:", liveUrl);
    setLoadError("Video failed to load. The URL might be invalid or the video is not ready yet.");
    toast.error("Video failed to load. Please try refreshing in a moment.");
  };
  
  const refreshIframe = () => {
    if (!liveUrl) return;
    
    setIsLoading(true);
    setLoadError(null);
    setRefreshKey(prev => prev + 1);
    toast.info("Refreshing preview...");
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
            {isVideo ? "Session Recording" : "Live Preview"}
            {isLoading && <RefreshCw className="h-4 w-4 animate-spin ml-2" />}
          </CardTitle>
          <div className="flex gap-2">
            {liveUrl && (
              <Button 
                variant="outline" 
                size="icon"
                onClick={refreshIframe}
                disabled={isVideo}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              </Button>
            )}
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
            isVideo ? (
              <div className="w-full h-full flex items-center justify-center bg-gray-900">
                <video 
                  key={`video-${refreshKey}`}
                  src={liveUrl}
                  controls
                  autoPlay
                  className="w-full h-full max-h-[600px]"
                  style={{ height: isFullscreen ? iframeHeight : "auto" }}
                  onError={handleVideoError}
                >
                  Your browser does not support video playback.
                </video>
              </div>
            ) : (
              <div className="relative">
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900/30 z-10">
                    <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                  </div>
                )}
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
              </div>
            )
          ) : (
            <Alert className="m-4">
              <AlertDescription>
                {isRunning 
                  ? "Live preview is initializing. Please wait a moment..."
                  : "No preview available. Start a task to see the browser automation in real-time."}
              </AlertDescription>
            </Alert>
          )}
          
          {loadError && (
            <Alert className="m-4" variant="destructive">
              <AlertDescription>{loadError}</AlertDescription>
              <div className="mt-2 flex justify-end">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={refreshIframe}
                  disabled={isVideo}
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1" />
                  Refresh Preview
                </Button>
              </div>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
