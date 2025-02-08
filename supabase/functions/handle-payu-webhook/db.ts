
import { createClient } from '@supabase/supabase-js';
import { PaymentStatus } from './types.ts';

export class DatabaseService {
  private supabase;

  constructor() {
    this.supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
  }

  private log(action: string, data: Record<string, unknown>) {
    const timestamp = new Date().toISOString();
    console.log(JSON.stringify({
      timestamp,
      type: 'DATABASE_ACTION',
      action,
      ...data
    }));
  }

  async updatePaymentStatus(
    transactionId: string, 
    status: PaymentStatus, 
    payuResponse: Record<string, any>
  ) {
    this.log('START_UPDATE', {
      transactionId,
      status,
      payuTransactionId: payuResponse.mihpayid
    });

    try {
      // Update payment transaction
      const { data: txnData, error: txnError } = await this.supabase
        .from('payment_transactions')
        .update({
          status: status,
          payment_status: status,
          payu_transaction_id: payuResponse.mihpayid,
          payment_response: payuResponse,
          webhook_received_at: new Date().toISOString(),
        })
        .eq('transaction_id', transactionId)
        .select()
        .single();

      if (txnError) {
        this.log('ERROR_UPDATING_TRANSACTION', { error: txnError });
        throw txnError;
      }

      this.log('TRANSACTION_UPDATED', {
        transactionId,
        newStatus: status,
        updatedAt: txnData?.webhook_received_at
      });

      // Get subscription ID for this transaction
      const { data: subscriptionData, error: fetchError } = await this.supabase
        .from('payment_transactions')
        .select('subscription_id, user_id')
        .eq('transaction_id', transactionId)
        .single();

      if (fetchError) {
        this.log('ERROR_FETCHING_SUBSCRIPTION', { error: fetchError });
        throw fetchError;
      }

      if (!subscriptionData?.subscription_id) {
        this.log('ERROR_NO_SUBSCRIPTION', { transactionId });
        throw new Error('No subscription found for transaction');
      }

      this.log('FOUND_SUBSCRIPTION', {
        subscriptionId: subscriptionData.subscription_id,
        userId: subscriptionData.user_id
      });

      // Update subscription status
      const subscriptionStatus = status === 'success' ? 'active' : 'failed';
      const { data: subData, error: subError } = await this.supabase
        .from('subscriptions')
        .update({
          status: subscriptionStatus,
          payment_status: status,
          payu_transaction_id: payuResponse.mihpayid,
          updated_at: new Date().toISOString()
        })
        .eq('id', subscriptionData.subscription_id)
        .select()
        .single();

      if (subError) {
        this.log('ERROR_UPDATING_SUBSCRIPTION', { error: subError });
        throw subError;
      }

      this.log('SUBSCRIPTION_UPDATED', {
        status: subscriptionStatus,
        subscriptionId: subscriptionData.subscription_id,
        updatedAt: subData?.updated_at
      });

      // Verify credits were updated by checking user_credits
      const { data: creditsData, error: creditsError } = await this.supabase
        .from('user_credits')
        .select('credits_remaining, updated_at')
        .eq('user_id', subscriptionData.user_id)
        .single();

      if (creditsError) {
        this.log('ERROR_CHECKING_CREDITS', { error: creditsError });
      } else {
        this.log('CREDITS_STATUS', {
          credits: creditsData?.credits_remaining,
          lastUpdated: creditsData?.updated_at
        });
      }

    } catch (error) {
      this.log('ERROR_IN_UPDATE_PAYMENT', { error: error.message });
      throw error;
    }
  }
}
