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
  // Added field
  payment_method?: string;
}
