
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
    const { userId, guestId, planName, amount, orderId } = await req.json() as PaymentRequest;
    console.log('Payment Request:', { userId, guestId, planName, amount, orderId });
    
    if (!userId && !guestId) {
      console.error('Validation Error: Missing userId or guestId');
      throw new Error('User ID or Guest ID is required');
    }

    // Verify PayU credentials are set
    const merchantKey = Deno.env.get('PAYU_MERCHANT_KEY');
    const merchantSalt = Deno.env.get('PAYU_MERCHANT_SALT');
    
    if (!merchantKey?.trim() || !merchantSalt?.trim()) {
      console.error('Configuration Error: Invalid PayU credentials');
      throw new Error('PayU credentials are not properly configured');
    }

    console.log('PayU Configuration: Valid credentials found');

    // Initialize database and create payment transaction
    const db = new DatabaseService();
    
    // Generate unique transaction ID with timestamp and random string
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const txnId = `LIVE${timestamp}${random}`;
    
    // Create transaction record first
    await db.createPaymentTransaction(userId, guestId, txnId, amount, orderId);

    // Get user contact information (email or phone)
    let email, phone, firstname;
    
    if (userId) {
      // Regular user with account
      const userContact = await db.getUserEmail(userId);
      email = userContact;
      phone = "9999999999"; // Default phone if not available
      firstname = "User";
    } else if (guestId) {
      // Guest user
      const guestInfo = await db.getGuestInfo(guestId);
      email = guestInfo.email;
      phone = guestInfo.phone_number;
      firstname = guestInfo.name;
    } else {
      throw new Error('Unable to determine user information');
    }

    console.log('User contact info retrieved:', email.substring(0, 4) + '...');

    const cleanAmount = Number(amount).toFixed(2);
    const productInfo = `${planName}`;
    const successUrl = new URL('/payment/success', origin).toString();
    const failureUrl = new URL('/payment/failure', origin).toString();
    const cancelUrl = new URL('/payment/cancel', origin).toString();
    
    console.log('Payment Parameters:', {
      email: email.substring(0, 4) + '...',
      amount: cleanAmount,
      productInfo,
      successUrl,
      failureUrl,
      cancelUrl,
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
      // Initialize PayU service and generate HTML form
      const payuService = new PayUService(merchantKey, merchantSalt);
      const htmlForm = payuService.generateHtmlForm({
        txnId,
        amount: cleanAmount,
        productInfo,
        firstname,
        email,
        phone,
        successUrl,
        failureUrl,
        cancelUrl,
        hash
      });

      console.log('Payment Initiation - Complete');

      return new Response(htmlForm, { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'text/html',
          'Cache-Control': 'no-store'
        } 
      });
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
