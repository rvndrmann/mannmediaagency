
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "./cors.ts"
import { DatabaseService } from "./db.ts"
import { PayUService } from "./payu.ts"
import { generateHash } from "./hash.ts"
import { PaymentRequest } from "./types.ts"

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Payment Initiation - Start');
    const origin = req.headers.get('origin') || req.headers.get('referer')?.replace(/\/$/, '') || '';
    console.log('Request origin:', origin);

    const { userId, planName = 'BASIC', amount = 899 } = await req.json() as PaymentRequest
    console.log('Payment Request Parameters:', { userId, planName, amount });
    
    if (!userId) {
      console.error('Validation Error: Missing userId');
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Initialize database and create subscription
    const db = new DatabaseService()
    const subscription = await db.createSubscription({ userId, planName, amount })
    const txnId = `TXN_${Date.now()}_${Math.random().toString(36).substring(7)}`
    await db.createPaymentTransaction(userId, txnId, amount, subscription.id)

    // Verify PayU credentials
    console.log('Verifying PayU credentials...');
    const merchantKey = Deno.env.get('PAYU_MERCHANT_KEY');
    const merchantSalt = Deno.env.get('PAYU_MERCHANT_SALT');
    
    if (!merchantKey || !merchantSalt) {
      const missingVars = [];
      if (!merchantKey) missingVars.push('PAYU_MERCHANT_KEY');
      if (!merchantSalt) missingVars.push('PAYU_MERCHANT_SALT');
      
      const error = {
        message: 'PayU credentials are missing',
        details: {
          missingVariables: missingVars,
          hint: 'Please ensure PayU credentials are set in Supabase Edge Function secrets'
        }
      };
      
      console.error('Configuration Error:', error);
      return new Response(
        JSON.stringify(error),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Get user email and prepare payment parameters
    const email = await db.getUserEmail(userId)
    const amountString = amount.toFixed(2)
    const productInfo = `${planName} Plan Subscription`
    const successUrl = `${origin}/payment/success`
    const failureUrl = `${origin}/payment/failure`
    const firstname = "User"
    const phone = "9999999999"
    
    console.log('Payment Configuration:', {
      email,
      amount: amountString,
      productInfo,
      successUrl,
      failureUrl,
      txnId,
      firstname,
      phone
    });

    // Generate hash with all required parameters
    const hash = await generateHash(
      merchantKey,
      txnId,
      amountString,
      productInfo,
      firstname,
      email,
      phone,
      successUrl,
      failureUrl,
      merchantSalt
    )
    console.log('Hash Generated Successfully');

    // Generate PayU redirect URL
    const payuService = new PayUService(merchantKey, merchantSalt)
    const redirectUrl = payuService.generateRedirectUrl({
      txnId,
      amount: amountString,
      productInfo,
      firstname,
      email,
      phone,
      successUrl,
      failureUrl,
      hash
    })

    console.log('Payment Initiation - Complete');

    return new Response(
      JSON.stringify({ redirectUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error Details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    return new Response(
      JSON.stringify({ 
        error: error.message,
        type: error.name,
        details: error.stack 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
