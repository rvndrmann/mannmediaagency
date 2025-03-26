
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, ExternalLink, Monitor, Laptop } from "lucide-react";

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
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <CardTitle className="text-base font-medium flex items-center">
          {environment === 'browser' ? (
            <><Monitor className="mr-2 h-4 w-4" /> Browser View</>
          ) : (
            <><Laptop className="mr-2 h-4 w-4" /> Desktop View</>
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
      <CardContent className="p-0 overflow-hidden">
        <div className="browser-view-container relative w-full bg-gray-100 min-h-[300px]">
          {liveUrl ? (
            <div className="relative w-full h-full">
              <iframe 
                src={liveUrl} 
                className="w-full min-h-[300px] border-0"
                title={`${environment === 'browser' ? 'Browser' : 'Desktop'} Automation`}
              />
              <div className="absolute top-2 right-2 z-10">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="bg-white opacity-80 hover:opacity-100"
                  onClick={() => window.open(liveUrl, '_blank')}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  <span className="text-xs">Open</span>
                </Button>
              </div>
            </div>
          ) : connectionStatus === 'connecting' ? (
            <div className="flex flex-col items-center justify-center h-full p-6">
              <Skeleton className="h-[200px] w-full" />
              <div className="mt-4 text-center">
                <p className="text-sm text-muted-foreground animate-pulse">
                  Connecting to {environment === 'browser' ? 'browser' : 'desktop'} session...
                </p>
              </div>
            </div>
          ) : screenshot ? (
            <div className="relative">
              <img 
                src={screenshot} 
                alt="Screenshot" 
                className="w-full object-contain"
              />
              <div className="absolute top-2 right-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={captureScreenshot}
                  className="bg-white opacity-80 hover:opacity-100"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  <span className="text-xs">Refresh</span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[300px] p-6">
              <div className="text-center opacity-70">
                {environment === 'browser' ? (
                  <Monitor className="mx-auto h-16 w-16 mb-4 text-gray-400" />
                ) : (
                  <Laptop className="mx-auto h-16 w-16 mb-4 text-gray-400" />
                )}
                <p className="text-sm text-muted-foreground">
                  {environment === 'browser' 
                    ? 'Browser automation view will appear here when a task is running'
                    : 'Desktop automation view will appear here when a task is running'}
                </p>
                {connectionStatus === 'error' && (
                  <p className="mt-2 text-sm text-red-500">
                    Connection error. Please restart the task.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
