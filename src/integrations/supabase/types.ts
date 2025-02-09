export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
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
      stories: {
        Row: {
          background_music: string | null
          created_at: string
          final_video_with_music: string | null
          ready_to_go: boolean | null
          source: string | null
          "stories id": number
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
