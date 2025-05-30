
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

  async createPaymentTransaction(userId: string | null, guestId: string | null, txnId: string, amount: number, orderId: string | null = null) {
    console.log('Creating payment transaction:', { userId, guestId, txnId, amount, orderId });
    
    const { error: txnError } = await this.supabase
      .from('payment_transactions')
      .insert({
        user_id: userId,
        guest_id: guestId,
        transaction_id: txnId,
        amount: amount,
        status: 'pending',
        payment_method: 'payu',
        related_order_id: orderId
      })

    if (txnError) {
      console.error('Transaction creation error:', txnError);
      throw new Error(`Failed to create transaction: ${txnError.message}`);
    }

    console.log('Payment transaction created successfully');
  }

  async getUserEmail(userId: string): Promise<string> {
    console.log('Fetching user details for:', userId);
    
    // Get user details from auth.users
    const { data, error: userError } = await this.supabase.auth.admin.getUserById(userId);
    
    if (userError || !data?.user) {
      console.error('User fetch error:', userError);
      throw new Error('Failed to get user details');
    }

    console.log('User details fetched:', {
      hasEmail: !!data.user.email,
      hasPhone: !!data.user.phone,
      provider: data.user.app_metadata?.provider
    });

    // Use email if available, otherwise use phone number
    const userIdentifier = data.user.email || data.user.phone;
    
    if (!userIdentifier) {
      console.error('No email or phone found for user');
      throw new Error('No contact information found for user');
    }
    
    // For PayU requirements, if using phone, create a placeholder email
    const contactInfo = data.user.email || `user.${userId}@example.com`;
    
    console.log('User contact info resolved successfully');
    return contactInfo;
  }
  
  async getGuestInfo(guestId: string): Promise<any> {
    console.log('Fetching guest details for:', guestId);
    
    const { data, error } = await this.supabase
      .from('custom_order_guests')
      .select('*')
      .eq('id', guestId)
      .single();
    
    if (error) {
      console.error('Guest fetch error:', error);
      throw new Error('Failed to get guest details');
    }
    
    if (!data) {
      throw new Error('Guest not found');
    }
    
    console.log('Guest details fetched successfully');
    return data;
  }
}
