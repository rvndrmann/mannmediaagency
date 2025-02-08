
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "./cors.ts"
import { DatabaseService } from "./db.ts"
import { verifyPayUSignature } from "./verify-signature.ts"

serve(async (req) => {
  console.log('PayU Webhook - Request received')

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const merchantSalt = Deno.env.get('PAYU_MERCHANT_SALT')
    if (!merchantSalt) {
      console.error('PayU Webhook - Missing merchant salt')
      throw new Error('PayU merchant salt not configured')
    }

    const formData = await req.formData()
    const params: Record<string, string> = {}
    for (const [key, value] of formData.entries()) {
      params[key] = value.toString()
    }

    console.log('PayU Webhook - Received parameters:', {
      txnId: params.txnid,
      status: params.status,
      amount: params.amount,
      hash: params.hash
    })

    // Verify PayU response signature
    const isValid = verifyPayUSignature(params, merchantSalt, params.hash)

    if (!isValid) {
      console.error('PayU Webhook - Invalid signature')
      throw new Error('Invalid webhook signature')
    }

    console.log('PayU Webhook - Signature verified successfully')

    const db = new DatabaseService()

    // Update payment status with additional validation
    if (!params.txnid || !params.status) {
      throw new Error('Missing required parameters: transaction ID or status')
    }

    await db.updatePaymentStatus(
      params.txnid,
      params.status.toLowerCase(),
      {
        ...params,
        webhook_received_at: new Date().toISOString()
      }
    )

    console.log('PayU Webhook - Successfully processed webhook:', {
      txnId: params.txnid,
      status: params.status
    })

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
        error: error.message,
        details: error instanceof Error ? error.stack : undefined
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
