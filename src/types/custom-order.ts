
export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

export interface CustomOrderMedia {
  id: string;
  order_id: string;
  media_url: string;
  media_type: 'image' | 'video';
  thumbnail_url?: string | null;
  original_filename?: string;
  created_at: string;
}

export interface CustomOrder {
  id: string;
  user_id: string;
  remark: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  credits_used: number;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
  delivered_at?: string;
  delivery_url?: string;
  delivery_message?: string;
  custom_order_media?: CustomOrderMedia[];
}

export interface User {
  id: string;
  email?: string;
  username?: string | null;
  created_at: string;
}

export interface AdminUser {
  user_id: string;
  created_at: string;
}

export interface VideoTemplate {
  id: string;
  name: string;
  description: string;
  thumbnail_url: string;
  prompt_template: string;
  duration: string;
  aspect_ratio: string;
  credits_cost: number;
  is_active: boolean;
  created_at: string;
}
