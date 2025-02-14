
export interface ShowcaseVideo {
  id: string;
  title: string;
  description: string;
  video_url: string;
  thumbnail_url: string;
  category: string;
  is_visible: boolean;
  story_id: number | null;
  story?: {
    "final_video_with_music": string | null;
  } | null;
}

export interface VideoCardProps {
  video: ShowcaseVideo;
  onVideoError: (videoId: string) => void;
  onVideoLoad: (videoId: string) => void;
  isLoading: boolean;
  hasError: boolean;
  isPlaying: boolean;
  onPlayStateChange: (videoId: string | null) => void;
}
