
export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

export interface MessageCount {
  count: number;
}

export interface User {
  id: string;
  email: string;
  phone?: string;
  created_at: string;
}

export interface AdminUser {
  user_id: string;
  created_at: string;
}

export interface CustomOrder {
  id: string;
  user_id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
  // Add additional fields used in AdminCustomOrders
  admin_notes?: string;
  credits_used?: number;
  delivered_at?: string;
  delivery_message?: string;
  delivery_url?: string;
  guest_id?: string;
  order_link_id?: string;
  remark?: string;
}

export interface CustomOrderMedia {
  id: string;
  order_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  created_at: string;
  // Add fields used in AdminCustomOrders
  media_type?: string;
  media_url?: string;
  original_filename?: string;
  thumbnail_url?: string;
}

export interface VideoTemplate {
  id: string;
  title?: string;
  description: string;
  thumbnail_url: string;
  video_url?: string;
  category?: string;
  tags?: string[];
  duration: number | string;
  created_at: string;
  updated_at: string;
  // Add fields used in VideoTemplates component
  name?: string;
  aspect_ratio?: string;
  credits_cost?: number;
  is_active?: boolean;
  prompt_template?: string;
}
