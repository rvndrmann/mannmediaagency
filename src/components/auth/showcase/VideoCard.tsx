
import { ShowcaseVideo } from "../types/showcase";
import { Loader2 } from "lucide-react";
import { useEffect, useRef } from "react";

interface VideoCardProps {
  video: ShowcaseVideo;
  onVideoError: (videoId: string) => void;
  onVideoLoad: (videoId: string) => void;
  isLoading: boolean;
  hasError: boolean;
  isPlaying: boolean;
  onPlayStateChange: (videoId: string | null) => void;
}

export const VideoCard = ({
  video,
  onVideoError,
  onVideoLoad,
  isLoading,
  hasError,
  isPlaying,
  onPlayStateChange,
}: VideoCardProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (videoEl) {
      videoEl.currentTime = 2;
      videoEl.load();
    }
  }, [video]);

  const handlePlayClick = (e: React.MouseEvent<HTMLVideoElement>) => {
    const videoEl = e.currentTarget;
    if (videoEl.paused) {
      document.querySelectorAll('video').forEach(v => {
        if (v !== videoEl) {
          v.pause();
          v.currentTime = 2;
        }
      });
      videoEl.play();
    } else {
      videoEl.pause();
    }
  };

  return (
    <div className="space-y-4">
      <div className="group relative aspect-[9/16] rounded-xl overflow-hidden hover:scale-[1.02] transition-all duration-300 cursor-pointer shadow-xl max-h-[400px]">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 z-20">
            <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
          </div>
        )}
        
        {hasError ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/90 text-white text-center p-4">
            <p>Failed to load video. Please try again later.</p>
          </div>
        ) : (
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            preload="auto"
            controls
            crossOrigin="anonymous"
            onLoadedMetadata={(e) => {
              const videoEl = e.currentTarget;
              videoEl.currentTime = 2;
            }}
            onLoadedData={(e) => {
              const videoEl = e.currentTarget;
              videoEl.currentTime = 2;
              onVideoLoad(video.id);
            }}
            onPlay={() => onPlayStateChange(video.id)}
            onPause={() => onPlayStateChange(null)}
            onEnded={() => onPlayStateChange(null)}
            onError={() => onVideoError(video.id)}
            onClick={handlePlayClick}
          >
            <source 
              src={video.story?.final_video_with_music || video.video_url} 
              type="video/mp4" 
            />
            Your browser does not support the video tag.
          </video>
        )}

        <div className="absolute top-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <span className="inline-block px-3 py-1 bg-purple-600/90 text-xs font-medium text-white rounded-full">
            {video.category}
          </span>
        </div>

        <div 
          className={`absolute inset-0 flex items-center justify-center opacity-0 
            ${!isPlaying ? 'group-hover:opacity-90' : ''} 
            transition-opacity duration-300 pointer-events-none`}
        >
          <div className="w-16 h-16 bg-purple-600/80 rounded-full flex items-center justify-center shadow-lg">
            <svg
              className="w-8 h-8 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-white text-lg font-bold line-clamp-1">
          {video.title}
        </h3>
        <p className="text-gray-400 text-sm line-clamp-2">
          {video.description}
        </p>
      </div>
    </div>
  );
};
