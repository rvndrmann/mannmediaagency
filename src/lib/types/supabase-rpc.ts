
import { Database } from '@/lib/types/supabase';

declare global {
  interface SupabaseRpcFunctions {
    get_agent_trace_analytics: (args: { user_id_param: string }) => any;
    get_user_conversations: (args: { user_id_param: string }) => any;
    get_conversation_trace: (args: { conversation_id: string, user_id_param: string }) => any;
    safely_decrease_chat_credits: (args: { credit_amount: number }) => boolean;
    check_is_admin: () => boolean;
    user_is_admin: () => boolean;
    get_unread_messages_count: (args: { user_id: string }) => number;
    get_pending_custom_orders_count: () => number;
    add_admin_user: (args: { admin_user_id: string }) => null;
    remove_admin_user: (args: { admin_user_id: string }) => null;
    add_custom_order_image: (args: { order_id_param: string, image_url_param: string }) => any;
    add_custom_order_media: (args: { 
      order_id_param: string, 
      media_url_param: string, 
      media_type_param: string, 
      thumbnail_url_param?: string, 
      original_filename_param?: string 
    }) => any;
    create_custom_order: (args: { remark_text: string, credits_amount: number }) => any;
    update_custom_order_status: (args: { 
      order_id_param: string, 
      new_status: string, 
      admin_notes_text?: string 
    }) => null;
    deliver_custom_order: (args: { 
      order_id_param: string, 
      delivery_url_param: string, 
      delivery_message_param: string 
    }) => null;
    deduct_credits: (args: { user_id: string, credits_to_deduct: number }) => null;
    get_video_templates: () => any[];
    update_video_generation_status: (args: { 
      p_request_id: string, 
      p_status: string, 
      p_result_url?: string 
    }) => null;
    get_table_count: (args: { table_name: string }) => number;
    safely_decrease_decimal_credits: (args: { amount: number }) => boolean;
    check_credits_before_work_request: (args: { 
      credit_amount: number 
    }) => null;
  }
}

export {};
