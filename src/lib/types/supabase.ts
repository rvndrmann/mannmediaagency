
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      agent_interactions: {
        Row: {
          id: string
          user_id: string
          agent_type: string
          user_message: string
          assistant_response: string
          created_at: string
          has_attachments: boolean
          metadata: Json | null
        }
        Insert: {
          id?: string
          user_id: string
          agent_type: string
          user_message: string
          assistant_response: string
          created_at?: string
          has_attachments?: boolean
          metadata?: Json | null
        }
        Update: {
          id?: string
          user_id?: string
          agent_type?: string
          user_message?: string
          assistant_response?: string
          created_at?: string
          has_attachments?: boolean
          metadata?: Json | null
        }
      }
      // Add other tables as needed
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in keyof SupabaseRpcFunctions]: {
        Args: Parameters<SupabaseRpcFunctions[_]>[0]
        Returns: ReturnType<SupabaseRpcFunctions[_]>
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
