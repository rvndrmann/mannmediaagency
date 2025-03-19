
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Maximize2, Minimize2, ExternalLink } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface LivePreviewProps {
  liveUrl: string | null;
  isRunning: boolean;
}

export function LivePreview({ liveUrl, isRunning }: LivePreviewProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  if (!liveUrl) {
    return null;
  }
  
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };
  
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
          </CardTitle>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="icon"
              onClick={toggleFullscreen}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => window.open(liveUrl, '_blank')}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-hidden">
          {liveUrl ? (
            <iframe 
              src={liveUrl}
              className="w-full border-0"
              style={{ height: iframeHeight }}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              title="Browser Automation Live Preview"
            />
          ) : (
            <Alert className="m-4">
              <AlertDescription>
                No live preview available. Start a task to see the browser automation in real-time.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
