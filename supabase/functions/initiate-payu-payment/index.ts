
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PAYU_TEST_URL = "https://test.payu.in/_payment";

serve(async (req) => {
  // This is critical for CORS to work
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    })
  }

  try {
    const { userId } = await req.json()
    
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
        amount: 899,
        plan_name: 'BASIC'
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
        amount: 899,
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
    const amount = "899.00"
    const productInfo = "BASIC Plan Subscription"
    
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
    const hash = await generateHash(merchantKey!, txnId, amount, productInfo, email, merchantSalt!)

    const redirectUrl = `${PAYU_TEST_URL}?key=${merchantKey}&txnid=${txnId}&amount=${amount}&productinfo=${encodeURIComponent(productInfo)}&firstname=User&email=${encodeURIComponent(email)}&surl=https://your-domain.com/payment/success&furl=https://your-domain.com/payment/failure&hash=${hash}`

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
