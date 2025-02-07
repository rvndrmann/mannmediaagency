
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "./cors.ts"
import { DatabaseService } from "./db.ts"
import { PayUService } from "./payu.ts"
import { generateHash } from "./hash.ts"
import { PaymentRequest } from "./types.ts"

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const origin = req.headers.get('origin') || req.headers.get('referer')?.replace(/\/$/, '') || '';
    console.log('Request origin:', origin);

    const { userId, planName = 'BASIC', amount = 899 } = await req.json() as PaymentRequest
    
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const db = new DatabaseService()
    const subscription = await db.createSubscription({ userId, planName, amount })
    const txnId = `TXN_${Date.now()}_${Math.random().toString(36).substring(7)}`
    await db.createPaymentTransaction(userId, txnId, amount, subscription.id)

    const merchantKey = Deno.env.get('PAYU_MERCHANT_KEY')
    const merchantSalt = Deno.env.get('PAYU_MERCHANT_SALT')

    if (!merchantKey || !merchantSalt) {
      console.error('PayU credentials missing')
      console.error('Merchant Key:', merchantKey ? 'Present' : 'Missing')
      console.error('Merchant Salt:', merchantSalt ? 'Present' : 'Missing')
      return new Response(
        JSON.stringify({ error: 'Payment gateway configuration missing' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    const email = await db.getUserEmail(userId)
    const amountString = amount.toFixed(2)
    const productInfo = `${planName} Plan Subscription`
    const successUrl = `${origin}/payment/success`
    const failureUrl = `${origin}/payment/failure`
    
    console.log('Success URL:', successUrl);
    console.log('Failure URL:', failureUrl);

    const hash = await generateHash(merchantKey, txnId, amountString, productInfo, email, merchantSalt)
    const payuService = new PayUService(merchantKey, merchantSalt)
    const redirectUrl = payuService.generateRedirectUrl({
      txnId,
      amount: amountString,
      productInfo,
      email,
      successUrl,
      failureUrl,
      hash
    })

    console.log('Generated redirect URL:', redirectUrl);

    return new Response(
      JSON.stringify({ redirectUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
