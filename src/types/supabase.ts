
import { Database } from '@/integrations/supabase/types';

export type TableRow<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type InsertRow<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type UpdateRow<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];

// Helper to safely access Supabase data
export function safeGetData<T>(result: { data: T | null, error: Error | null }): T | null {
  if (result.error) {
    console.error('Supabase query error:', result.error);
    return null;
  }
  return result.data;
}

// Type definitions for common tables
export interface UserProfile extends TableRow<'profiles'> {
  id: string;
  avatar_url: string | null;
  username: string | null;
}

export interface UserCredits extends TableRow<'user_credits'> {
  id: string;
  user_id: string;
  credits_remaining: number;
}

export interface VideoGenerationJob extends TableRow<'video_generation_jobs'> {
  id: string;
  user_id: string;
  status: 'in_queue' | 'processing' | 'completed' | 'failed';
  prompt: string;
  result_url: string | null;
  created_at: string;
}

export interface ImageGenerationJob extends TableRow<'image_generation_jobs'> {
  id: string;
  user_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  prompt: string;
  result_url: string | null;
  created_at: string;
}

export interface Story extends TableRow<'stories'> {
  'stories id': number;
  story: string | null;
  source: string | null;
  user_id: string | null;
  story_type_id: number | null;
  background_music: string | null;
  final_video_with_music: string | null;
  video_length_seconds: number | null;
  ready_to_go: boolean | null;
  created_at: string;
}
