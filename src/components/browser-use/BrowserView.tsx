
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, RefreshCw, Camera, Globe, AlertCircle } from "lucide-react";
import { BrowserTaskState } from "@/hooks/browser-use/types";

interface BrowserViewProps {
  liveUrl: string | null;
  currentUrl: string | null;
  setCurrentUrl: (url: string | null) => void;
  screenshot: string | null;
  captureScreenshot: () => Promise<string | null>;
  connectionStatus: BrowserTaskState["connectionStatus"];
}

export function BrowserView({
  liveUrl,
  currentUrl,
  setCurrentUrl,
  screenshot,
  captureScreenshot,
  connectionStatus
}: BrowserViewProps) {
  const isConnected = connectionStatus === "connected";
  const isConnecting = connectionStatus === "connecting";
  const isError = connectionStatus === "error";

  const handleCaptureScreenshot = async () => {
    await captureScreenshot();
  };

  const getStatusMessage = () => {
    switch (connectionStatus) {
      case "connected":
        return "Connected to browser";
      case "connecting":
        return "Connecting to browser...";
      case "error":
        return "Connection error";
      default:
        return "Not connected";
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case "connected":
        return "text-green-500";
      case "connecting":
        return "text-amber-500";
      case "error":
        return "text-red-500";
      default:
        return "text-gray-500";
    }
  };

  return (
    <Card className="flex flex-col h-full">
      <div className="p-4 border-b flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Browser View</h3>
          <div className={`flex items-center gap-2 text-sm ${getStatusColor()}`}>
            <span className={`h-2 w-2 rounded-full ${connectionStatus === "connected" ? "bg-green-500" : connectionStatus === "connecting" ? "bg-amber-500" : connectionStatus === "error" ? "bg-red-500" : "bg-gray-500"}`}></span>
            {getStatusMessage()}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <Input
            value={currentUrl || ""}
            onChange={(e) => setCurrentUrl(e.target.value)}
            placeholder="Current URL"
            readOnly
            className="flex-1"
          />
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={handleCaptureScreenshot}
            disabled={!isConnected}
            size="sm"
            variant="outline"
            className="flex items-center gap-2"
          >
            <Camera className="h-4 w-4" />
            <span>Capture Screenshot</span>
          </Button>
        </div>
      </div>

      <div className="flex-1 p-4 min-h-[300px] relative">
        {isConnecting && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
            <div className="flex flex-col items-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
              <span className="text-sm">Connecting to browser...</span>
            </div>
          </div>
        )}

        {isError && !liveUrl && !screenshot && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
            <div className="flex flex-col items-center text-center max-w-md">
              <AlertCircle className="h-8 w-8 text-destructive mb-2" />
              <span className="text-sm font-medium">Connection error</span>
              <p className="text-sm text-muted-foreground mt-1">
                Could not connect to the browser. The task may have expired or encountered an error.
              </p>
            </div>
          </div>
        )}

        <div className="h-full flex items-center justify-center">
          {liveUrl ? (
            <iframe
              src={liveUrl}
              className="w-full h-full border rounded"
              title="Browser View"
            ></iframe>
          ) : screenshot ? (
            <img
              src={screenshot}
              alt="Browser Screenshot"
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <div className="text-center text-muted-foreground">
              <Globe className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
              <p>No browser view available</p>
              <p className="text-sm mt-1">Start a task to see the browser view</p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
