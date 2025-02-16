
import { cn } from "@/lib/utils";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GalleryPanelProps {
  isMobile: boolean;
  videos: any[];
  isLoading: boolean;
  onDownload: (url: string) => void;
}

export function GalleryPanel({
  isMobile,
  videos,
  isLoading,
  onDownload,
}: GalleryPanelProps) {
  return (
    <div className={cn(
      "bg-gray-900 p-6",
      isMobile ? "w-full" : "flex-1 overflow-y-auto"
    )}>
      {isLoading ? (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </div>
      ) : videos?.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-gray-500">
          <p>No videos generated yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map((video) => (
            <div key={video.id} className="relative group">
              {video.status === 'processing' ? (
                <div className="aspect-video bg-gray-800 rounded-lg flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                </div>
              ) : video.status === 'completed' && video.result_url ? (
                <div className="relative aspect-video bg-gray-800 rounded-lg overflow-hidden">
                  <video
                    src={video.result_url}
                    className="w-full h-full object-cover"
                    controls
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white hover:text-purple-400"
                      onClick={() => onDownload(video.result_url)}
                    >
                      <Download className="h-6 w-6" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="aspect-video bg-gray-800 rounded-lg flex items-center justify-center text-red-500">
                  Generation failed
                </div>
              )}
              <div className="mt-2 text-sm text-gray-400 truncate">{video.prompt}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
