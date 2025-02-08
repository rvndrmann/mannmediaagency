
import { createClient } from '@supabase/supabase-js';
import { PaymentStatus } from './types.ts';
import { Logger } from './types.ts';

export class DatabaseService {
  private supabase;
  private logger: Logger;

  constructor(logger: Logger) {
    this.supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    this.logger = logger;
  }

  async updatePaymentStatus(
    transactionId: string, 
    status: PaymentStatus, 
    payuResponse: Record<string, any>
  ) {
    this.logger.info('Starting payment status update', {
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
        this.logger.error('Failed to update transaction', txnError);
        throw txnError;
      }

      this.logger.info('Transaction updated', {
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
        this.logger.error('Failed to fetch subscription', fetchError);
        throw fetchError;
      }

      if (!subscriptionData?.subscription_id) {
        this.logger.error('No subscription found', { transactionId });
        throw new Error('No subscription found for transaction');
      }

      this.logger.info('Found subscription', {
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
        this.logger.error('Failed to update subscription', subError);
        throw subError;
      }

      this.logger.info('Subscription updated', {
        status: subscriptionStatus,
        subscriptionId: subscriptionData.subscription_id,
        updatedAt: subData?.updated_at
      });

      // Verify credits
      const { data: creditsData, error: creditsError } = await this.supabase
        .from('user_credits')
        .select('credits_remaining, updated_at')
        .eq('user_id', subscriptionData.user_id)
        .single();

      if (creditsError) {
        this.logger.error('Failed to check credits', creditsError);
      } else {
        this.logger.info('Credits status', {
          credits: creditsData?.credits_remaining,
          lastUpdated: creditsData?.updated_at
        });
      }

    } catch (error) {
      this.logger.error('Failed to update payment status', error);
      throw error;
    }
  }
}
