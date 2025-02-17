
import { cn } from "@/lib/utils";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useState, useRef } from "react";
import { PlaybackControls } from "@/components/video-editor/PlaybackControls";

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
  const [videoStates, setVideoStates] = useState<{ [key: string]: {
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    volume: number;
    isMuted: boolean;
  } }>({});

  const videoRefs = useRef<{ [key: string]: HTMLVideoElement }>({});

  const handlePlayPause = (videoId: string) => {
    const video = videoRefs.current[videoId];
    if (!video) return;

    if (videoStates[videoId]?.isPlaying) {
      video.pause();
    } else {
      video.play();
    }

    setVideoStates(prev => ({
      ...prev,
      [videoId]: {
        ...prev[videoId],
        isPlaying: !prev[videoId]?.isPlaying
      }
    }));
  };

  const handleTimeUpdate = (videoId: string) => {
    const video = videoRefs.current[videoId];
    if (!video) return;

    setVideoStates(prev => ({
      ...prev,
      [videoId]: {
        ...prev[videoId],
        currentTime: video.currentTime,
        duration: video.duration
      }
    }));
  };

  const handleVolumeChange = (videoId: string, values: number[]) => {
    const video = videoRefs.current[videoId];
    if (!video) return;

    const newVolume = values[0];
    video.volume = newVolume;
    setVideoStates(prev => ({
      ...prev,
      [videoId]: {
        ...prev[videoId],
        volume: newVolume,
        isMuted: newVolume === 0
      }
    }));
  };

  const handleMuteToggle = (videoId: string) => {
    const video = videoRefs.current[videoId];
    if (!video) return;

    const newMuted = !video.muted;
    video.muted = newMuted;
    setVideoStates(prev => ({
      ...prev,
      [videoId]: {
        ...prev[videoId],
        isMuted: newMuted,
        volume: newMuted ? 0 : prev[videoId]?.volume || 1
      }
    }));
  };

  const handleSeek = (videoId: string, values: number[]) => {
    const video = videoRefs.current[videoId];
    if (!video) return;

    video.currentTime = values[0];
  };

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
            <div key={video.id} className="relative group space-y-2">
              {(video.status === 'in_queue') ? (
                <div className="aspect-video bg-gray-800 rounded-lg flex flex-col items-center justify-center p-4">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-500 mb-4" />
                  <div className="w-full max-w-xs space-y-2">
                    <Progress 
                      value={video.progress || 0}
                      className="h-2 bg-gray-700"
                    />
                    <p className="text-sm text-center text-gray-400">
                      Generating your video...
                      <br />
                      <span className="text-xs">
                        {video.progress || 0}% complete
                      </span>
                    </p>
                  </div>
                </div>
              ) : video.result_url ? (
                <div className="space-y-2">
                  <div className="relative aspect-video bg-gray-800 rounded-lg overflow-hidden">
                    <video
                      ref={el => {
                        if (el) videoRefs.current[video.id] = el;
                      }}
                      src={video.result_url}
                      className="w-full h-full object-cover"
                      onTimeUpdate={() => handleTimeUpdate(video.id)}
                      onEnded={() => {
                        setVideoStates(prev => ({
                          ...prev,
                          [video.id]: {
                            ...prev[video.id],
                            isPlaying: false
                          }
                        }));
                      }}
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-white hover:text-purple-400"
                        onClick={() => onDownload(video.result_url!)}
                      >
                        <Download className="h-6 w-6" />
                      </Button>
                    </div>
                  </div>
                  <PlaybackControls
                    isPlaying={videoStates[video.id]?.isPlaying || false}
                    currentTime={videoStates[video.id]?.currentTime || 0}
                    duration={videoStates[video.id]?.duration || 0}
                    volume={videoStates[video.id]?.volume || 1}
                    isMuted={videoStates[video.id]?.isMuted || false}
                    onPlayPause={() => handlePlayPause(video.id)}
                    onVolumeChange={(values) => handleVolumeChange(video.id, values)}
                    onMuteToggle={() => handleMuteToggle(video.id)}
                    onSeek={(values) => handleSeek(video.id, values)}
                  />
                </div>
              ) : (
                <div className="aspect-video bg-gray-800 rounded-lg flex items-center justify-center text-red-500 p-4 text-center">
                  {video.error_message || "Generation failed"}
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
