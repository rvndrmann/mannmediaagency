
export type CustomOrderStatus = "pending" | "in_progress" | "completed" | "failed";

export interface CustomOrderMedia {
  id: string;
  order_id: string;
  media_url: string;
  thumbnail_url: string;
  original_filename: string;
  media_type: string;
  created_at: string;
}

export interface CustomOrderImage {
  id: string;
  order_id: string;
  image_url: string;
  created_at: string;
}

export interface CustomOrder {
  id: string;
  user_id: string;
  guest_id?: string;
  status: CustomOrderStatus;
  remark: string;
  admin_notes?: string;
  delivery_url?: string;
  delivery_message?: string;
  delivered_at?: string;
  created_at: string;
  updated_at: string;
  order_link_id?: string;
  credits_used: number;
  custom_order_media?: CustomOrderMedia[];
  custom_order_images?: CustomOrderImage[];
}

export interface CustomOrderWithMedia extends CustomOrder {
  custom_order_media: CustomOrderMedia[];
  custom_order_images: CustomOrderImage[];
}

export interface User {
  id: string;
  email: string;
  phone: string;
  created_at: string;
  updated_at: string;
  full_name?: string;
  avatar_url?: string;
  is_admin?: boolean;
  credits_remaining?: number;
}

export interface AdminUser extends User {
  is_admin: true;
  role?: string;
}

export interface VideoTemplate {
  id: string;
  name: string;
  description: string;
  thumbnail_url: string;
  video_url: string;
  category: string;
  tags: string[];
  duration: number;
  created_at: string;
  updated_at: string;
  is_featured: boolean;
  credit_cost: number;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
  action_url?: string;
  action_text?: string;
}
