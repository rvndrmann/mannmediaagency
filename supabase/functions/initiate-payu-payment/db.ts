
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'
import { PaymentRequest, SubscriptionRecord } from './types.ts'

export class DatabaseService {
  private supabase;

  constructor() {
    this.supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
  }

  async createSubscription(params: PaymentRequest): Promise<SubscriptionRecord> {
    const { data: subscription, error } = await this.supabase
      .from('subscriptions')
      .insert({
        user_id: params.userId,
        status: 'pending',
        amount: params.amount,
        plan_name: params.planName
      })
      .select()
      .single()

    if (error) {
      console.error('Subscription error:', error)
      throw new Error('Failed to create subscription')
    }

    return subscription
  }

  async createPaymentTransaction(userId: string, txnId: string, amount: number, subscriptionId: string) {
    const { error: txnError } = await this.supabase
      .from('payment_transactions')
      .insert({
        user_id: userId,
        transaction_id: txnId,
        amount: amount,
        status: 'pending',
        payment_method: 'payu',
        subscription_id: subscriptionId
      })

    if (txnError) {
      console.error('Transaction error:', txnError)
      throw new Error('Failed to create transaction')
    }
  }

  async getUserEmail(userId: string): Promise<string> {
    const { data: { user }, error: userError } = await this.supabase.auth.admin.getUserById(userId)
    if (userError || !user) {
      console.error('User error:', userError)
      throw new Error('Failed to get user details')
    }
    return user.email || ''
  }
}
