
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
    console.log('Database Service - Starting payment status update:', {
      transactionId,
      status,
      payuTransactionId: payuResponse.mihpayid
    })

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
        .single()

      if (txnError) {
        console.error('Database Service - Error updating payment transaction:', txnError)
        throw txnError
      }

      console.log('Database Service - Payment transaction updated successfully:', {
        transactionId,
        newStatus: status,
        updatedAt: txnData?.webhook_received_at
      })

      // Get subscription ID for this transaction
      const { data: subscriptionData, error: fetchError } = await this.supabase
        .from('payment_transactions')
        .select('subscription_id, user_id')
        .eq('transaction_id', transactionId)
        .single()

      if (fetchError) {
        console.error('Database Service - Error fetching subscription ID:', fetchError)
        throw fetchError
      }

      if (!subscriptionData?.subscription_id) {
        console.error('Database Service - No subscription found for transaction')
        throw new Error('No subscription found for transaction')
      }

      console.log('Database Service - Found subscription:', {
        subscriptionId: subscriptionData.subscription_id,
        userId: subscriptionData.user_id
      })

      // Update subscription status
      const subscriptionStatus = status === 'success' ? 'active' : 'failed'
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
        .single()

      if (subError) {
        console.error('Database Service - Error updating subscription:', subError)
        throw subError
      }

      console.log('Database Service - Subscription updated successfully:', {
        status: subscriptionStatus,
        subscriptionId: subscriptionData.subscription_id,
        updatedAt: subData?.updated_at
      })

      // Verify credits were updated by checking user_credits
      const { data: creditsData, error: creditsError } = await this.supabase
        .from('user_credits')
        .select('credits_remaining, updated_at')
        .eq('user_id', subscriptionData.user_id)
        .single()

      if (creditsError) {
        console.error('Database Service - Error checking user credits:', creditsError)
      } else {
        console.log('Database Service - Current user credits:', {
          credits: creditsData?.credits_remaining,
          lastUpdated: creditsData?.updated_at
        })
      }

    } catch (error) {
      console.error('Database Service - Error in updatePaymentStatus:', error)
      throw error
    }
  }
}

