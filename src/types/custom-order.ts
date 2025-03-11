
export interface CustomOrder {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  status: "pending" | "in_progress" | "completed" | "failed" | "payment_pending" | "payment_failed" | string;
  remark: string;
  delivered_at: string;
  delivery_message: string;
  delivery_url: string;
  credits_used: number;
  guest_id: string;
  order_link_id: string;
  admin_notes: string;
  // Added fields
  payment_status?: string;
  order_number?: string;
  service_type?: string;
  amount?: number;
  description?: string;
  requirements?: string;
}

export interface CustomOrderMedia {
  id: string;
  order_id: string;
  media_url: string;
  media_type: "video" | "image" | string;
  created_at: string;
  thumbnail_url: string;
  original_filename: string;
  // Added field
  filename?: string;
}

export interface PaymentTransaction {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  amount: number;
  status: string;
  transaction_id: string;
  payment_processor: string;
  related_order_id: string;
  gateway_response: any;
  // Added fields
  payment_method?: string;
  payment_status?: string;
  payu_data?: any;
  payu_transaction_id?: string;
  webhook_received_at?: string;
  payment_response?: any;
}

export interface VideoTemplate {
  id: string;
  name: string;
  description: string;
  thumbnail_url: string;
  preset_id?: string; // Make preset_id optional since it might not exist in all templates
  created_at: string;
  updated_at: string;
  credits_cost: number;
  is_active: boolean;
  aspect_ratio: string;
  category?: string;
  service_id?: string;
  // Additional fields from actual DB
  prompt_template?: string;
  duration?: string;
  video_url?: string;
}

export interface User {
  id: string;
  username?: string;
  email?: string;
  created_at: string;
  last_sign_in?: string;
  user_metadata?: Record<string, any>;
}

export interface AdminUser {
  id: string;
  user_id: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  created_at: string;
  read: boolean;
  action_url?: string;
  notification_type?: string;
}
