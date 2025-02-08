
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
    return new Response(null, { 
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Max-Age': '86400',
      }
    });
  }

  try {
    // Get and validate origin
    const origin = req.headers.get('origin');
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
    
    // Generate unique transaction ID with timestamp and random string
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const txnId = `LIVE${timestamp}${random}`;
    
    await db.createPaymentTransaction(userId, txnId, amount, subscription.id);

    // Get user email and prepare payment parameters
    const email = await db.getUserEmail(userId);
    if (!email) {
      throw new Error('User email not found');
    }

    const cleanAmount = Number(amount).toFixed(2);
    const productInfo = `${planName} Plan`;
    const successUrl = new URL('/payment/success', origin).toString();
    const failureUrl = new URL('/payment/failure', origin).toString();
    const firstname = "User";
    const phone = "9999999999";
    
    console.log('Payment Parameters:', {
      email: email.substring(0, 4) + '...',
      amount: cleanAmount,
      productInfo,
      successUrl,
      failureUrl,
      txnId
    });

    // Generate hash using PayU's specified format
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
      // Initialize PayU service and generate redirect URL
      const payuService = new PayUService(merchantKey, merchantSalt);
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
        { 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store'
          } 
        }
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
