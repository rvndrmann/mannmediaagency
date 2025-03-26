
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, ExternalLink, Monitor, Laptop, Camera } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";

interface BrowserViewProps {
  liveUrl: string | null;
  currentUrl: string | null;
  setCurrentUrl: (url: string) => void;
  screenshot: string | null;
  captureScreenshot: () => void;
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
  environment: 'browser' | 'desktop';
}

export function BrowserView({
  liveUrl,
  currentUrl,
  setCurrentUrl,
  screenshot,
  captureScreenshot,
  connectionStatus,
  environment
}: BrowserViewProps) {
  const [iframeLoading, setIframeLoading] = useState(true);
  const [iframeError, setIframeError] = useState<string | null>(null);
  const [showScreenshot, setShowScreenshot] = useState(false);

  // Reset iframe state when liveUrl changes
  useEffect(() => {
    if (liveUrl) {
      setIframeLoading(true);
      setIframeError(null);
    }
  }, [liveUrl]);

  const handleIframeLoad = () => {
    setIframeLoading(false);
  };

  const handleIframeError = () => {
    setIframeLoading(false);
    setIframeError("Failed to load live view. The session may have expired or the connection was lost.");
  };

  const toggleView = () => {
    setShowScreenshot(!showScreenshot);
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <CardTitle className="text-base font-medium flex items-center">
          {environment === 'browser' ? (
            <><Monitor className="mr-2 h-4 w-4" /> Browser View</>
          ) : (
            <><Laptop className="mr-2 h-4 w-4" /> Desktop View</>
          )}
          {environment === 'desktop' && (
            <Badge variant="outline" className="ml-2 text-xs font-normal">
              Desktop
            </Badge>
          )}
        </CardTitle>
        <div className="flex items-center gap-1">
          <div className={`h-2 w-2 rounded-full ${
            connectionStatus === 'connected' ? 'bg-green-500' :
            connectionStatus === 'connecting' ? 'bg-yellow-500' :
            connectionStatus === 'error' ? 'bg-red-500' : 'bg-gray-400'
          }`} />
          <span className="text-xs text-muted-foreground">
            {connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)}
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-0 overflow-hidden flex-grow">
        <div className="browser-view-container relative w-full h-full bg-gray-100 min-h-[300px]">
          {liveUrl && !showScreenshot ? (
            <div className="relative w-full h-full min-h-[300px]">
              {iframeLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
                  <div className="text-center">
                    <Skeleton className="h-[200px] w-full mb-2" />
                    <Skeleton className="h-4 w-3/4 mx-auto mb-2" />
                    <Skeleton className="h-4 w-1/2 mx-auto" />
                  </div>
                </div>
              )}
              
              <iframe 
                src={liveUrl} 
                className="w-full h-full min-h-[300px] border-0"
                onLoad={handleIframeLoad}
                onError={handleIframeError}
                title={environment === 'browser' ? "Browser Automation" : "Desktop Automation"}
              />
              
              {iframeError && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100/80 z-20">
                  <Alert variant="destructive" className="w-[90%] max-w-md">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    <AlertDescription>
                      {iframeError}
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </div>
          ) : screenshot && (showScreenshot || !liveUrl) ? (
            <div className="relative w-full h-full flex items-center justify-center">
              <img 
                src={screenshot} 
                alt="Browser Screenshot" 
                className="max-w-full max-h-full object-contain"
              />
            </div>
          ) : (
            <div className="h-full min-h-[300px] flex items-center justify-center">
              <div className="text-center p-4">
                <Monitor className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-muted-foreground mb-2">
                  No {environment === 'browser' ? 'browser' : 'desktop'} session active
                </p>
                <p className="text-xs text-muted-foreground">
                  Start a task to see the live view here
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <div className="p-3 border-t flex justify-between items-center">
        <div className="flex items-center gap-2">
          {currentUrl && (
            <div className="text-xs text-muted-foreground truncate max-w-[200px]">
              {currentUrl}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {liveUrl && screenshot && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={toggleView}
            >
              {showScreenshot ? <Monitor className="h-4 w-4 mr-2" /> : <Camera className="h-4 w-4 mr-2" />}
              {showScreenshot ? "Live View" : "Screenshot"}
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={captureScreenshot}
            disabled={connectionStatus !== 'connected'}
          >
            <Camera className="h-4 w-4 mr-2" />
            Capture
          </Button>
          
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
    </Card>
  );
}
