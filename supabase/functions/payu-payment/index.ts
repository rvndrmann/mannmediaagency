
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createHmac } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PAYU_TEST_URL = "https://sandboxsecure.payu.in/_payment";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { plan, email, amount } = await req.json()
    
    if (!plan || !email || !amount) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const merchantKey = Deno.env.get('PAYU_MERCHANT_KEY')
    const merchantSalt = Deno.env.get('PAYU_MERCHANT_SALT')

    if (!merchantKey || !merchantSalt) {
      console.error('PayU credentials not found')
      return new Response(
        JSON.stringify({ error: 'Payment configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const txnId = crypto.randomUUID()
    
    // Create hash
    const hashString = `${merchantKey}|${txnId}|${amount}|${plan}|${email}|${merchantSalt}`
    const hash = createHmac('sha512', merchantSalt)
      .update(hashString)
      .digest('hex')

    const paymentData = {
      key: merchantKey,
      txnid: txnId,
      amount: amount,
      productinfo: plan,
      firstname: email.split('@')[0],
      email: email,
      hash: hash,
      surl: `${req.headers.get('origin')}/payment-success`,
      furl: `${req.headers.get('origin')}/payment-failure`,
    }

    return new Response(
      JSON.stringify(paymentData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error processing payment:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
