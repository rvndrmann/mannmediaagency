
import React from 'react';
import { cn } from "@/lib/utils";
import { AspectRatioControl } from '../Controls/AspectRatioControl';

interface VideoPlayerProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  videoUrl?: string;
  aspectRatio: string;
  onAspectRatioChange: (ratio: string) => void;
  onTimeUpdate: () => void;
  onLoadedMetadata: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoRef,
  videoUrl,
  aspectRatio,
  onAspectRatioChange,
  onTimeUpdate,
  onLoadedMetadata,
}) => {
  return (
    <div className="flex-1 relative">
      <AspectRatioControl
        onAspectRatioChange={onAspectRatioChange}
        currentRatio={aspectRatio}
      />
      <div className={cn(
        "absolute inset-0 mt-12 flex items-center justify-center bg-black rounded-lg overflow-hidden",
        aspectRatio === '16:9' && 'aspect-video',
        aspectRatio === '9:16' && 'aspect-[9/16]',
        aspectRatio === '1:1' && 'aspect-square'
      )}>
        <video
          ref={videoRef}
          className="max-h-full max-w-full"
          onTimeUpdate={onTimeUpdate}
          onLoadedMetadata={onLoadedMetadata}
          src={videoUrl}
        />
      </div>
    </div>
  );
};
