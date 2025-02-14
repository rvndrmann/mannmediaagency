import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MobilePanelToggle } from "@/components/product-shoot/MobilePanelToggle";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Upload,
  Plus,
  Music,
  Type,
  Image,
  Layers,
  Palette,
  Video as VideoIcon,
  Share2,
  Scissors
} from "lucide-react";
import { TimelineMarkers } from "@/components/video-editor/Timeline/TimelineMarkers";
import { TimelineCursor } from "@/components/video-editor/Timeline/TimelineCursor";
import { TimelineSegment } from "@/components/video-editor/Timeline/TimelineSegment";
import { AspectRatioControl } from "@/components/video-editor/Controls/AspectRatioControl";
import { cn } from "@/lib/utils";
import { VideoList } from "@/components/video-editor/Library/VideoList";
import { PlaybackControls } from "@/components/video-editor/Controls/PlaybackControls";

interface VideoProject {
  id: string;
  title: string;
  video_url: string | null;
  duration_seconds: number | null;
  thumbnail_url: string | null;
  width?: number;
  height?: number;
  aspect_ratio?: string;
}

const VideoEditor = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<VideoProject | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const queryClient = useQueryClient();

  const { data: projects, isLoading } = useQuery({
    queryKey: ["video-projects"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("video_projects")
        .select("*")
        .eq('user_id', user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as VideoProject[];
    },
  });

  const uploadVideo = useMutation({
    mutationFn: async (file: File) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to upload videos");
        throw new Error("Not authenticated");
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('videos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('videos')
        .getPublicUrl(filePath);

      const newVideo = {
        title: file.name,
        video_url: publicUrl,
        status: 'draft',
        user_id: user.id
      };

      const { error: dbError, data: insertedVideo } = await supabase
        .from('video_projects')
        .insert(newVideo)
        .select()
        .single();

      if (dbError) throw dbError;

      return insertedVideo as VideoProject;
    },
    onSuccess: (video) => {
      queryClient.invalidateQueries({ queryKey: ["video-projects"] });
      setSelectedVideo(video);
      toast.success("Video uploaded successfully");
      setUploadProgress(0);
    },
    onError: (error) => {
      console.error("Upload error:", error);
      toast.error("Failed to upload video. Please make sure you're signed in.");
      setUploadProgress(0);
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith('video/')) {
        setUploadProgress(0);
        uploadVideo.mutate(file);
      } else {
        toast.error("Please select a video file");
      }
    }
  };

  const handleVideoSelect = (video: VideoProject) => {
    setSelectedVideo(video);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      setCurrentTime(0);
      setIsPlaying(false);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const newMutedState = !isMuted;
      videoRef.current.muted = newMutedState;
      setIsMuted(newMutedState);
      if (newMutedState) {
        setVolume(0);
      } else {
        setVolume(1);
        videoRef.current.volume = 1;
      }
    }
  };

  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current || !duration) return;
    
    const timeline = e.currentTarget;
    const rect = timeline.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;
    
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleAspectRatioChange = (ratio: string) => {
    setAspectRatio(ratio);
    // Additional logic for changing video container aspect ratio
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <div className="glass-card border-b border-white/10 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <MobilePanelToggle title="Video Editor" />
          <h1 className="text-white text-lg font-medium">
            {selectedVideo ? selectedVideo.title : "Untitled Project"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" className="text-white">
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-64 glass-card border-r border-white/10 flex flex-col">
          <Tabs defaultValue="design" className="flex-1">
            <TabsList className="w-full justify-start px-2 pt-2 bg-transparent">
              <TabsTrigger value="design" className="text-white">
                <Palette className="w-4 h-4 mr-2" />
                Design
              </TabsTrigger>
              <TabsTrigger value="elements" className="text-white">
                <Layers className="w-4 h-4 mr-2" />
                Elements
              </TabsTrigger>
            </TabsList>
            <TabsContent value="design" className="p-4 flex-1">
              <Input
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                className="hidden"
                id="video-upload"
              />
              
              <VideoList
                videos={projects || []}
                selectedVideoId={selectedVideo?.id || null}
                onVideoSelect={handleVideoSelect}
                onUploadClick={() => document.getElementById('video-upload')?.click()}
                isUploading={uploadVideo.isPending}
                uploadProgress={uploadProgress}
              />

              <div className="mt-4 space-y-2">
                <Button variant="ghost" className="w-full justify-start text-white">
                  <Type className="w-4 h-4 mr-2" />
                  Text
                </Button>
                <Button variant="ghost" className="w-full justify-start text-white">
                  <Image className="w-4 h-4 mr-2" />
                  Images
                </Button>
                <Button variant="ghost" className="w-full justify-start text-white">
                  <Music className="w-4 h-4 mr-2" />
                  Audio
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="elements" className="p-4">
              <div className="text-white/60 text-sm">No elements yet</div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex-1 flex flex-col p-6 overflow-hidden">
          <div className="flex-1 relative">
            <AspectRatioControl
              onAspectRatioChange={handleAspectRatioChange}
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
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                src={selectedVideo?.video_url || undefined}
              />
            </div>
          </div>

          <div className="h-48 glass-card mt-4 p-4 rounded-lg border border-white/10">
            <div className="space-y-4">
              <div className="relative h-8" onClick={handleTimelineClick}>
                <TimelineMarkers duration={duration} />
                <TimelineCursor currentTime={currentTime} duration={duration} />
                {selectedVideo && (
                  <TimelineSegment
                    startTime={0}
                    endTime={duration}
                    duration={duration}
                  />
                )}
                <Progress 
                  value={(currentTime / duration) * 100} 
                  className="h-full absolute inset-0"
                />
              </div>

              <div className="flex justify-between text-sm text-white/60">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>

              <PlaybackControls
                isPlaying={isPlaying}
                onPlayPause={togglePlay}
                volume={volume}
                onVolumeChange={handleVolumeChange}
                isMuted={isMuted}
                onMuteToggle={toggleMute}
                disabled={!selectedVideo}
              />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-white">Timeline</h3>
                </div>
                <div className="h-12 bg-white/5 rounded border border-white/10">
                  {selectedVideo && (
                    <TimelineSegment
                      startTime={0}
                      endTime={duration}
                      duration={duration}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoEditor;
