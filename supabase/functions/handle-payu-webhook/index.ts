
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

    // Log webhook parameters (excluding sensitive data)
    console.log('PayU Webhook - Received parameters:', {
      txnId: params.txnid,
      status: params.status,
      amount: params.amount,
      udf1: params.udf1, // Log udf1 which contains our txnId
      error: params.error || 'none',
      errorMessage: params.error_Message || 'none',
      cancelUrl: params.curl ? 'provided' : 'missing'
    })

    // Verify hash signature
    const isValid = await verifyResponseHash(params, merchantSalt)

    if (!isValid) {
      console.error('PayU Webhook - Invalid signature')
      throw new Error('Invalid webhook signature')
    }

    // Initialize database service
    const db = new DatabaseService()

    // Additional error handling for PayU specific status codes
    let paymentStatus = params.status
    if (params.error && params.error !== 'NO_ERROR') {
      paymentStatus = 'error'
      console.error('PayU Webhook - Payment Error:', {
        error: params.error,
        message: params.error_Message
      })
    }

    // Update payment status with all PayU response data
    await db.updatePaymentStatus(
      params.txnid,
      paymentStatus,
      {
        ...params,
        udf1: params.udf1, // Store udf1 which contains our txnId
        udf2: params.udf2,
        udf3: params.udf3,
        udf4: params.udf4,
        udf5: params.udf5,
        error: params.error,
        error_Message: params.error_Message,
        curl: params.curl
      }
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
    console.error('PayU Webhook Error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message 
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
