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
      admin_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          message_type: string
          read: boolean
          receiver_id: string
          sender_id: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          message_type: string
          read?: boolean
          receiver_id: string
          sender_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          message_type?: string
          read?: boolean
          receiver_id?: string
          sender_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_prompts: {
        Row: {
          category: string
          created_at: string | null
          id: string
          name: string
          prompt_template: string
          requires_context: boolean
          updated_at: string | null
          variables: Json
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          name: string
          prompt_template: string
          requires_context?: boolean
          updated_at?: string | null
          variables?: Json
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          name?: string
          prompt_template?: string
          requires_context?: boolean
          updated_at?: string | null
          variables?: Json
        }
        Relationships: []
      }
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
      automation_history: {
        Row: {
          action_taken: string
          created_at: string | null
          credits_used: number
          detected_intent: string | null
          id: string
          metadata: Json | null
          rule_id: string | null
          success: boolean
          user_id: string
          user_message: string
        }
        Insert: {
          action_taken: string
          created_at?: string | null
          credits_used?: number
          detected_intent?: string | null
          id?: string
          metadata?: Json | null
          rule_id?: string | null
          success?: boolean
          user_id: string
          user_message: string
        }
        Update: {
          action_taken?: string
          created_at?: string | null
          credits_used?: number
          detected_intent?: string | null
          id?: string
          metadata?: Json | null
          rule_id?: string | null
          success?: boolean
          user_id?: string
          user_message?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_history_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_rules: {
        Row: {
          action: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          negative_keywords: string[] | null
          priority: number
          prompt_id: string | null
          required_credits: number
          trigger_keywords: string[]
          updated_at: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          negative_keywords?: string[] | null
          priority?: number
          prompt_id?: string | null
          required_credits?: number
          trigger_keywords?: string[]
          updated_at?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          negative_keywords?: string[] | null
          priority?: number
          prompt_id?: string | null
          required_credits?: number
          trigger_keywords?: string[]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_rules_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "ai_prompts"
            referencedColumns: ["id"]
          },
        ]
      }
      browser_automation_actions: {
        Row: {
          action_details: Json
          action_type: string
          created_at: string
          executed_at: string | null
          id: string
          reasoning: string | null
          screenshot_url: string | null
          session_id: string
          status: string
        }
        Insert: {
          action_details: Json
          action_type: string
          created_at?: string
          executed_at?: string | null
          id?: string
          reasoning?: string | null
          screenshot_url?: string | null
          session_id: string
          status?: string
        }
        Update: {
          action_details?: Json
          action_type?: string
          created_at?: string
          executed_at?: string | null
          id?: string
          reasoning?: string | null
          screenshot_url?: string | null
          session_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "browser_automation_actions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "browser_automation_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      browser_automation_sessions: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          status: string
          task_description: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          status?: string
          task_description: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          status?: string
          task_description?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      browser_automation_steps: {
        Row: {
          created_at: string | null
          description: string
          details: string | null
          id: string
          screenshot: string | null
          status: string
          task_id: string
        }
        Insert: {
          created_at?: string | null
          description: string
          details?: string | null
          id?: string
          screenshot?: string | null
          status?: string
          task_id: string
        }
        Update: {
          created_at?: string | null
          description?: string
          details?: string | null
          id?: string
          screenshot?: string | null
          status?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "browser_automation_steps_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "browser_automation_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      browser_automation_tasks: {
        Row: {
          created_at: string | null
          current_url: string | null
          id: string
          input: string
          live_url: string | null
          output: string | null
          progress: number | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_url?: string | null
          id?: string
          input: string
          live_url?: string | null
          output?: string | null
          progress?: number | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_url?: string | null
          id?: string
          input?: string
          live_url?: string | null
          output?: string | null
          progress?: number | null
          status?: string
          updated_at?: string | null
          user_id?: string
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
      computer_automation_actions: {
        Row: {
          action_details: Json
          action_type: string
          created_at: string
          executed_at: string | null
          id: string
          reasoning: string | null
          screenshot_url: string | null
          session_id: string
          status: string
        }
        Insert: {
          action_details: Json
          action_type: string
          created_at?: string
          executed_at?: string | null
          id?: string
          reasoning?: string | null
          screenshot_url?: string | null
          session_id: string
          status?: string
        }
        Update: {
          action_details?: Json
          action_type?: string
          created_at?: string
          executed_at?: string | null
          id?: string
          reasoning?: string | null
          screenshot_url?: string | null
          session_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "computer_automation_actions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "computer_automation_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      computer_automation_safety_checks: {
        Row: {
          acknowledged: boolean | null
          acknowledged_at: string | null
          acknowledged_by: string | null
          action_id: string | null
          check_message: string
          check_type: string
          created_at: string
          id: string
          session_id: string
        }
        Insert: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          action_id?: string | null
          check_message: string
          check_type: string
          created_at?: string
          id?: string
          session_id: string
        }
        Update: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          action_id?: string | null
          check_message?: string
          check_type?: string
          created_at?: string
          id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "computer_automation_safety_checks_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "computer_automation_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "computer_automation_safety_checks_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "computer_automation_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      computer_automation_sessions: {
        Row: {
          completed_at: string | null
          created_at: string
          environment: string
          id: string
          status: string
          task_description: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          environment?: string
          id?: string
          status?: string
          task_description: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          environment?: string
          id?: string
          status?: string
          task_description?: string
          updated_at?: string
          user_id?: string
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
      custom_order_forms: {
        Row: {
          access_code: string | null
          created_at: string
          description: string | null
          fields: Json
          id: string
          is_active: boolean
          require_phone: boolean
          title: string
          updated_at: string
        }
        Insert: {
          access_code?: string | null
          created_at?: string
          description?: string | null
          fields?: Json
          id?: string
          is_active?: boolean
          require_phone?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          access_code?: string | null
          created_at?: string
          description?: string | null
          fields?: Json
          id?: string
          is_active?: boolean
          require_phone?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      custom_order_guests: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string | null
          phone_number: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          phone_number: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          phone_number?: string
        }
        Relationships: []
      }
      custom_order_images: {
        Row: {
          created_at: string
          id: string
          image_url: string
          order_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          order_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_order_images_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "custom_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_order_links: {
        Row: {
          access_code: string
          created_at: string
          created_by: string | null
          credits_amount: number
          custom_rate: number
          description: string | null
          expiry_date: string | null
          id: string
          is_active: boolean
          require_phone: boolean
          title: string
          updated_at: string
        }
        Insert: {
          access_code: string
          created_at?: string
          created_by?: string | null
          credits_amount?: number
          custom_rate: number
          description?: string | null
          expiry_date?: string | null
          id?: string
          is_active?: boolean
          require_phone?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          access_code?: string
          created_at?: string
          created_by?: string | null
          credits_amount?: number
          custom_rate?: number
          description?: string | null
          expiry_date?: string | null
          id?: string
          is_active?: boolean
          require_phone?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      custom_order_media: {
        Row: {
          created_at: string
          id: string
          media_type: string
          media_url: string
          order_id: string | null
          original_filename: string | null
          thumbnail_url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          media_type: string
          media_url: string
          order_id?: string | null
          original_filename?: string | null
          thumbnail_url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          media_type?: string
          media_url?: string
          order_id?: string | null
          original_filename?: string | null
          thumbnail_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_order_media_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "custom_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_orders: {
        Row: {
          admin_notes: string | null
          created_at: string
          credits_used: number
          delivered_at: string | null
          delivery_message: string | null
          delivery_url: string | null
          guest_id: string | null
          id: string
          order_link_id: string | null
          remark: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          credits_used?: number
          delivered_at?: string | null
          delivery_message?: string | null
          delivery_url?: string | null
          guest_id?: string | null
          id?: string
          order_link_id?: string | null
          remark?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          credits_used?: number
          delivered_at?: string | null
          delivery_message?: string | null
          delivery_url?: string | null
          guest_id?: string | null
          id?: string
          order_link_id?: string | null
          remark?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_orders_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "custom_order_guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_orders_order_link_id_fkey"
            columns: ["order_link_id"]
            isOneToOne: false
            referencedRelation: "custom_order_links"
            referencedColumns: ["id"]
          },
        ]
      }
      default_product_images: {
        Row: {
          context: string
          created_at: string | null
          id: string
          last_used_at: string | null
          name: string
          url: string
          user_id: string
        }
        Insert: {
          context?: string
          created_at?: string | null
          id?: string
          last_used_at?: string | null
          name: string
          url: string
          user_id: string
        }
        Update: {
          context?: string
          created_at?: string | null
          id?: string
          last_used_at?: string | null
          name?: string
          url?: string
          user_id?: string
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
      form_submissions: {
        Row: {
          created_at: string
          form_id: string
          id: string
          phone_number: string | null
          submission_data: Json
        }
        Insert: {
          created_at?: string
          form_id: string
          id?: string
          phone_number?: string | null
          submission_data: Json
        }
        Update: {
          created_at?: string
          form_id?: string
          id?: string
          phone_number?: string | null
          submission_data?: Json
        }
        Relationships: [
          {
            foreignKeyName: "form_submissions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "custom_order_forms"
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
          visibility: string
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
          visibility?: string
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
          visibility?: string
        }
        Relationships: []
      }
      manus_action_history: {
        Row: {
          action: Json
          created_at: string
          executed_at: string | null
          id: string
          reasoning: string | null
          screenshot: string | null
          session_id: string
          status: string
        }
        Insert: {
          action: Json
          created_at?: string
          executed_at?: string | null
          id?: string
          reasoning?: string | null
          screenshot?: string | null
          session_id: string
          status?: string
        }
        Update: {
          action?: Json
          created_at?: string
          executed_at?: string | null
          id?: string
          reasoning?: string | null
          screenshot?: string | null
          session_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "manus_action_history_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "manus_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      manus_sessions: {
        Row: {
          api_key: string | null
          completed_at: string | null
          created_at: string
          current_url: string | null
          environment: string
          id: string
          status: string
          task: string
          updated_at: string
          user_id: string
        }
        Insert: {
          api_key?: string | null
          completed_at?: string | null
          created_at?: string
          current_url?: string | null
          environment: string
          id?: string
          status?: string
          task: string
          updated_at?: string
          user_id: string
        }
        Update: {
          api_key?: string | null
          completed_at?: string | null
          created_at?: string
          current_url?: string | null
          environment?: string
          id?: string
          status?: string
          task?: string
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
      payment_links: {
        Row: {
          access_code: string | null
          amount: number
          created_at: string
          currency: string
          description: string | null
          expiry_date: string | null
          id: string
          is_active: boolean
          title: string
          updated_at: string
        }
        Insert: {
          access_code?: string | null
          amount: number
          created_at?: string
          currency?: string
          description?: string | null
          expiry_date?: string | null
          id?: string
          is_active?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          access_code?: string | null
          amount?: number
          created_at?: string
          currency?: string
          description?: string | null
          expiry_date?: string | null
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string
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
      product_ad_projects: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          product_image_url: string | null
          script: Json | null
          settings: Json | null
          status: Database["public"]["Enums"]["product_ad_status"] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          product_image_url?: string | null
          script?: Json | null
          settings?: Json | null
          status?: Database["public"]["Enums"]["product_ad_status"] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          product_image_url?: string | null
          script?: Json | null
          settings?: Json | null
          status?: Database["public"]["Enums"]["product_ad_status"] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      product_ad_shots: {
        Row: {
          created_at: string
          id: string
          image_url: string
          order_index: number | null
          project_id: string | null
          scene_description: string | null
          shot_type: string
          status: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          order_index?: number | null
          project_id?: string | null
          scene_description?: string | null
          shot_type: string
          status?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          order_index?: number | null
          project_id?: string | null
          scene_description?: string | null
          shot_type?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_ad_shots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "product_ad_projects"
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
      product_images: {
        Row: {
          created_at: string
          id: string
          prompt: string
          result_url: string | null
          settings: Json
          source_image_url: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          prompt: string
          result_url?: string | null
          settings?: Json
          source_image_url?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          prompt?: string
          result_url?: string | null
          settings?: Json
          source_image_url?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      product_shot_history: {
        Row: {
          created_at: string
          id: string
          ref_image_url: string | null
          result_url: string
          scene_description: string | null
          settings: Json
          source_image_url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ref_image_url?: string | null
          result_url: string
          scene_description?: string | null
          settings?: Json
          source_image_url: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ref_image_url?: string | null
          result_url?: string
          scene_description?: string | null
          settings?: Json
          source_image_url?: string
          user_id?: string
        }
        Relationships: []
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
      saved_product_images: {
        Row: {
          created_at: string
          id: string
          image_url: string
          original_filename: string | null
          storage_path: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          original_filename?: string | null
          storage_path: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          original_filename?: string | null
          storage_path?: string
          updated_at?: string
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
          "PRODUCT IMAGE": string | null
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
          "PRODUCT IMAGE"?: string | null
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
          "PRODUCT IMAGE"?: string | null
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
      user_notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          related_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          related_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          related_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_pro_subscriptions: {
        Row: {
          created_at: string | null
          end_date: string
          id: string
          start_date: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          end_date: string
          id?: string
          start_date?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          end_date?: string
          id?: string
          start_date?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
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
          visibility: string
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
          visibility?: string
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
          visibility?: string
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
      video_templates: {
        Row: {
          aspect_ratio: string
          created_at: string
          credits_cost: number
          description: string | null
          duration: string
          id: string
          is_active: boolean
          name: string
          prompt_template: string
          thumbnail_url: string
          updated_at: string
        }
        Insert: {
          aspect_ratio?: string
          created_at?: string
          credits_cost?: number
          description?: string | null
          duration?: string
          id?: string
          is_active?: boolean
          name: string
          prompt_template: string
          thumbnail_url: string
          updated_at?: string
        }
        Update: {
          aspect_ratio?: string
          created_at?: string
          credits_cost?: number
          description?: string | null
          duration?: string
          id?: string
          is_active?: boolean
          name?: string
          prompt_template?: string
          thumbnail_url?: string
          updated_at?: string
        }
        Relationships: []
      }
      work_assignments: {
        Row: {
          assigned_by: string
          created_at: string
          delivered_content: string | null
          feedback: string | null
          id: string
          status: string
          updated_at: string
          work_request_id: string
          worker_id: string
        }
        Insert: {
          assigned_by: string
          created_at?: string
          delivered_content?: string | null
          feedback?: string | null
          id?: string
          status?: string
          updated_at?: string
          work_request_id: string
          worker_id: string
        }
        Update: {
          assigned_by?: string
          created_at?: string
          delivered_content?: string | null
          feedback?: string | null
          id?: string
          status?: string
          updated_at?: string
          work_request_id?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_assignments_work_request_id_fkey"
            columns: ["work_request_id"]
            isOneToOne: true
            referencedRelation: "work_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      work_requests: {
        Row: {
          created_at: string
          credits_required: number
          description: string
          id: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credits_required?: number
          description: string
          id?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credits_required?: number
          description?: string
          id?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_admin_user: {
        Args: {
          admin_user_id: string
        }
        Returns: undefined
      }
      add_custom_order_image: {
        Args: {
          order_id_param: string
          image_url_param: string
        }
        Returns: {
          created_at: string
          id: string
          image_url: string
          order_id: string
        }
      }
      add_custom_order_media: {
        Args: {
          order_id_param: string
          media_url_param: string
          media_type_param: string
          thumbnail_url_param?: string
          original_filename_param?: string
        }
        Returns: {
          created_at: string
          id: string
          media_type: string
          media_url: string
          order_id: string | null
          original_filename: string | null
          thumbnail_url: string | null
        }
      }
      check_is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      check_pending_video_statuses: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_custom_order: {
        Args: {
          remark_text: string
          credits_amount: number
        }
        Returns: {
          admin_notes: string | null
          created_at: string
          credits_used: number
          delivered_at: string | null
          delivery_message: string | null
          delivery_url: string | null
          guest_id: string | null
          id: string
          order_link_id: string | null
          remark: string | null
          status: string
          updated_at: string
          user_id: string
        }
      }
      deduct_credits: {
        Args: {
          user_id: string
          credits_to_deduct: number
        }
        Returns: undefined
      }
      deliver_custom_order: {
        Args: {
          order_id_param: string
          delivery_url_param: string
          delivery_message_param: string
        }
        Returns: undefined
      }
      get_admin_users: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }[]
      }
      get_admin_users_for_messaging: {
        Args: Record<PropertyKey, never>
        Returns: unknown[]
      }
      get_pending_custom_orders_count: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      get_table_count: {
        Args: {
          table_name: string
        }
        Returns: number
      }
      get_unread_messages_count: {
        Args: {
          user_id: string
        }
        Returns: number
      }
      get_video_templates: {
        Args: Record<PropertyKey, never>
        Returns: {
          aspect_ratio: string
          created_at: string
          credits_cost: number
          description: string | null
          duration: string
          id: string
          is_active: boolean
          name: string
          prompt_template: string
          thumbnail_url: string
          updated_at: string
        }[]
      }
      remove_admin_user: {
        Args: {
          admin_user_id: string
        }
        Returns: undefined
      }
      safely_decrease_chat_credits: {
        Args: {
          credit_amount: number
        }
        Returns: boolean
      }
      safely_decrease_credits: {
        Args: {
          amount: number
        }
        Returns: boolean
      }
      safely_decrease_decimal_credits: {
        Args: {
          amount: number
        }
        Returns: boolean
      }
      update_custom_order_status: {
        Args: {
          order_id_param: string
          new_status: string
          admin_notes_text?: string
        }
        Returns: undefined
      }
      update_video_generation_status: {
        Args: {
          p_request_id: string
          p_status: string
          p_result_url?: string
        }
        Returns: undefined
      }
      user_is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      image_generation_status: "pending" | "processing" | "completed" | "failed"
      product_ad_status:
        | "draft"
        | "script_generated"
        | "shots_generated"
        | "video_generated"
        | "completed"
        | "failed"
      user_role: "user" | "worker" | "admin"
      video_generation_status:
        | "pending"
        | "in_queue"
        | "processing"
        | "completed"
        | "failed"
      video_generation_status_new:
        | "in_queue"
        | "processing"
        | "completed"
        | "failed"
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
