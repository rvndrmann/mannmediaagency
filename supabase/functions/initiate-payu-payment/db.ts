
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'
import { PaymentRequest } from './types.ts'

export class DatabaseService {
  private supabase;

  constructor() {
    this.supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
  }

  async createPaymentTransaction(userId: string, txnId: string, amount: number) {
    console.log('Creating payment transaction:', { userId, txnId, amount });
    
    const { error: txnError } = await this.supabase
      .from('payment_transactions')
      .insert({
        user_id: userId,
        transaction_id: txnId,
        amount: amount,
        status: 'pending',
        payment_method: 'payu'
      })

    if (txnError) {
      console.error('Transaction creation error:', txnError);
      throw new Error(`Failed to create transaction: ${txnError.message}`);
    }

    console.log('Payment transaction created successfully');
  }

  async getUserEmail(userId: string): Promise<string> {
    console.log('Fetching email for user:', userId);
    
    const { data: { user }, error: userError } = await this.supabase.auth.admin.getUserById(userId)
    if (userError || !user) {
      console.error('User fetch error:', userError);
      throw new Error('Failed to get user details');
    }
    
    console.log('User email fetched successfully');
    return user.email || '';
  }
}
