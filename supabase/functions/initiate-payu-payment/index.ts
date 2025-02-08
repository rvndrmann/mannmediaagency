
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "./cors.ts"
import { DatabaseService } from "./db.ts"
import { PayUService } from "./payu.ts"
import { generateHash } from "./hash.ts"
import { PaymentRequest } from "./types.ts"

serve(async (req) => {
  console.log('Payment Initiation - Starting');
  
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get and validate origin
    const origin = req.headers.get('origin') || req.headers.get('referer')?.replace(/\/$/, '') || '';
    if (!origin) {
      throw new Error('Origin header is required');
    }
    console.log('Request origin:', origin);

    // Parse and validate request body
    const { userId, planName, amount } = await req.json() as PaymentRequest;
    console.log('Payment Request:', { userId, planName, amount });
    
    if (!userId) {
      console.error('Validation Error: Missing userId');
      throw new Error('User ID is required');
    }

    // Verify PayU credentials
    const merchantKey = Deno.env.get('PAYU_MERCHANT_KEY');
    const merchantSalt = Deno.env.get('PAYU_MERCHANT_SALT');
    
    if (!merchantKey || !merchantSalt) {
      console.error('Configuration Error: Missing PayU credentials');
      throw new Error('PayU credentials are not configured');
    }

    // Initialize database and create subscription
    const db = new DatabaseService();
    const subscription = await db.createSubscription({ userId, planName, amount });
    const txnId = `TXN_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    await db.createPaymentTransaction(userId, txnId, amount, subscription.id);

    // Get user email and prepare payment parameters
    const email = await db.getUserEmail(userId);
    const amountString = amount.toFixed(2);
    const productInfo = `${planName} Plan`; // Use exact product info
    const successUrl = `${origin}/payment/success`;
    const failureUrl = `${origin}/payment/failure`;
    const firstname = "User";
    const phone = "9999999999";
    
    console.log('Payment Parameters:', {
      email,
      amount: amountString,
      productInfo,
      successUrl,
      failureUrl,
      txnId,
      firstname,
      phone
    });

    // Generate hash
    const hash = await generateHash(
      merchantKey,
      txnId,
      amountString,
      productInfo,
      firstname,
      email,
      merchantSalt
    );

    // Generate PayU redirect URL
    const payuService = new PayUService(merchantKey, merchantSalt);
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
    });

    console.log('Payment Initiation - Complete');

    return new Response(
      JSON.stringify({ redirectUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Payment Error:', {
      message: error.message,
      stack: error.stack
    });
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        type: error.name,
        details: error.stack 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
