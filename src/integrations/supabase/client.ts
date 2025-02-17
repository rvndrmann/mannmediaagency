import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

export const SUPABASE_URL = "https://avdwgvjhufslhqrrmxgo.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2ZHdndmpodWZzbGhxcnJteGdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg4Mzg3OTMsImV4cCI6MjA1NDQxNDc5M30.NYkKpNhStznwM0M-ZwyANUJNoGsYDM7xF2oMaWQ92w4";

// Create a single supabase client for interacting with your database
export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      detectSessionInUrl: false,
      autoRefreshToken: true,
      flowType: 'pkce',
      storage: typeof window !== 'undefined' ? window.localStorage : undefined
    }
  }
);

// Add type declarations for our new tables
declare module './types' {
  interface Database {
    public: {
      Tables: {
        announcements: {
          Row: {
            active: boolean | null
            content: string
            created_at: string | null
            end_date: string | null
            id: string
            start_date: string | null
            title: string
            type: string
            updated_at: string | null
          }
          Insert: {
            active?: boolean | null
            content: string
            created_at?: string | null
            end_date?: string | null
            id?: string
            start_date?: string | null
            title: string
            type: string
            updated_at?: string | null
          }
          Update: {
            active?: boolean | null
            content?: string
            created_at?: string | null
            end_date?: string | null
            id?: string
            start_date?: string | null
            title?: string
            type?: string
            updated_at?: string | null
          }
          Relationships: []
        }
        audit_logs: {
          Row: {
            created_at: string | null
            data: Json
            event_type: string
            id: string
          }
          Insert: {
            created_at?: string | null
            data: Json
            event_type: string
            id?: string
          }
          Update: {
            created_at?: string | null
            data?: Json
            event_type?: string
            id?: string
          }
          Relationships: []
        }
        auth_showcase_videos: {
          Row: {
            category: string | null
            created_at: string | null
            description: string | null
            display_order: number | null
            id: string
            thumbnail_path: string | null
            title: string
            video_path: string
          }
          Insert: {
            category?: string | null
            created_at?: string | null
            description?: string | null
            display_order?: number | null
            id?: string
            thumbnail_path?: string | null
            title: string
            video_path: string
          }
          Update: {
            category?: string | null
            created_at?: string | null
            description?: string | null
            display_order?: number | null
            id?: string
            thumbnail_path?: string | null
            title?: string
            video_path?: string
          }
          Relationships: []
        }
        chat_usage: {
          Row: {
            created_at: string | null
            credits_charged: number
            id: string
            message_content: string | null
            user_id: string
            words_count: number
          }
          Insert: {
            created_at?: string | null
            credits_charged?: number
            id?: string
            message_content?: string | null
            user_id: string
            words_count?: number
          }
          Update: {
            created_at?: string | null
            credits_charged?: number
            id?: string
            message_content?: string | null
            user_id?: string
            words_count?: number
          }
          Relationships: []
        }
        credit_update_logs: {
          Row: {
            created_at: string | null
            credits_after: number | null
            credits_before: number | null
            id: string
            plan_name: string | null
            status: string | null
            subscription_id: string | null
            trigger_source: string | null
            user_id: string | null
          }
          Insert: {
            created_at?: string | null
            credits_after?: number | null
            credits_before?: number | null
            id?: string
            plan_name?: string | null
            status?: string | null
            subscription_id?: string | null
            trigger_source?: string | null
            user_id?: string | null
          }
          Update: {
            created_at?: string | null
            credits_after?: number | null
            credits_before?: number | null
            id?: string
            plan_name?: string | null
            status?: string | null
            subscription_id?: string | null
            trigger_source?: string | null
            user_id?: string | null
          }
          Relationships: []
        }
        discount_codes: {
          Row: {
            code: string
            created_at: string | null
            discount_percentage: number
            id: string
            valid_from: string | null
            valid_until: string
          }
          Insert: {
            code: string
            created_at?: string | null
            discount_percentage: number
            id?: string
            valid_from?: string | null
            valid_until: string
          }
          Update: {
            code?: string
            created_at?: string | null
            discount_percentage?: number
            id?: string
            valid_from?: string | null
            valid_until?: string
          }
          Relationships: []
        }
        discount_usage: {
          Row: {
            discount_code_id: string
            id: string
            transaction_id: string | null
            used_at: string | null
            user_id: string
          }
          Insert: {
            discount_code_id: string
            id?: string
            transaction_id?: string | null
            used_at?: string | null
            user_id: string
          }
          Update: {
            discount_code_id?: string
            id?: string
            transaction_id?: string | null
            used_at?: string | null
            user_id?: string
          }
          Relationships: [
            {
              foreignKeyName: "discount_usage_discount_code_id_fkey"
              columns: ["discount_code_id"]
              isOneToOne: false
              referencedRelation: "discount_codes"
              referencedColumns: ["id"]
            },
            {
              foreignKeyName: "discount_usage_transaction_id_fkey"
              columns: ["transaction_id"]
              isOneToOne: false
              referencedRelation: "payment_transactions"
              referencedColumns: ["id"]
            },
          ]
        }
        image_generation_jobs: {
          Row: {
            created_at: string
            generated_metadata: boolean | null
            id: string
            prompt: string
            request_id: string | null
            result_url: string | null
            settings: Json
            status: Database["public"]["Enums"]["image_generation_status"]
            updated_at: string
            user_id: string
          }
          Insert: {
            created_at?: string
            generated_metadata?: boolean | null
            id?: string
            prompt: string
            request_id?: string | null
            result_url?: string | null
            settings?: Json
            status?: Database["public"]["Enums"]["image_generation_status"]
            updated_at?: string
            user_id: string
          }
          Update: {
            created_at?: string
            generated_metadata?: boolean | null
            id?: string
            prompt?: string
            request_id?: string | null
            result_url?: string | null
            settings?: Json
            status?: Database["public"]["Enums"]["image_generation_status"]
            updated_at?: string
            user_id?: string
          }
          Relationships: []
        }
        oauth_states: {
          Row: {
            created_at: string
            expires_at: string
            id: string
            platform: string
            state: string
            user_id: string
          }
          Insert: {
            created_at?: string
            expires_at?: string
            id?: string
            platform: string
            state: string
            user_id: string
          }
          Update: {
            created_at?: string
            expires_at?: string
            id?: string
            platform?: string
            state?: string
            user_id?: string
          }
          Relationships: []
        }
        payment_transactions: {
          Row: {
            amount: number
            created_at: string | null
            id: string
            payment_method: string | null
            payment_response: Json | null
            payment_status: string | null
            payu_data: Json | null
            payu_transaction_id: string | null
            status: string
            subscription_id: string | null
            transaction_id: string
            updated_at: string | null
            user_id: string
            webhook_received_at: string | null
          }
          Insert: {
            amount: number
            created_at?: string | null
            id?: string
            payment_method?: string | null
            payment_response?: Json | null
            payment_status?: string | null
            payu_data?: Json | null
            payu_transaction_id?: string | null
            status?: string
            subscription_id?: string | null
            transaction_id: string
            updated_at?: string | null
            user_id: string
            webhook_received_at?: string | null
          }
          Update: {
            amount?: number
            created_at?: string | null
            id?: string
            payment_method?: string | null
            payment_response?: Json | null
            payment_status?: string | null
            payu_data?: Json | null
            payu_transaction_id?: string | null
            status?: string
            subscription_id?: string | null
            transaction_id?: string
            updated_at?: string | null
            user_id?: string
            webhook_received_at?: string | null
          }
          Relationships: [
            {
              foreignKeyName: "payment_transactions_subscription_id_fkey"
              columns: ["subscription_id"]
              isOneToOne: false
              referencedRelation: "subscriptions"
              referencedColumns: ["id"]
            },
          ]
        }
        product_image_metadata: {
          Row: {
            created_at: string | null
            custom_title: string | null
            id: string
            image_job_id: string
            instagram_hashtags: string | null
            keywords: string | null
            metadata_regeneration_count: number | null
            product_context: string | null
            regeneration_count: number | null
            seo_description: string | null
            seo_title: string | null
            updated_at: string | null
          }
          Insert: {
            created_at?: string | null
            custom_title?: string | null
            id?: string
            image_job_id: string
            instagram_hashtags?: string | null
            keywords?: string | null
            metadata_regeneration_count?: number | null
            product_context?: string | null
            regeneration_count?: number | null
            seo_description?: string | null
            seo_title?: string | null
            updated_at?: string | null
          }
          Update: {
            created_at?: string | null
            custom_title?: string | null
            id?: string
            image_job_id?: string
            instagram_hashtags?: string | null
            keywords?: string | null
            metadata_regeneration_count?: number | null
            product_context?: string | null
            regeneration_count?: number | null
            seo_description?: string | null
            seo_title?: string | null
            updated_at?: string | null
          }
          Relationships: [
            {
              foreignKeyName: "product_image_metadata_image_job_id_fkey"
              columns: ["image_job_id"]
              isOneToOne: true
              referencedRelation: "image_generation_jobs"
              referencedColumns: ["id"]
            },
          ]
        }
        profiles: {
          Row: {
            avatar_url: string | null
            created_at: string
            id: string
            updated_at: string
            username: string | null
          }
          Insert: {
            avatar_url?: string | null
            created_at?: string
            id: string
            updated_at?: string
            username?: string | null
          }
          Update: {
            avatar_url?: string | null
            created_at?: string
            id?: string
            updated_at?: string
            username?: string | null
          }
          Relationships: []
        }
        research_material_tags: {
          Row: {
            research_material_id: string
            tag_id: string
          }
          Insert: {
            research_material_id: string
            tag_id: string
          }
          Update: {
            research_material_id?: string
            tag_id?: string
          }
          Relationships: [
            {
              foreignKeyName: "research_material_tags_research_material_id_fkey"
              columns: ["research_material_id"]
              isOneToOne: false
              referencedRelation: "research_materials"
              referencedColumns: ["id"]
            },
            {
              foreignKeyName: "research_material_tags_tag_id_fkey"
              columns: ["tag_id"]
              isOneToOne: false
              referencedRelation: "research_tags"
              referencedColumns: ["id"]
            },
          ]
        }
        research_materials: {
          Row: {
            analysis: Json | null
            content: string
            content_type: string
            created_at: string | null
            id: string
            summary: string | null
            updated_at: string | null
            user_id: string
          }
          Insert: {
            analysis?: Json | null
            content: string
            content_type: string
            created_at?: string | null
            id?: string
            summary?: string | null
            updated_at?: string | null
            user_id: string
          }
          Update: {
            analysis?: Json | null
            content?: string
            content_type?: string
            created_at?: string | null
            id?: string
            summary?: string | null
            updated_at?: string | null
            user_id?: string
          }
          Relationships: []
        }
        research_tags: {
          Row: {
            created_at: string | null
            id: string
            name: string
            user_id: string
          }
          Insert: {
            created_at?: string | null
            id?: string
            name: string
            user_id: string
          }
          Update: {
            created_at?: string | null
            id?: string
            name?: string
            user_id?: string
          }
          Relationships: []
        }
        scheduled_posts: {
          Row: {
            caption: string | null
            created_at: string | null
            id: string
            media_url: string | null
            platform: string
            scheduled_for: string
            status: string
            updated_at: string | null
            user_id: string
          }
          Insert: {
            caption?: string | null
            created_at?: string | null
            id?: string
            media_url?: string | null
            platform: string
            scheduled_for: string
            status?: string
            updated_at?: string | null
            user_id: string
          }
          Update: {
            caption?: string | null
            created_at?: string | null
            id?: string
            media_url?: string | null
            platform?: string
            scheduled_for?: string
            status?: string
            updated_at?: string | null
            user_id?: string
          }
          Relationships: []
        }
        social_integrations: {
          Row: {
            access_token: string | null
            created_at: string | null
            id: string
            platform: string
            refresh_token: string | null
            updated_at: string | null
            user_id: string
          }
          Insert: {
            access_token?: string | null
            created_at?: string | null
            id?: string
            platform: string
            refresh_token?: string | null
            updated_at?: string | null
            user_id: string
          }
          Update: {
            access_token?: string | null
            created_at?: string | null
            id?: string
            platform?: string
            refresh_token?: string | null
            updated_at?: string | null
            user_id?: string
          }
          Relationships: []
        }
        stored_videos: {
          Row: {
            created_at: string | null
            duration_seconds: number | null
            id: string
            metadata: Json | null
            original_url: string
            size_bytes: number | null
            status: string
            storage_path: string
            story_id: number | null
            updated_at: string | null
            video_type: string
          }
          Insert: {
            created_at?: string | null
            duration_seconds?: number | null
            id?: string
            metadata?: Json | null
            original_url: string
            size_bytes?: number | null
            status?: string
            storage_path: string
            story_id?: number | null
            updated_at?: string | null
            video_type: string
          }
          Update: {
            created_at?: string | null
            duration_seconds?: number | null
            id?: string
            metadata?: Json | null
            original_url?: string
            size_bytes?: number | null
            status?: string
            storage_path?: string
            story_id?: number | null
            updated_at?: string | null
            video_type?: string
          }
          Relationships: [
            {
              foreignKeyName: "stored_videos_story_id_fkey"
              columns: ["story_id"]
              isOneToOne: false
              referencedRelation: "stories"
              referencedColumns: ["stories id"]
            },
          ]
        }
        stories: {
          Row: {
            background_music: string | null
            created_at: string
            final_video_with_music: string | null
            ready_to_go: boolean | null
            source: string | null
            "stories id": number
            story: string | null
            story_type_id: number | null
            user_id: string | null
            video_length_seconds: number | null
          }
          Insert: {
            background_music?: string | null
            created_at?: string
            final_video_with_music?: string | null
            ready_to_go?: boolean | null
            source?: string | null
            "stories id"?: number
            story?: string | null
            story_type_id?: number | null
            user_id?: string | null
            video_length_seconds?: number | null
          }
          Update: {
            background_music?: string | null
            created_at?: string
            final_video_with_music?: string | null
            ready_to_go?: boolean | null
            source?: string | null
            "stories id"?: number
            story?: string | null
            story_type_id?: number | null
            user_id?: string | null
            video_length_seconds?: number | null
          }
          Relationships: [
            {
              foreignKeyName: "stories_story_type_id_fkey"
              columns: ["story_type_id"]
              isOneToOne: false
              referencedRelation: "story_type"
              referencedColumns: ["id"]
            },
            {
              foreignKeyName: "story_type_id_fkey"
              columns: ["story_type_id"]
              isOneToOne: false
              referencedRelation: "story_type"
              referencedColumns: ["id"]
            },
          ]
        }
        story_metadata: {
          Row: {
            additional_context: string | null
            created_at: string
            custom_title_twist: string | null
            id: string
            instagram_hashtags: string | null
            keywords: string | null
            regeneration_count: number | null
            seo_description: string | null
            seo_title: string | null
            story_id: number
            thumbnail_prompt: string | null
            updated_at: string
          }
          Insert: {
            additional_context?: string | null
            created_at?: string
            custom_title_twist?: string | null
            id?: string
            instagram_hashtags?: string | null
            keywords?: string | null
            regeneration_count?: number | null
            seo_description?: string | null
            seo_title?: string | null
            story_id: number
            thumbnail_prompt?: string | null
            updated_at?: string
          }
          Update: {
            additional_context?: string | null
            created_at?: string
            custom_title_twist?: string | null
            id?: string
            instagram_hashtags?: string | null
            keywords?: string | null
            regeneration_count?: number | null
            seo_description?: string | null
            seo_title?: string | null
            story_id?: number
            thumbnail_prompt?: string | null
            updated_at?: string
          }
          Relationships: [
            {
              foreignKeyName: "story_metadata_story_id_fkey"
              columns: ["story_id"]
              isOneToOne: true
              referencedRelation: "stories"
              referencedColumns: ["stories id"]
            },
          ]
        }
        story_type: {
          Row: {
            created_at: string
            id: number
            image_height: number | null
            image_width: number | null
            Output_height: number | null
            Output_width: number | null
            scenes_json_prompt: string | null
            stories: string | null
            story_prompt_text: string | null
            story_type: string | null
          }
          Insert: {
            created_at?: string
            id?: number
            image_height?: number | null
            image_width?: number | null
            Output_height?: number | null
            Output_width?: number | null
            scenes_json_prompt?: string | null
            stories?: string | null
            story_prompt_text?: string | null
            story_type?: string | null
          }
          Update: {
            created_at?: string
            id?: number
            image_height?: number | null
            image_width?: number | null
            Output_height?: number | null
            Output_width?: number | null
            scenes_json_prompt?: string | null
            stories?: string | null
            story_prompt_text?: string | null
            story_type?: string | null
          }
          Relationships: []
        }
        subscriptions: {
          Row: {
            amount: number
            created_at: string | null
            id: string
            payment_status: string | null
            payu_transaction_id: string | null
            plan_name: string
            status: string
            transaction_id: string | null
            updated_at: string | null
            user_id: string
            valid_until: string | null
          }
          Insert: {
            amount: number
            created_at?: string | null
            id?: string
            payment_status?: string | null
            payu_transaction_id?: string | null
            plan_name: string
            status: string
            transaction_id?: string | null
            updated_at?: string | null
            user_id: string
            valid_until?: string | null
          }
          Update: {
            amount?: number
            created_at?: string | null
            id?: string
            payment_status?: string | null
            payu_transaction_id?: string | null
            plan_name?: string
            status?: string
            transaction_id?: string | null
            updated_at?: string | null
            user_id?: string
            valid_until?: string | null
          }
          Relationships: []
        }
        system_settings: {
          Row: {
            created_at: string | null
            id: string
            key: string
            updated_at: string | null
            value: Json
          }
          Insert: {
            created_at?: string | null
            id?: string
            key: string
            updated_at?: string | null
            value: Json
          }
          Update: {
            created_at?: string | null
            id?: string
            key?: string
            updated_at?: string | null
            value?: Json
          }
          Relationships: []
        }
        user_credits: {
          Row: {
            created_at: string | null
            credits_remaining: number
            id: string
            updated_at: string | null
            user_id: string
          }
          Insert: {
            created_at?: string | null
            credits_remaining?: number
            id?: string
            updated_at?: string | null
            user_id: string
          }
          Update: {
            created_at?: string | null
            credits_remaining?: number
            id?: string
            updated_at?: string | null
            user_id?: string
          }
          Relationships: []
        }
        video_audio_tracks: {
          Row: {
            audio_url: string
            created_at: string | null
            duration: number | null
            id: string
            project_id: string
            start_time: number | null
            track_type: string
            updated_at: string | null
            volume: number | null
          }
          Insert: {
            audio_url: string
            created_at?: string | null
            duration?: number | null
            id?: string
            project_id: string
            start_time?: number | null
            track_type: string
            updated_at?: string | null
            volume?: number | null
          }
          Update: {
            audio_url?: string
            created_at?: string | null
            duration?: number | null
            id?: string
            project_id?: string
            start_time?: number | null
            track_type?: string
            updated_at?: string | null
            volume?: number | null
          }
          Relationships: [
            {
              foreignKeyName: "fk_project"
              columns: ["project_id"]
              isOneToOne: false
              referencedRelation: "video_projects"
              referencedColumns: ["id"]
            },
          ]
        }
        video_generation_jobs: {
          Row: {
            aspect_ratio: string | null
            content_type: string | null
            created_at: string
            duration: string | null
            error_message: string | null
            file_name: string | null
            file_size: number | null
            id: string
            last_checked_at: string | null
            negative_prompt: string | null
            progress: number | null
            prompt: string
            request_id: string | null
            result_url: string | null
            retry_count: number | null
            settings: Json
            source_image_url: string
            status: Database["public"]["Enums"]["video_generation_status_new"]
            updated_at: string
            user_id: string
          }
          Insert: {
            aspect_ratio?: string | null
            content_type?: string | null
            created_at?: string
            duration?: string | null
            error_message?: string | null
            file_name?: string | null
            file_size?: number | null
            id?: string
            last_checked_at?: string | null
            negative_prompt?: string | null
            progress?: number | null
            prompt: string
            request_id?: string | null
            result_url?: string | null
            retry_count?: number | null
            settings?: Json
            source_image_url: string
            status?: Database["public"]["Enums"]["video_generation_status_new"]
            updated_at?: string
            user_id: string
          }
          Update: {
            aspect_ratio?: string | null
            content_type?: string | null
            created_at?: string
            duration?: string | null
            error_message?: string | null
            file_name?: string | null
            file_size?: number | null
            id?: string
            last_checked_at?: string | null
            negative_prompt?: string | null
            progress?: number | null
            prompt?: string
            request_id?: string | null
            result_url?: string | null
            retry_count?: number | null
            settings?: Json
            source_image_url?: string
            status?: Database["public"]["Enums"]["video_generation_status_new"]
            updated_at?: string
            user_id?: string
          }
          Relationships: []
        }
        video_metadata: {
          Row: {
            additional_context: string | null
            created_at: string
            custom_title_twist: string | null
            id: string
            instagram_hashtags: string | null
            keywords: string | null
            metadata_regeneration_count: number | null
            seo_description: string | null
            seo_title: string | null
            updated_at: string
            video_context: string | null
            video_job_id: string
          }
          Insert: {
            additional_context?: string | null
            created_at?: string
            custom_title_twist?: string | null
            id?: string
            instagram_hashtags?: string | null
            keywords?: string | null
            metadata_regeneration_count?: number | null
            seo_description?: string | null
            seo_title?: string | null
            updated_at?: string
            video_context?: string | null
            video_job_id: string
          }
          Update: {
            additional_context?: string | null
            created_at?: string
            custom_title_twist?: string | null
            id?: string
            instagram_hashtags?: string | null
            keywords?: string | null
            metadata_regeneration_count?: number | null
            seo_description?: string | null
            seo_title?: string | null
            updated_at?: string
            video_context?: string | null
            video_job_id?: string
          }
          Relationships: [
            {
              foreignKeyName: "video_metadata_video_job_id_fkey"
              columns: ["video_job_id"]
              isOneToOne: true
              referencedRelation: "video_generation_jobs"
              referencedColumns: ["id"]
            },
          ]
        }
        video_projects: {
          Row: {
            created_at: string | null
            description: string | null
            duration_seconds: number | null
            id: string
            settings: Json | null
            status: string | null
            thumbnail_url: string | null
            title: string
            updated_at: string | null
            user_id: string
            video_url: string | null
          }
          Insert: {
            created_at?: string | null
            description?: string | null
            duration_seconds?: number | null
            id?: string
            settings?: Json | null
            status?: string | null
            thumbnail_url?: string | null
            title: string
            updated_at?: string | null
            user_id: string
            video_url?: string | null
          }
          Update: {
            created_at?: string | null
            description?: string | null
            duration_seconds?: number | null
            id?: string
            settings?: Json | null
            status?: string | null
            thumbnail_url?: string | null
            title?: string
            updated_at?: string | null
            user_id?: string
            video_url?: string | null
          }
          Relationships: []
        }
        video_subtitles: {
          Row: {
            created_at: string | null
            end_time: number
            id: string
            project_id: string
            start_time: number
            style: Json | null
            text: string
            updated_at: string | null
          }
          Insert: {
            created_at?: string | null
            end_time: number
            id?: string
            project_id: string
            start_time: number
            style?: Json | null
            text: string
            updated_at?: string | null
          }
          Update: {
            created_at?: string | null
            end_time?: number
            id?: string
            project_id?: string
            start_time?: number
            style?: Json | null
            text?: string
            updated_at?: string | null
          }
          Relationships: [
            {
              foreignKeyName: "fk_project"
              columns: ["project_id"]
              isOneToOne: false
              referencedRelation: "video_projects"
              referencedColumns: ["id"]
            },
          ]
        }
        product_ad_projects: {
          Row: {
            id: string;
            user_id: string;
            title: string;
            product_image_url: string | null;
            status: 'draft' | 'script_generated' | 'shots_generated' | 'video_generated' | 'completed' | 'failed';
            script: Json | null;
            settings: Json;
            metadata: Json;
            created_at: string;
            updated_at: string;
          };
          Insert: {
