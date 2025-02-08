
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
      // Begin by fetching the transaction to get user_id
      const { data: txnData, error: fetchError } = await this.supabase
        .from('payment_transactions')
        .select('user_id, amount')
        .eq('transaction_id', transactionId)
        .single();

      if (fetchError) {
        this.logger.error('Failed to fetch transaction details', fetchError);
        throw fetchError;
      }

      if (!txnData?.user_id) {
        this.logger.error('No user found for transaction', { transactionId });
        throw new Error('No user found for transaction');
      }

      this.logger.info('Found transaction', {
        userId: txnData.user_id,
        amount: txnData.amount
      });

      // Create audit log entry
      const { error: auditError } = await this.supabase
        .from('audit_logs')
        .insert({
          event_type: 'payment_webhook_received',
          data: {
            transaction_id: transactionId,
            status,
            payu_response: payuResponse,
            user_id: txnData.user_id,
            amount: txnData.amount
          }
        });

      if (auditError) {
        this.logger.error('Failed to create audit log', auditError);
        // Continue processing even if audit log fails
      }

      // Update payment transaction
      const { error: txnError } = await this.supabase
        .from('payment_transactions')
        .update({
          status: status === 'success' ? 'completed' : 'failed',
          payment_status: status,
          payu_transaction_id: payuResponse.mihpayid,
          payment_response: payuResponse,
          webhook_received_at: new Date().toISOString(),
        })
        .eq('transaction_id', transactionId);

      if (txnError) {
        this.logger.error('Failed to update transaction', txnError);
        throw txnError;
      }

      this.logger.info('Transaction updated successfully');

      // Log current credits for verification
      const { data: creditsData, error: creditsError } = await this.supabase
        .from('user_credits')
        .select('credits_remaining, updated_at')
        .eq('user_id', txnData.user_id)
        .maybeSingle();

      if (creditsError) {
        this.logger.error('Failed to check credits', creditsError);
      } else {
        this.logger.info('Credits status after update', {
          userId: txnData.user_id,
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
