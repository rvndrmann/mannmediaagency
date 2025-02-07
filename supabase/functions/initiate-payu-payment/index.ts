
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

    // Log environment variables presence
    const merchantKey = Deno.env.get('PAYU_MERCHANT_KEY')
    const merchantSalt = Deno.env.get('PAYU_MERCHANT_SALT')
    
    console.log('Environment check:')
    console.log('PAYU_MERCHANT_KEY exists:', !!merchantKey)
    console.log('PAYU_MERCHANT_SALT exists:', !!merchantSalt)
    console.log('PAYU_MERCHANT_KEY length:', merchantKey?.length)
    console.log('PAYU_MERCHANT_SALT length:', merchantSalt?.length)

    if (!merchantKey || !merchantSalt) {
      const error = {
        message: 'Payment gateway configuration missing',
        details: {
          merchantKey: merchantKey ? 'Present' : 'Missing',
          merchantSalt: merchantSalt ? 'Present' : 'Missing'
        }
      }
      console.error('Configuration error:', error)
      return new Response(
        JSON.stringify({ error: error.message, details: error.details }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    const email = await db.getUserEmail(userId)
    const amountString = amount.toFixed(2)
    const productInfo = `${planName} Plan Subscription`
    const successUrl = `${origin}/payment/success`
    const failureUrl = `${origin}/payment/failure`
    
    console.log('Payment configuration:')
    console.log('Email:', email)
    console.log('Amount:', amountString)
    console.log('Product Info:', productInfo)
    console.log('Success URL:', successUrl)
    console.log('Failure URL:', failureUrl)
    console.log('Transaction ID:', txnId)

    const hash = await generateHash(merchantKey, txnId, amountString, productInfo, email, merchantSalt)
    console.log('Generated Hash:', hash)

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

    console.log('Final redirect URL:', redirectUrl)

    return new Response(
      JSON.stringify({ redirectUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    return new Response(
      JSON.stringify({ 
        error: error.message,
        type: error.name,
        stack: error.stack 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
