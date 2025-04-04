
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Upload, X, PlayCircle, PauseCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { uploadFileToBucket } from "@/utils/supabase-helpers";

interface AudioUploaderProps {
  label: string;
  audioUrl?: string;
  onAudioUploaded: (url: string) => Promise<void>;
  onRemoveAudio?: () => Promise<void>;
  bucketName: 'voice-over' | 'background-music';
}

export function AudioUploader({
  label,
  audioUrl,
  onAudioUploaded,
  onRemoveAudio,
  bucketName
}: AudioUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  
  const handleUpload = () => {
    if (audioInputRef.current) {
      audioInputRef.current.click();
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check if the file is an MP3 or other audio format
    if (!file.type.startsWith('audio/')) {
      toast.error("Please select an audio file (MP3 recommended)");
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
      await onAudioUploaded(publicUrl);
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
    if (audioPlayerRef.current) {
      if (isPlaying) {
        audioPlayerRef.current.pause();
      } else {
        audioPlayerRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };
  
  const handleRemove = async () => {
    if (onRemoveAudio) {
      try {
        await onRemoveAudio();
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
        ref={audioInputRef}
        accept="audio/mp3,audio/*"
        className="hidden"
        onChange={handleFileSelected}
      />
      
      {audioUrl ? (
        <div className="flex items-center justify-between p-2 border rounded bg-background dark:bg-secondary">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={togglePlayback}
              className="h-8 w-8"
            >
              {isPlaying ? (
                <PauseCircle className="h-5 w-5" />
              ) : (
                <PlayCircle className="h-5 w-5" />
              )}
            </Button>
            <audio
              ref={audioPlayerRef}
              src={audioUrl}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />
            <span className="text-sm ml-2 truncate max-w-[200px]">
              {new URL(audioUrl).pathname.split('/').pop()}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRemove}
            className="h-8 w-8 text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          className="w-full h-[50px]"
          onClick={handleUpload}
          disabled={isUploading}
        >
          <Upload className="h-4 w-4 mr-2" />
          Upload {label} (MP3)
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
