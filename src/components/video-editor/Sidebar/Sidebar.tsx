
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VideoList } from '../Library/VideoList';
import { Type, Image, Music, Layers, Palette } from "lucide-react";

interface VideoProject {
  id: string;
  title: string;
  video_url: string | null;
  duration_seconds: number | null;
  thumbnail_url: string | null;
}

interface SidebarProps {
  videos: VideoProject[];
  selectedVideoId: string | null;
  onVideoSelect: (video: VideoProject) => void;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  isUploading: boolean;
  uploadProgress: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  videos,
  selectedVideoId,
  onVideoSelect,
  onFileSelect,
  isUploading,
  uploadProgress
}) => {
  return (
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
            onChange={onFileSelect}
            className="hidden"
            id="video-upload"
          />
          
          <VideoList
            videos={videos}
            selectedVideoId={selectedVideoId}
            onVideoSelect={onVideoSelect}
            onUploadClick={() => document.getElementById('video-upload')?.click()}
            isUploading={isUploading}
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
  );
};
