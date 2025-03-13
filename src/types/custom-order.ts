
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
}

export interface CustomOrderMedia {
  id: string;
  order_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  created_at: string;
}

export interface VideoTemplate {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  video_url: string;
  category: string;
  tags: string[];
  duration: number;
  created_at: string;
  updated_at: string;
}
