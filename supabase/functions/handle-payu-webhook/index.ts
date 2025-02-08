
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "./cors.ts"
import { DatabaseService } from "./db.ts"
import { verifyResponseHash } from "../initiate-payu-payment/hash.ts"

serve(async (req) => {
  console.log('PayU Webhook - Request received')

  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Verify PayU merchant salt is configured
    const merchantSalt = Deno.env.get('PAYU_MERCHANT_SALT')
    if (!merchantSalt) {
      console.error('PayU Webhook - Missing merchant salt')
      throw new Error('PayU merchant salt not configured')
    }

    // Parse webhook payload
    const formData = await req.formData()
    const params: Record<string, string> = {}
    for (const [key, value] of formData.entries()) {
      params[key] = value.toString()
    }

    console.log('PayU Webhook - Received parameters:', {
      txnId: params.txnid,
      status: params.status,
      amount: params.amount,
      mihpayid: params.mihpayid,
      mode: params.mode,
      error: params.error,
      error_Message: params.error_Message
    })

    // Verify hash signature
    const isValid = await verifyResponseHash(params, merchantSalt)

    if (!isValid) {
      console.error('PayU Webhook - Invalid signature')
      throw new Error('Invalid webhook signature')
    }

    console.log('PayU Webhook - Signature verified successfully')

    // Initialize database service
    const db = new DatabaseService()

    // Update payment status
    const paymentStatus = params.status.toLowerCase()
    console.log('PayU Webhook - Updating payment with status:', paymentStatus)

    await db.updatePaymentStatus(
      params.txnid,
      paymentStatus,
      params
    )

    console.log('PayU Webhook - Successfully processed webhook')

    return new Response(
      JSON.stringify({ success: true }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )
  } catch (error) {
    console.error('PayU Webhook Error:', error.message, error.stack)
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack 
      }),
      { 
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )
  }
})
