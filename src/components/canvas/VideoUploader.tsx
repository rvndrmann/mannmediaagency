
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Upload, Play, PauseCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { uploadFileToBucket } from "@/utils/supabase-helpers";

interface VideoUploaderProps {
  label: string;
  videoUrl?: string;
  onVideoUploaded: (url: string) => Promise<void>;
  onRemoveVideo?: () => Promise<void>;
  bucketName: string;
}

export function VideoUploader({
  label,
  videoUrl,
  onVideoUploaded,
  onRemoveVideo,
  bucketName
}: VideoUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const videoPlayerRef = useRef<HTMLVideoElement | null>(null);
  
  const handleUpload = () => {
    if (videoInputRef.current) {
      videoInputRef.current.click();
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check if the file is a video format
    if (!file.type.startsWith('video/')) {
      toast.error("Please select a video file (MP4 recommended)");
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      // Start progress simulation
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 300);
      
      const publicUrl = await uploadFileToBucket(bucketName, file);
      
      clearInterval(progressInterval);
      
      if (!publicUrl) {
        throw new Error(`Failed to upload to ${bucketName} bucket`);
      }
      
      setUploadProgress(100);
      await onVideoUploaded(publicUrl);
      toast.success(`${label} uploaded successfully`);
      
      // Reset the file input
      if (e.target) e.target.value = '';
      
    } catch (error) {
      console.error(`Error uploading ${label}:`, error);
      toast.error(`Failed to upload ${label.toLowerCase()}`);
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };
  
  const togglePlayback = () => {
    if (videoPlayerRef.current) {
      if (isPlaying) {
        videoPlayerRef.current.pause();
      } else {
        videoPlayerRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };
  
  const handleRemove = async () => {
    if (onRemoveVideo) {
      try {
        await onRemoveVideo();
        toast.success(`${label} removed`);
      } catch (error) {
        toast.error(`Error removing ${label.toLowerCase()}`);
      }
    }
  };
  
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      
      <input
        type="file"
        ref={videoInputRef}
        accept="video/*"
        className="hidden"
        onChange={handleFileSelected}
      />
      
      {videoUrl ? (
        <div className="relative group">
          <div className="h-[100px] bg-slate-800 flex items-center justify-center rounded overflow-hidden">
            <video 
              ref={videoPlayerRef}
              src={videoUrl} 
              className="h-full w-full object-cover" 
              controls={false}
              onEnded={() => setIsPlaying(false)}
            />
          </div>
          <div className="absolute inset-0 hidden group-hover:flex items-center justify-center bg-black/30 rounded">
            <div className="flex space-x-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-white bg-black/30 hover:bg-black/50"
                onClick={togglePlayback}
              >
                {isPlaying ? (
                  <PauseCircle className="h-4 w-4 mr-1" />
                ) : (
                  <Play className="h-4 w-4 mr-1" />
                )}
                {isPlaying ? 'Pause' : 'Play'}
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-white bg-black/30 hover:bg-black/50"
                onClick={handleRemove}
              >
                <Trash2 className="h-4 w-4 mr-1" /> Remove
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          className="w-full h-[100px]"
          onClick={handleUpload}
          disabled={isUploading}
        >
          <Upload className="h-4 w-4 mr-2" />
          Upload {label} (MP4)
        </Button>
      )}
      
      {isUploading && (
        <div className="space-y-1">
          <Progress value={uploadProgress} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {uploadProgress === 100 ? 'Processing...' : `Uploading: ${uploadProgress}%`}
          </p>
        </div>
      )}
    </div>
  );
}
