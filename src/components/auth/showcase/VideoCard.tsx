
import { ShowcaseVideo } from "../types/showcase";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "@/hooks/use-toast";

interface VideoCardProps {
  video: ShowcaseVideo;
  onVideoError: (videoId: string) => void;
  onVideoLoad: (videoId: string) => void;
  isLoading: boolean;
  hasError: boolean;
  isPlaying: boolean;
  onPlayStateChange: (videoId: string | null) => void;
}

const MAX_RETRIES = 2;
const RETRY_DELAY = 2000;
const LOAD_TIMEOUT = 10000; // 10 seconds timeout for loading

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
  const [retryCount, setRetryCount] = useState(0);
  const [errorDetails, setErrorDetails] = useState<string>("");
  const [isLoadingVideo, setIsLoadingVideo] = useState(true);
  const loadTimeoutRef = useRef<NodeJS.Timeout>();

  const isValidVideoUrl = (url: string) => {
    if (!url) return false;
    try {
      const parsedUrl = new URL(url);
      return ['http:', 'https:'].includes(parsedUrl.protocol);
    } catch {
      return false;
    }
  };

  const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const videoEl = e.currentTarget;
    const mediaError = videoEl.error;
    
    console.error('Video Error:', {
      videoId: video.id,
      errorCode: mediaError?.code,
      errorMessage: mediaError?.message,
      videoUrl: video.story?.final_video_with_music || video.video_url,
    });

    let errorMessage = "Failed to load video. ";
    
    if (mediaError) {
      switch (mediaError.code) {
        case MediaError.MEDIA_ERR_ABORTED:
          errorMessage += "The video playback was aborted.";
          break;
        case MediaError.MEDIA_ERR_NETWORK:
          errorMessage += "A network error occurred while loading the video.";
          break;
        case MediaError.MEDIA_ERR_DECODE:
          errorMessage += "The video format is not supported by your browser.";
          break;
        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
          errorMessage += "The video format or source is not supported.";
          break;
        default:
          errorMessage += "An unknown error occurred.";
      }
    }

    setErrorDetails(errorMessage);
    setIsLoadingVideo(false);

    if (retryCount < MAX_RETRIES) {
      console.log(`Retrying video load (attempt ${retryCount + 1}/${MAX_RETRIES})...`);
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        setIsLoadingVideo(true);
        if (videoEl) {
          videoEl.load();
        }
      }, RETRY_DELAY);
    } else {
      onVideoError(video.id);
      toast({
        title: "Video Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    const videoUrl = video.story?.final_video_with_music || video.video_url;
    if (!isValidVideoUrl(videoUrl)) {
      console.error('Invalid video URL:', videoUrl);
      onVideoError(video.id);
      setErrorDetails("Invalid video URL format");
      setIsLoadingVideo(false);
      return;
    }

    // Set initial loading state
    setIsLoadingVideo(true);
    videoEl.currentTime = 2;

    // Clear previous timeout if it exists
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
    }

    // Set new timeout for loading
    loadTimeoutRef.current = setTimeout(() => {
      if (isLoadingVideo) {
        setIsLoadingVideo(false);
        setErrorDetails("Video loading timed out. Please try again.");
        onVideoError(video.id);
      }
    }, LOAD_TIMEOUT);

    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, [video, onVideoError]);

  const handleLoadedData = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const videoEl = e.currentTarget;
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
    }
    videoEl.currentTime = 2;
    setIsLoadingVideo(false);
    onVideoLoad(video.id);
    setRetryCount(0);
  };

  const handlePlayClick = (e: React.MouseEvent<HTMLVideoElement>) => {
    const videoEl = e.currentTarget;
    if (videoEl.paused) {
      document.querySelectorAll('video').forEach(v => {
        if (v !== videoEl) {
          v.pause();
          v.currentTime = 2;
        }
      });
      videoEl.play().catch(error => {
        console.error('Play error:', error);
        toast({
          title: "Playback Error",
          description: "Failed to play video. Please try again.",
          variant: "destructive",
        });
      });
    } else {
      videoEl.pause();
    }
  };

  return (
    <div className="space-y-4">
      <div className="group relative aspect-[9/16] rounded-xl overflow-hidden hover:scale-[1.02] transition-all duration-300 cursor-pointer shadow-xl max-h-[400px]">
        {(isLoading || isLoadingVideo) && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 z-20">
            <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
          </div>
        )}
        
        {hasError ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/90 text-white text-center p-4">
            <div className="space-y-2">
              <p>Failed to load video</p>
              <p className="text-sm text-gray-400">{errorDetails}</p>
              {retryCount < MAX_RETRIES && (
                <p className="text-sm text-purple-400">Retrying... ({retryCount + 1}/{MAX_RETRIES})</p>
              )}
            </div>
          </div>
        ) : (
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            preload="metadata"
            muted
            controls
            onLoadedMetadata={(e) => {
              const videoEl = e.currentTarget;
              videoEl.currentTime = 2;
            }}
            onLoadedData={handleLoadedData}
            onPlay={() => onPlayStateChange(video.id)}
            onPause={() => onPlayStateChange(null)}
            onEnded={() => onPlayStateChange(null)}
            onError={handleVideoError}
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
