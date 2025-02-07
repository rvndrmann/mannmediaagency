
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PAYU_TEST_URL = "https://test.payu.in/_payment";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    })
  }

  try {
    // Get the origin from the request headers, fallback to a default if not present
    const origin = req.headers.get('origin') || req.headers.get('referer')?.replace(/\/$/, '') || '';
    console.log('Request origin:', origin);

    const { userId, planName = 'BASIC', amount = 899 } = await req.json()
    
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          }, 
          status: 400 
        }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Fetch user's subscription
    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        status: 'pending',
        amount: amount,
        plan_name: planName
      })
      .select()
      .single()

    if (subscriptionError) {
      console.error('Subscription error:', subscriptionError)
      return new Response(
        JSON.stringify({ error: 'Failed to create subscription' }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          }, 
          status: 500 
        }
      )
    }

    // Create transaction record
    const txnId = `TXN_${Date.now()}_${Math.random().toString(36).substring(7)}`
    const { error: txnError } = await supabase
      .from('payment_transactions')
      .insert({
        user_id: userId,
        transaction_id: txnId,
        amount: amount,
        status: 'pending',
        payment_method: 'payu',
        subscription_id: subscription.id
      })

    if (txnError) {
      console.error('Transaction error:', txnError)
      return new Response(
        JSON.stringify({ error: 'Failed to create transaction' }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          }, 
          status: 500 
        }
      )
    }

    // PayU payment parameters
    const merchantKey = Deno.env.get('PAYU_MERCHANT_KEY')
    const merchantSalt = Deno.env.get('PAYU_MERCHANT_SALT')

    if (!merchantKey || !merchantSalt) {
      console.error('PayU credentials missing')
      console.error('Merchant Key:', merchantKey ? 'Present' : 'Missing')
      console.error('Merchant Salt:', merchantSalt ? 'Present' : 'Missing')
      return new Response(
        JSON.stringify({ error: 'Payment gateway configuration missing' }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          }, 
          status: 500 
        }
      )
    }

    const amountString = amount.toFixed(2)
    const productInfo = `${planName} Plan Subscription`
    
    // Get user email
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId)
    if (userError || !user) {
      console.error('User error:', userError)
      return new Response(
        JSON.stringify({ error: 'Failed to get user details' }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          }, 
          status: 500 
        }
      )
    }

    const email = user.email || ''
    
    // Construct success and failure URLs using the origin
    const successUrl = `${origin}/payment/success`
    const failureUrl = `${origin}/payment/failure`
    console.log('Success URL:', successUrl);
    console.log('Failure URL:', failureUrl);

    const hash = await generateHash(merchantKey, txnId, amountString, productInfo, email, merchantSalt)

    // Create form data for POST request
    const formData = new FormData()
    formData.append('key', merchantKey)
    formData.append('txnid', txnId)
    formData.append('amount', amountString)
    formData.append('productinfo', productInfo)
    formData.append('firstname', 'User')
    formData.append('email', email)
    formData.append('surl', successUrl)
    formData.append('furl', failureUrl)
    formData.append('hash', hash)

    // Send POST request to PayU
    const payuResponse = await fetch(PAYU_TEST_URL, {
      method: 'POST',
      body: formData
    })

    if (!payuResponse.ok) {
      console.error('PayU API error:', await payuResponse.text())
      return new Response(
        JSON.stringify({ error: 'Failed to initiate payment with PayU' }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          }, 
          status: 500 
        }
      )
    }

    const redirectUrl = payuResponse.url
    console.log('Generated redirect URL:', redirectUrl);

    return new Response(
      JSON.stringify({ redirectUrl }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        }
      }
    )
  } catch (error) {
    console.error('Error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        }, 
        status: 500 
      }
    )
  }
})

async function generateHash(
  merchantKey: string,
  txnId: string,
  amount: string,
  productInfo: string,
  email: string,
  merchantSalt: string
): Promise<string> {
  const str = `${merchantKey}|${txnId}|${amount}|${productInfo}|User|${email}|||||||||||${merchantSalt}`
  const encoder = new TextEncoder()
  const data = encoder.encode(str)
  const hashBuffer = await crypto.subtle.digest('SHA-512', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}
