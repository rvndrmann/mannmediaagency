
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'
import { corsHeaders } from "../initiate-payu-payment/cors.ts"

const PAYU_BASE_URL = "https://info.payu.in/merchant/postservice.php?form=2";

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { transactionId, userId } = await req.json()
    
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // If no transactionId provided, try to find latest pending transaction
    let txnToVerify = transactionId
    if (!txnToVerify && userId) {
      const { data: latestTxn, error: txnError } = await supabaseClient
        .from('payment_transactions')
        .select('transaction_id')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (txnError) {
        console.error('Error fetching latest transaction:', txnError)
        throw new Error('No pending transaction found')
      }

      txnToVerify = latestTxn.transaction_id
    }

    if (!txnToVerify) {
      throw new Error('No transaction ID available to verify')
    }

    const merchantKey = Deno.env.get('PAYU_MERCHANT_KEY')
    const merchantSalt = Deno.env.get('PAYU_MERCHANT_SALT')
    
    if (!merchantKey || !merchantSalt) {
      throw new Error('PayU credentials not configured')
    }

    // Create command for PayU verification
    const command = {
      key: merchantKey,
      command: "verify_payment",
      var1: txnToVerify,
      hash: ""
    }

    // Calculate hash string
    const hashString = `${command.key}|${command.command}|${command.var1}|${merchantSalt}`
    const hash = await crypto.subtle.digest(
      "SHA-512",
      new TextEncoder().encode(hashString)
    )
    command.hash = Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    // Make request to PayU
    const response = await fetch(PAYU_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams(command)
    })

    const payuResponse = await response.json()
    console.log('PayU Verification Response:', payuResponse)

    // Process PayU response
    if (payuResponse.status === 1 && payuResponse.transaction_details[txnToVerify]) {
      const txnDetails = payuResponse.transaction_details[txnToVerify]
      
      // Update transaction status in our database
      const { data: updateData, error: updateError } = await supabaseClient
        .from('payment_transactions')
        .update({
          payment_status: txnDetails.status,
          payment_response: txnDetails,
          status: txnDetails.status === 'success' ? 'completed' : 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('transaction_id', txnToVerify)
        .select()

      if (updateError) {
        throw updateError
      }

      // If payment successful, update subscription status
      if (txnDetails.status === 'success') {
        const { error: subError } = await supabaseClient
          .from('subscriptions')
          .update({
            status: 'active',
            payment_status: 'success',
            updated_at: new Date().toISOString()
          })
          .eq('transaction_id', txnToVerify)

        if (subError) {
          console.error('Error updating subscription:', subError)
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          status: txnDetails.status,
          details: txnDetails
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    throw new Error('Invalid response from PayU')
  } catch (error) {
    console.error('Verification error:', error)
    return new Response(
      JSON.stringify({
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
