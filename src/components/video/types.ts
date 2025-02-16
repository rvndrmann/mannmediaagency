
export interface VideoJob {
  id: string;
  prompt: string;
  result_url: string | null;
}

export interface VideoMetadata {
  seo_title: string | null;
  seo_description: string | null;
  keywords: string | null;
  instagram_hashtags: string | null;
  video_context: string | null;
  metadata_regeneration_count: number;
}

export interface MetadataDisplay {
  label: string;
  value: string | null;
  isMultiline?: boolean;
}
