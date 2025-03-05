
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "./cors.ts";

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const params: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      params[key] = value.toString();
    }

    console.log('Payment webhook received:', {
      txnid: params.txnid,
      status: params.status,
      amount: params.amount
    });

    // Get the transaction from the database
    const { data: txnData, error: txnError } = await supabaseAdmin
      .from('payment_transactions')
      .select('*')
      .eq('transaction_id', params.txnid)
      .single();

    if (txnError) {
      console.error('Transaction fetch error:', txnError);
      throw new Error('Failed to fetch transaction data');
    }

    // Update the transaction
    const { error: updateError } = await supabaseAdmin
      .from('payment_transactions')
      .update({
        payment_status: params.status,
        payu_transaction_id: params.mihpayid,
        payu_data: params,
        status: params.status === 'success' ? 'completed' : 'failed',
        webhook_received_at: new Date().toISOString()
      })
      .eq('transaction_id', params.txnid);

    if (updateError) {
      console.error('Transaction update error:', updateError);
      throw new Error('Failed to update transaction');
    }

    // If there's a related order, update it
    if (txnData.related_order_id) {
      const { error: orderUpdateError } = await supabaseAdmin
        .from('custom_orders')
        .update({
          status: params.status === 'success' ? 'pending' : 'payment_failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', txnData.related_order_id);

      if (orderUpdateError) {
        console.error('Order update error:', orderUpdateError);
        // Don't fail the webhook if order update fails
      } else {
        console.log('Order status updated:', txnData.related_order_id);
      }
    }

    console.log('Payment webhook processed successfully');
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

// Initialize Supabase client with admin privileges
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

function createClient(url: string, key: string) {
  const { createClient } = require('https://esm.sh/@supabase/supabase-js@2.38.0');
  return createClient(url, key);
}
