
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../initiate-payu-payment/cors.ts"

const PAYU_BASE_URL = "https://info.payu.in/merchant/postservice.php?form=2";

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { transactionId } = await req.json()
    if (!transactionId) {
      throw new Error('Transaction ID is required')
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
      var1: transactionId, // transaction ID to verify
      hash: "" // We'll calculate this
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
    if (payuResponse.status === 1 && payuResponse.transaction_details[transactionId]) {
      const txnDetails = payuResponse.transaction_details[transactionId]
      
      // Update transaction status in our database
      const { data: updateData, error: updateError } = await supabase
        .from('payment_transactions')
        .update({
          payment_status: txnDetails.status,
          payment_response: txnDetails,
          status: txnDetails.status === 'success' ? 'completed' : 'failed'
        })
        .eq('transaction_id', transactionId)
        .select()

      if (updateError) {
        throw updateError
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
