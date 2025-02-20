
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

export class DatabaseService {
  public supabase;

  constructor() {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async createPaymentTransaction(userId: string, txnId: string, amount: number) {
    const { error } = await this.supabase
      .from('payment_transactions')
      .insert({
        user_id: userId,
        transaction_id: txnId,
        amount: amount,
        status: 'pending',
        payment_status: 'pending'
      });

    if (error) {
      console.error('DB Error - Create Transaction:', error);
      throw error;
    }
  }
}
