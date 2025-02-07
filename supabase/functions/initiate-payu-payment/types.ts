
export interface PaymentRequest {
  userId: string;
  planName: string;
  amount: number;
}

export interface SubscriptionRecord {
  id: string;
  user_id: string;
  status: string;
  amount: number;
  plan_name: string;
}
