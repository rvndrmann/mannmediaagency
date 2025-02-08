
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
      console.error('Origin Validation Error: Missing origin header');
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

    // Verify PayU credentials are set
    const merchantKey = Deno.env.get('PAYU_MERCHANT_KEY');
    const merchantSalt = Deno.env.get('PAYU_MERCHANT_SALT');
    
    if (!merchantKey?.trim() || !merchantSalt?.trim()) {
      console.error('Configuration Error: Invalid PayU credentials');
      throw new Error('PayU credentials are not properly configured');
    }

    console.log('PayU Configuration: Valid credentials found');

    // Initialize database and create subscription
    const db = new DatabaseService();
    const subscription = await db.createSubscription({ userId, planName, amount });
    
    // Generate unique transaction ID
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const txnId = `LIVE${timestamp}${random}`;
    
    await db.createPaymentTransaction(userId, txnId, amount, subscription.id);

    // Get user email and prepare payment parameters
    const email = await db.getUserEmail(userId);
    const cleanAmount = Number(amount).toFixed(2);
    const productInfo = `${planName} Plan`;
    const successUrl = `${origin}/payment/success`;
    const failureUrl = `${origin}/payment/failure`;
    const firstname = "User";
    const phone = "9999999999";
    
    console.log('Payment Parameters:', {
      email,
      amount: cleanAmount,
      productInfo,
      successUrl,
      failureUrl,
      txnId
    });

    // Generate hash
    const hash = await generateHash(
      merchantKey,
      txnId,
      cleanAmount,
      productInfo,
      firstname,
      email,
      merchantSalt
    );

    try {
      // Initialize PayU service with credentials
      const payuService = new PayUService(merchantKey, merchantSalt);
      
      // Generate PayU redirect URL
      const redirectUrl = payuService.generateRedirectUrl({
        txnId,
        amount: cleanAmount,
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
      console.error('PayU Service Error:', error);
      throw new Error(`Failed to initialize PayU service: ${error.message}`);
    }
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
