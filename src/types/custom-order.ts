
export interface CustomOrder {
  id: string;
  user_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  remark: string | null;
  created_at: string;
  updated_at: string;
  admin_notes: string | null;
  credits_used: number;
}

export interface CustomOrderImage {
  id: string;
  order_id: string;
  image_url: string;
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
