
import React from 'react';
import { VideoThumbnail } from './VideoThumbnail';
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

interface VideoProject {
  id: string;
  title: string;
  video_url: string | null;
  duration_seconds: number | null;
  thumbnail_url: string | null;
}

interface VideoListProps {
  videos: VideoProject[];
  selectedVideoId: string | null;
  onVideoSelect: (video: VideoProject) => void;
  onUploadClick: () => void;
  isUploading: boolean;
  uploadProgress?: number;
}

export const VideoList: React.FC<VideoListProps> = ({
  videos,
  selectedVideoId,
  onVideoSelect,
  onUploadClick,
  isUploading,
  uploadProgress = 0
}) => {
  return (
    <div className="space-y-4">
      <Button
        variant="outline"
        onClick={onUploadClick}
        className="w-full justify-start"
        disabled={isUploading}
      >
        <Upload className="w-4 h-4 mr-2" />
        {isUploading ? `Uploading... ${uploadProgress}%` : "Upload Video"}
      </Button>

      <div className="space-y-2">
        {videos.map((video) => (
          <VideoThumbnail
            key={video.id}
            id={video.id}
            title={video.title}
            thumbnailUrl={video.thumbnail_url}
            duration={video.duration_seconds}
            isSelected={video.id === selectedVideoId}
            onClick={() => onVideoSelect(video)}
          />
        ))}
      </div>
    </div>
  );
};
