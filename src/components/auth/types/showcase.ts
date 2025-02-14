
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
    final_video_with_music: string | null;
  } | null;
}
