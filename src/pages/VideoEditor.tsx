
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
  Share2
} from "lucide-react";
import { SubtitleTrack } from "@/components/video-editor/SubtitleTrack";
import { AudioControl } from "@/components/video-editor/AudioControl";
import { PlaybackControls } from "@/components/video-editor/PlaybackControls";
import { cn } from "@/lib/utils";

interface VideoProject {
  id: string;
  title: string;
  video_url: string | null;
  duration_seconds: number | null;
  thumbnail_url: string | null;
}

const VideoEditor = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
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
      const filePath = `${user.id}/${fileName}`; // Add user ID to path for better organization

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

      const { error: dbError } = await supabase
        .from('video_projects')
        .insert({
          title: file.name,
          video_url: publicUrl,
          status: 'draft',
          user_id: user.id
        });

      if (dbError) throw dbError;

      return { publicUrl, filePath };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["video-projects"] });
      toast.success("Video uploaded successfully");
    },
    onError: (error) => {
      console.error("Upload error:", error);
      toast.error("Failed to upload video. Please make sure you're signed in.");
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith('video/')) {
        uploadVideo.mutate(file);
      } else {
        toast.error("Please select a video file");
      }
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

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Top Bar */}
      <div className="glass-card border-b border-white/10 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <MobilePanelToggle title="Video Editor" />
          <h1 className="text-white text-lg font-medium">Untitled Project</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" className="text-white">
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel */}
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
              <Button
                variant="outline"
                onClick={() => document.getElementById('video-upload')?.click()}
                className="w-full justify-start"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Video
              </Button>
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
                  <VideoIcon className="w-4 h-4 mr-2" />
                  Videos
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

        {/* Preview Area */}
        <div className="flex-1 flex flex-col p-6 overflow-hidden">
          <div className="flex-1 relative">
            <div className="absolute inset-0 flex items-center justify-center bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                className="max-h-full max-w-full"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
              />
            </div>
          </div>

          {/* Timeline */}
          <div className="h-48 glass-card mt-4 p-4 rounded-lg border border-white/10">
            <div className="space-y-4">
              <Progress 
                value={(currentTime / duration) * 100} 
                className="h-2"
              />
              <div className="flex justify-between text-sm text-white/60">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={togglePlay}
                  className="text-white"
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleMute}
                    className="text-white"
                  >
                    {isMuted ? (
                      <VolumeX className="w-4 h-4" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </Button>
                  <div className="w-24">
                    <Slider
                      value={[volume]}
                      max={1}
                      step={0.1}
                      onValueChange={handleVolumeChange}
                      className="bg-white/10"
                    />
                  </div>
                </div>
              </div>

              {/* Timeline Tracks */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-white">Video Track</h3>
                </div>
                <div className="h-12 bg-white/5 rounded border border-white/10"></div>
                
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-white">Audio Track</h3>
                  <Button variant="outline" size="sm" className="text-white">
                    <Music className="w-4 h-4 mr-2" />
                    Add Audio
                  </Button>
                </div>
                <div className="h-12 bg-white/5 rounded border border-white/10"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoEditor;
