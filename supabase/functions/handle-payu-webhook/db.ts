
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

export class DatabaseService {
  private supabase;

  constructor() {
    this.supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
  }

  async updatePaymentStatus(
    transactionId: string, 
    status: string, 
    payuResponse: Record<string, any>
  ) {
    const { error } = await this.supabase
      .from('payment_transactions')
      .update({
        status: status.toLowerCase(),
        payment_status: status,
        payment_response: payuResponse,
        webhook_received_at: new Date().toISOString(),
      })
      .eq('transaction_id', transactionId)

    if (error) {
      console.error('Error updating payment status:', error)
      throw new Error('Failed to update payment status')
    }

    // If payment is successful, update subscription status
    if (status.toLowerCase() === 'success') {
      const { data: transaction } = await this.supabase
        .from('payment_transactions')
        .select('subscription_id')
        .eq('transaction_id', transactionId)
        .single()

      if (transaction?.subscription_id) {
        const { error: subError } = await this.supabase
          .from('subscriptions')
          .update({
            status: 'active',
            payment_status: 'completed',
            updated_at: new Date().toISOString()
          })
          .eq('id', transaction.subscription_id)

        if (subError) {
          console.error('Error updating subscription:', subError)
          throw new Error('Failed to update subscription status')
        }
      }
    }
  }
}
