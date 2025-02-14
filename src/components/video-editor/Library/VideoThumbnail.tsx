
import React from 'react';
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { VideoIcon } from "lucide-react";

interface VideoThumbnailProps {
  id: string;
  title: string;
  thumbnailUrl?: string | null;
  duration?: number | null;
  isSelected: boolean;
  onClick: () => void;
}

export const VideoThumbnail: React.FC<VideoThumbnailProps> = ({
  title,
  thumbnailUrl,
  duration,
  isSelected,
  onClick
}) => {
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <Card 
      className={cn(
        "p-2 cursor-pointer hover:bg-white/5 transition-colors group",
        isSelected && "bg-white/10"
      )}
      onClick={onClick}
    >
      <div className="space-y-2">
        <div className="relative aspect-video bg-black/20 rounded overflow-hidden">
          {thumbnailUrl ? (
            <img 
              src={thumbnailUrl} 
              alt={title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <VideoIcon className="w-8 h-8 text-white/40" />
            </div>
          )}
          {duration && (
            <div className="absolute bottom-1 right-1 px-1 py-0.5 bg-black/60 rounded text-xs text-white">
              {formatDuration(duration)}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <VideoIcon className="w-4 h-4 text-white/60" />
          <span className="text-sm text-white truncate">{title}</span>
        </div>
      </div>
    </Card>
  );
};
