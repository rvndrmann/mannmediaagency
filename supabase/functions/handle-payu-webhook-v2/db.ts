
import { Logger } from "./types.ts";

export class DatabaseService {
  private supabase;
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
    this.supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
  }

  async updatePaymentStatus(txnId: string, status: string, payuData: Record<string, string>) {
    try {
      this.logger.info(`Updating payment status for transaction ${txnId}`, { status });
      
      // Get the transaction record
      const { data: txnData, error: txnError } = await this.supabase
        .from('payment_transactions')
        .select('*')
        .eq('transaction_id', txnId)
        .single();
        
      if (txnError) {
        this.logger.error(`Error fetching transaction ${txnId}`, txnError);
        throw new Error(`Transaction not found: ${txnError.message}`);
      }
      
      const orderId = txnData.related_order_id;
      
      // Update payment transaction status
      const { error: updateError } = await this.supabase
        .from('payment_transactions')
        .update({ 
          payment_status: status, 
          payu_data: payuData,
          payu_transaction_id: payuData.mihpayid,
          status: status === 'success' ? 'completed' : status === 'failure' ? 'failed' : 'pending',
          webhook_received_at: new Date().toISOString(),
          payment_response: payuData
        })
        .eq('transaction_id', txnId);
        
      if (updateError) {
        this.logger.error(`Error updating transaction ${txnId}`, updateError);
        throw new Error(`Failed to update transaction: ${updateError.message}`);
      }
      
      // Update related custom order if present
      if (orderId) {
        this.logger.info(`Updating related order ${orderId}`, { status });
        
        const orderStatus = status === 'success' ? 'pending' : 'payment_failed';
        
        const { error: orderUpdateError } = await this.supabase
          .from('custom_orders')
          .update({ 
            status: orderStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', orderId);
          
        if (orderUpdateError) {
          this.logger.error(`Error updating order ${orderId}`, orderUpdateError);
          // Don't throw, just log the error
          this.logger.info(`Order update failed but payment update successful`);
        }
      }
      
      // Add credits to user account if payment successful
      if (status === 'success') {
        const userId = txnData.user_id;
        if (userId) {
          await this.addCreditsToUser(userId, txnData.amount, txnId);
        }
        
        // If this was a subscription payment, update the subscription status
        if (txnData.subscription_id) {
          await this.updateSubscription(txnData.subscription_id, status);
        }
      }
      
      this.logger.info(`Payment status updated successfully for ${txnId}`, { status });
    } catch (error) {
      this.logger.error(`Payment status update failed for ${txnId}`, error);
      throw error;
    }
  }
  
  private async addCreditsToUser(userId: string, amount: number, txnId: string) {
    try {
      this.logger.info(`Adding credits for user ${userId}`, { amount });
      
      // Determine the amount of credits
      let creditsToAdd = 0;
      
      if (amount === 299) {
        creditsToAdd = 10;  // Basic plan
      } else if (amount === 2499) {
        creditsToAdd = 100; // Pro plan
      } else {
        // For custom amounts, use a proportional value or custom mapping
        creditsToAdd = Math.round(amount / 30); // Rough estimate, adjust as needed
      }
      
      if (creditsToAdd <= 0) {
        this.logger.info(`No credits to add for payment amount ${amount}`);
        return;
      }
      
      // Get current credits
      const { data: creditsData, error: creditsError } = await this.supabase
        .from('user_credits')
        .select('credits_remaining')
        .eq('user_id', userId)
        .single();
        
      if (creditsError && creditsError.code !== 'PGRST116') { // Not found error
        this.logger.error(`Error fetching credits for user ${userId}`, creditsError);
        throw new Error(`Failed to fetch user credits: ${creditsError.message}`);
      }
      
      const currentCredits = creditsData?.credits_remaining || 0;
      const newCredits = currentCredits + creditsToAdd;
      
      // Update or insert credits
      const { error: updateError } = await this.supabase
        .from('user_credits')
        .upsert({
          user_id: userId,
          credits_remaining: newCredits,
          updated_at: new Date().toISOString()
        });
        
      if (updateError) {
        this.logger.error(`Error updating credits for user ${userId}`, updateError);
        throw new Error(`Failed to update user credits: ${updateError.message}`);
      }
      
      // Log the credit update
      const { error: logError } = await this.supabase
        .from('credit_update_logs')
        .insert({
          user_id: userId,
          credits_before: currentCredits,
          credits_after: newCredits,
          status: 'success',
          trigger_source: 'payment',
          plan_name: `Payment: ${amount}`,
          transaction_id: txnId
        });
        
      if (logError) {
        this.logger.error(`Error logging credit update for user ${userId}`, logError);
        // Don't throw, just log the error
      }
      
      this.logger.info(`Added ${creditsToAdd} credits for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to add credits for user ${userId}`, error);
      throw error;
    }
  }
  
  private async updateSubscription(subscriptionId: string, status: string) {
    try {
      this.logger.info(`Updating subscription ${subscriptionId}`, { status });
      
      const { error: subError } = await this.supabase
        .from('subscriptions')
        .update({
          status: status === 'success' ? 'active' : 'failed',
          payment_status: status,
          updated_at: new Date().toISOString()
        })
        .eq('id', subscriptionId);
        
      if (subError) {
        this.logger.error(`Error updating subscription ${subscriptionId}`, subError);
        throw new Error(`Failed to update subscription: ${subError.message}`);
      }
      
      this.logger.info(`Subscription ${subscriptionId} updated successfully`);
    } catch (error) {
      this.logger.error(`Failed to update subscription ${subscriptionId}`, error);
      // Don't throw, just log the error
    }
  }
}

function createClient(url: string, key: string) {
  const { createClient } = require('https://esm.sh/@supabase/supabase-js@2.38.0');
  return createClient(url, key);
}
