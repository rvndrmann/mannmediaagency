
import { useRef, useState } from "react";
import { CanvasScene } from "@/types/canvas";
import { Button } from "@/components/ui/button";
import { Play, Pencil, Volume2, VolumeX } from "lucide-react";

interface CanvasPreviewProps {
  scene: CanvasScene | null;
  onShowScript: () => void;
}

export function CanvasPreview({ scene, onShowScript }: CanvasPreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const handlePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };
  
  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  if (!scene) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
        <div className="text-center">
          <p className="text-muted-foreground">Select a scene to preview</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className="flex items-center justify-between p-2 border-b">
        <h3 className="text-sm font-medium">{scene.title}</h3>
        <div className="flex space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onShowScript}
            className="h-8 w-8 p-0"
          >
            <Pencil className="h-4 w-4" />
            <span className="sr-only">Edit Script</span>
          </Button>
        </div>
      </div>
      
      <div className="flex-1 relative bg-black">
        {scene.videoUrl ? (
          <>
            <video
              ref={videoRef}
              src={scene.videoUrl}
              className="absolute inset-0 w-full h-full object-contain"
              poster={scene.imageUrl}
              onEnded={() => setIsPlaying(false)}
            />
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePlay}
                className="bg-black/60 text-white border-white/20 hover:bg-black/80"
              >
                {isPlaying ? "Pause" : "Play"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleMute}
                className="bg-black/60 text-white border-white/20 hover:bg-black/80"
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
            </div>
          </>
        ) : scene.imageUrl ? (
          <img
            src={scene.imageUrl}
            alt={scene.title}
            className="absolute inset-0 w-full h-full object-contain"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-white/60">No preview available</p>
          </div>
        )}
      </div>
    </div>
  );
}
