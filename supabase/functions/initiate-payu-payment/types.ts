
export interface PaymentRequest {
  userId?: string;
  guestId?: string;
  planName: string;
  amount: number;
  orderId?: string;
}

export interface SubscriptionRecord {
  id: string;
  user_id: string;
  status: string;
  amount: number;
  plan_name: string;
}
