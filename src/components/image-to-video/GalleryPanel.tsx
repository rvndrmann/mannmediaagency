
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Loader2, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Video {
  id: string;
  prompt: string;
  result_url?: string | null;
  status: string;
  aspect_ratio?: string;
}

interface GalleryPanelProps {
  isMobile: boolean;
  videos: Video[];
  isLoading: boolean;
  onDownload: (url: string) => void;
}

export function GalleryPanel({
  isMobile,
  videos,
  isLoading,
  onDownload,
}: GalleryPanelProps) {
  // Helper function to get CSS class based on aspect ratio
  const getAspectRatioClass = (aspectRatio?: string) => {
    if (!aspectRatio) return "aspect-video"; // Default fallback
    
    switch (aspectRatio) {
      case "9:16":
        return "aspect-[9/16]";
      case "16:9":
        return "aspect-[16/9]";
      case "1:1":
        return "aspect-square";
      default:
        return "aspect-video"; // Default fallback
    }
  };

  return (
    <div className={cn(
      "bg-background w-full",
      isMobile ? "flex-1 min-h-0" : "flex-1"
    )}>
      <ScrollArea className={cn(
        "w-full",
        isMobile ? "h-[calc(100vh-16rem)]" : "h-[calc(100vh-3rem)]"
      )}>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-4">
          {isLoading ? (
            <div className="col-span-2 md:col-span-3 flex items-center justify-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            </div>
          ) : !videos || videos.length === 0 ? (
            <Card className="col-span-2 md:col-span-3 p-4 text-center bg-gray-900 border-gray-700">
              <ImageIcon className="h-8 w-8 mx-auto text-gray-600 mb-2" />
              <p className="text-gray-400">No videos generated yet</p>
            </Card>
          ) : (
            videos.map((video) => (
              <Card 
                key={video.id}
                className="p-2 bg-gray-900 border-gray-700 animate-fade-in w-full"
              >
                <div className="space-y-2">
                  {video.status === 'processing' || video.status === 'in_queue' ? (
                    <div className="flex flex-col items-center justify-center h-32 bg-gray-800 rounded-lg">
                      <Loader2 className="h-6 w-6 animate-spin text-purple-600 mb-2" />
                      <p className="text-xs text-gray-400">Processing...</p>
                    </div>
                  ) : video.status === 'failed' ? (
                    <div className="flex flex-col items-center justify-center h-32 bg-gray-800 rounded-lg">
                      <ImageIcon className="h-6 w-6 text-red-500 mb-2" />
                      <p className="text-xs text-red-400">Failed</p>
                    </div>
                  ) : video.result_url ? (
                    <div className="relative group">
                      <video
                        src={video.result_url}
                        className={cn(
                          "w-full rounded-lg object-contain bg-black mx-auto", 
                          getAspectRatioClass(video.aspect_ratio)
                        )}
                        controls
                        playsInline
                        preload="metadata"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDownload(video.result_url!)}
                          className="text-white hover:text-purple-400"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-32 bg-gray-800 rounded-lg">
                      <ImageIcon className="h-6 w-6 text-gray-600 mb-2" />
                      <p className="text-xs text-gray-400">Not available</p>
                    </div>
                  )}
                  <p className="text-xs text-gray-400 line-clamp-2 px-1">
                    {video.prompt}
                  </p>
                </div>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
