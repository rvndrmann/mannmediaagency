
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Copy, Check } from "lucide-react";

export interface ExploreVideoData {
  id: string;
  prompt: string;
  result_url: string | null;
}

interface VideoGridProps {
  items: ExploreVideoData[];
  onCopyPrompt: (id: string, prompt: string) => void;
  onDownload: (url: string, filename: string) => void;
  copiedPrompts: Record<string, boolean>;
}

const VideoGrid = ({ 
  items,
  onCopyPrompt,
  onDownload,
  copiedPrompts
}: VideoGridProps) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
      {items.map((video) => (
        <Card key={video.id} className="overflow-hidden bg-gray-900 border-gray-800">
          <div className="relative">
            {video.result_url && (
              <>
                <video
                  src={video.result_url}
                  className="w-full h-auto"
                  controls
                  preload="metadata"
                  controlsList="nodownload"
                  playsInline
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDownload(video.result_url!, `video-${video.id}.mp4`)}
                    className="text-white hover:text-purple-400"
                  >
                    <Download className="h-5 w-5" />
                  </Button>
                </div>
              </>
            )}
          </div>
          <div className="p-3 md:p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm text-gray-300 flex-1 line-clamp-2">{video.prompt}</p>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onCopyPrompt(video.id, video.prompt)}
                className="shrink-0"
              >
                {copiedPrompts[video.id] ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default VideoGrid;
