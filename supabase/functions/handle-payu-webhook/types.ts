
export interface PayUWebhookPayload {
  txnid: string;
  status: string;
  amount: string;
  mihpayid: string;
  mode: string;
  hash: string;
  error?: string;
  error_Message?: string;
  bank_ref_num?: string;
  bankcode?: string;
  cardnum?: string;
  name_on_card?: string;
  issuing_bank?: string;
  cardtype?: string;
}

export type PaymentStatus = 'success' | 'failure' | 'pending' | 'cancelled';
