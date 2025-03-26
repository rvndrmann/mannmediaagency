
import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { LivePreviewProps } from '@/hooks/browser-use/types';

export function LivePreview({ url }: LivePreviewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (url) {
      setIsLoading(true);
      setError(null);
    }
  }, [url]);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setError("Failed to load iframe content. The URL may be invalid or blocking iframe embedding.");
  };

  if (!url) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
        <p className="text-gray-500 dark:text-gray-400">No URL provided</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100/50 dark:bg-gray-800/50 z-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
          <div className="text-center p-4">
            <p className="text-red-500 mb-2">{error}</p>
            <p className="text-sm text-gray-500">URL: {url}</p>
          </div>
        </div>
      )}
      
      <iframe
        src={url}
        className="w-full h-full border-0"
        title="Browser Live Preview"
        onLoad={handleLoad}
        onError={handleError}
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
      />
    </div>
  );
}
