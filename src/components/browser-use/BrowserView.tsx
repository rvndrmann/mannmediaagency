
import React, { useState } from 'react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LivePreview } from "./LivePreview";
import { ConnectionStatus } from '@/hooks/browser-use/types';
import { 
  ExternalLink, 
  Camera, 
  RefreshCcw, 
  Loader2,
  Wifi, 
  WifiOff
} from 'lucide-react';

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
  const [inputUrl, setInputUrl] = useState("");
  const [isCapturing, setIsCapturing] = useState(false);
  
  const handleNavigate = () => {
    if (inputUrl.trim()) {
      let url = inputUrl.trim();
      
      // Add protocol if missing
      if (!/^https?:\/\//i.test(url)) {
        url = 'https://' + url;
      }
      
      setCurrentUrl(url);
      window.open(url, '_blank');
    }
  };
  
  const handleCaptureScreenshot = async () => {
    setIsCapturing(true);
    try {
      await captureScreenshot();
    } finally {
      setIsCapturing(false);
    }
  };
  
  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-500';
      case 'connecting': return 'text-amber-500';
      case 'error': return 'text-red-500';
      case 'retry': return 'text-amber-500';
      default: return 'text-gray-500';
    }
  };
  
  const getConnectionIcon = () => {
    if (connectionStatus === 'connected' || connectionStatus === 'connecting') {
      return <Wifi className={`h-4 w-4 ${getConnectionStatusColor()}`} />;
    }
    return <WifiOff className={`h-4 w-4 ${getConnectionStatusColor()}`} />;
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">Browser View</CardTitle>
          <Badge 
            variant="outline" 
            className={`flex items-center gap-1 ${getConnectionStatusColor()}`}
          >
            {getConnectionIcon()}
            <span className="capitalize">{connectionStatus}</span>
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="p-2 flex-1 overflow-hidden">
        <div className="bg-gray-50 dark:bg-gray-900 rounded-md h-full flex items-center justify-center overflow-hidden">
          {liveUrl ? (
            <div className="w-full h-full">
              <LivePreview url={liveUrl} />
            </div>
          ) : screenshot ? (
            <div className="w-full h-full flex items-center justify-center">
              <img 
                src={screenshot} 
                alt="Browser screenshot" 
                className="max-w-full max-h-full object-contain"
              />
            </div>
          ) : (
            <div className="text-center p-6">
              <p className="text-gray-500 mb-2">No content to display.</p>
              <p className="text-sm text-gray-400">
                Start a task or navigate to a URL to see content here.
              </p>
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="flex flex-col gap-2">
        <div className="flex w-full gap-2">
          <Input
            placeholder="Enter URL to navigate (e.g., google.com)"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleNavigate()}
          />
          <Button
            variant="outline"
            onClick={handleNavigate}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open
          </Button>
          <Button
            variant="outline"
            onClick={handleCaptureScreenshot}
            disabled={isCapturing}
          >
            {isCapturing ? 
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : 
              <Camera className="h-4 w-4 mr-2" />
            }
            Screenshot
          </Button>
        </div>
        
        {currentUrl && (
          <div className="text-xs text-muted-foreground flex justify-between w-full">
            <span>Current URL: {currentUrl}</span>
            {connectionStatus === 'connected' && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-4 w-4 p-0" 
                onClick={handleCaptureScreenshot}
              >
                <RefreshCcw className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
