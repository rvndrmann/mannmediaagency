
export interface CustomOrder {
  id: string;
  user_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'payment_pending' | 'payment_failed';
  remark: string | null;
  created_at: string;
  updated_at: string;
  admin_notes: string | null;
  credits_used: number;
  delivery_url: string | null;
  delivered_at: string | null;
  delivery_message: string | null;
  guest_id?: string | null;
  order_link_id?: string | null;
}

export interface CustomOrderImage {
  id: string;
  order_id: string;
  image_url: string;
  created_at: string;
}

export interface CustomOrderMedia {
  id: string;
  order_id: string;
  media_url: string;
  media_type: 'image' | 'video';
  thumbnail_url?: string | null;
  original_filename?: string | null;
  created_at: string;
}

export interface User {
  id: string;
  username: string | null;
  created_at: string;
}

export interface AdminUser {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  related_id: string | null;
  created_at: string;
}

export interface PaymentTransaction {
  id: string;
  amount: number;
  status: string;
  payment_status: string;
  transaction_id: string;
  created_at: string;
  user_id: string;
  related_order_id?: string;
}
