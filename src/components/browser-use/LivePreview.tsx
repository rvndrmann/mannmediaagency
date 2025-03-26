
import React from 'react';
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { LivePreviewProps } from "@/hooks/browser-use/types";

export function LivePreview({ url }: LivePreviewProps) {
  const [isLoading, setIsLoading] = React.useState(true);

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  if (!url) {
    return (
      <Card className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900 border rounded-lg overflow-hidden">
        <div className="text-center p-8">
          <p className="text-muted-foreground">No live preview available</p>
          <p className="text-xs text-muted-foreground mt-2">Start a task to see live browser automation</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="w-full h-full flex flex-col border rounded-lg overflow-hidden relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50/90 dark:bg-gray-900/90 z-10">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
            <p className="text-sm font-medium">Loading live preview...</p>
          </div>
        </div>
      )}
      <iframe 
        src={url}
        className="w-full h-full flex-1 bg-white dark:bg-gray-900"
        onLoad={handleIframeLoad}
        title="Browser Automation Live Preview"
        sandbox="allow-same-origin allow-scripts allow-forms"
      />
    </Card>
  );
}
