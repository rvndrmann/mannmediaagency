
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "./cors.ts"
import { DatabaseService } from "./db.ts"
import { PayUService } from "./payu.ts"
import { generateHash } from "./hash.ts"
import { PaymentRequest } from "./types.ts"

serve(async (req) => {
  console.log('Payment Initiation - Starting in Live Environment');
  
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get and validate origin for live environment
    const origin = req.headers.get('origin') || req.headers.get('referer')?.replace(/\/$/, '') || '';
    if (!origin) {
      console.error('Origin Validation Error: Missing origin header');
      throw new Error('Origin header is required for live transactions');
    }
    console.log('Request origin (Live):', origin);

    // Parse and validate request body
    const { userId, planName, amount } = await req.json() as PaymentRequest;
    console.log('Live Payment Request:', { userId, planName, amount });
    
    if (!userId) {
      console.error('Live Validation Error: Missing userId');
      throw new Error('User ID is required for live transactions');
    }

    // Verify PayU credentials
    const merchantKey = Deno.env.get('PAYU_MERCHANT_KEY');
    const merchantSalt = Deno.env.get('PAYU_MERCHANT_SALT');
    
    if (!merchantKey || !merchantSalt) {
      console.error('Live Configuration Error: PayU credentials not found');
      throw new Error('PayU live credentials are not configured');
    }

    console.log('PayU Live Configuration: Credentials found and validated');

    // Initialize database and create subscription
    const db = new DatabaseService();
    const subscription = await db.createSubscription({ userId, planName, amount });
    
    // Generate unique transaction ID for live environment
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
    
    console.log('Live Payment Parameters:', {
      email,
      amount: cleanAmount,
      productInfo,
      successUrl,
      failureUrl,
      txnId
    });

    // Generate hash for live transaction
    const hash = await generateHash(
      merchantKey,
      txnId,
      cleanAmount,
      productInfo,
      firstname,
      email,
      merchantSalt
    );

    // Generate PayU redirect URL for live environment
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

    console.log('Live Payment Initiation - Complete');

    return new Response(
      JSON.stringify({ redirectUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Live Payment Error:', {
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
