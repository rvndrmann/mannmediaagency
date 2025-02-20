
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { PayUService } from "./payu.ts";
import { DatabaseService } from "./db.ts";
import { corsHeaders } from "./cors.ts";

interface PaymentRequest {
  userId: string;
  planName: string;
  amount: number;
  discountCode?: string;
  discountId?: string;
}

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
    // Get and validate request
    const { userId, planName, amount, discountCode, discountId } = await req.json() as PaymentRequest;
    console.log('Payment Request:', { userId, planName, amount, discountCode });
    
    if (!userId || !planName || !amount) {
      throw new Error('Missing required parameters');
    }

    // Verify PayU credentials are set
    const merchantKey = Deno.env.get('PAYU_MERCHANT_KEY');
    const merchantSalt = Deno.env.get('PAYU_MERCHANT_SALT');
    
    if (!merchantKey?.trim() || !merchantSalt?.trim()) {
      console.error('Configuration Error: Invalid PayU credentials');
      throw new Error('PayU credentials are not properly configured');
    }

    // Initialize database service
    const db = new DatabaseService();
    
    // Generate unique transaction ID
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const txnId = `LIVE${timestamp}${random}`;

    // Get user profile and email
    const { data: userData, error: userError } = await db.supabase
      .from('profiles')
      .select('id, email')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      console.error('DB Error - Get User Profile:', userError);
      throw new Error('Failed to retrieve user information');
    }

    const email = userData.email || 'customer@example.com'; // Fallback email if not found
    
    await db.createPaymentTransaction(userId, txnId, amount);

    // Initialize PayU service
    const payuService = new PayUService(merchantKey, merchantSalt);
    
    // Generate PayU form
    const htmlForm = payuService.generateHtmlForm({
      txnId,
      amount: amount.toFixed(2),
      productInfo: `${planName} Plan`,
      firstname: "User",
      email,
      phone: "9999999999",  // Default phone number as required by PayU
      successUrl: new URL('/payment/success', req.headers.get('origin') || '').toString(),
      failureUrl: new URL('/payment/failure', req.headers.get('origin') || '').toString(),
      cancelUrl: new URL('/payment/cancel', req.headers.get('origin') || '').toString(),
      hash: await payuService.generateHash(
        merchantKey,
        txnId,
        amount.toFixed(2),
        `${planName} Plan`,
        "User",
        email,
        merchantSalt
      )
    });

    console.log('Payment Initiation - Form generated successfully');

    return new Response(
      JSON.stringify({ html: htmlForm }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        } 
      }
    );
  } catch (error) {
    console.error('Payment Error:', error);
    
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
