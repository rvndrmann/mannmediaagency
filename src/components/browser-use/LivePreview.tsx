
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, ExternalLink, RefreshCw } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface LivePreviewProps {
  liveUrl: string | null;
  isRunning: boolean;
}

export function LivePreview({ liveUrl, isRunning }: LivePreviewProps) {
  const [showPreview, setShowPreview] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Reset fullscreen state when live URL changes
  useEffect(() => {
    setIsFullscreen(false);
  }, [liveUrl]);
  
  if (!liveUrl || !isRunning) {
    return null;
  }
  
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };
  
  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-background/80 backdrop-blur-sm' : 'relative w-full'}`}>
      <Card className={`${isFullscreen ? 'absolute inset-5 overflow-hidden' : 'w-full h-full border rounded-md'}`}>
        <div className="p-2 border-b flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-2">
            <div className="flex items-center space-x-2">
              <Switch 
                id="show-preview" 
                checked={showPreview} 
                onCheckedChange={setShowPreview}
              />
              <Label htmlFor="show-preview">Show Live Preview</Label>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={toggleFullscreen}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => window.open(liveUrl, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in New Tab
            </Button>
          </div>
        </div>
        
        {showPreview ? (
          <div className={`w-full ${isFullscreen ? 'h-[calc(100%-44px)]' : 'h-[500px]'}`}>
            <iframe 
              src={liveUrl} 
              className="w-full h-full border-0" 
              title="Browser Use Live Preview"
              allow="camera; microphone; clipboard-read; clipboard-write" 
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-[200px] text-muted-foreground">
            <div className="text-center">
              <EyeOff className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p>Live preview is hidden</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowPreview(true)}
                className="mt-2"
              >
                <Eye className="h-4 w-4 mr-2" />
                Show Preview
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
