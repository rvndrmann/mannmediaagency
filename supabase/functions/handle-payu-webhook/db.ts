
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
    console.log('Database Service - Updating payment status:', {
      transactionId,
      status,
      payuTransactionId: payuResponse.mihpayid
    })

    try {
      // Update payment transaction
      const { error: txnError } = await this.supabase
        .from('payment_transactions')
        .update({
          status: status,
          payment_status: status,
          payu_transaction_id: payuResponse.mihpayid,
          payment_response: payuResponse,
          webhook_received_at: new Date().toISOString(),
        })
        .eq('transaction_id', transactionId)

      if (txnError) {
        console.error('Database Service - Error updating payment transaction:', txnError)
        throw txnError
      }

      console.log('Database Service - Payment transaction updated successfully')

      // Get subscription ID for this transaction
      const { data: txnData, error: fetchError } = await this.supabase
        .from('payment_transactions')
        .select('subscription_id')
        .eq('transaction_id', transactionId)
        .single()

      if (fetchError) {
        console.error('Database Service - Error fetching subscription ID:', fetchError)
        throw fetchError
      }

      if (!txnData?.subscription_id) {
        console.error('Database Service - No subscription found for transaction')
        throw new Error('No subscription found for transaction')
      }

      // Update subscription status
      const { error: subError } = await this.supabase
        .from('subscriptions')
        .update({
          status: status === 'success' ? 'active' : 'failed',
          payment_status: status,
          payu_transaction_id: payuResponse.mihpayid,
          updated_at: new Date().toISOString()
        })
        .eq('id', txnData.subscription_id)

      if (subError) {
        console.error('Database Service - Error updating subscription:', subError)
        throw subError
      }

      console.log('Database Service - Subscription updated successfully')
    } catch (error) {
      console.error('Database Service - Error in updatePaymentStatus:', error)
      throw error
    }
  }
}
