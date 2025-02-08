
import { serve } from "std/http/server.ts";
import { corsHeaders } from "./cors.ts";
import { DatabaseService } from "./db.ts";
import { verifyResponseHash } from "../initiate-payu-payment/hash.ts";
import { PayUWebhookPayload, PaymentStatus } from "./types.ts";

const logWebhookEvent = (eventType: string, data: Record<string, unknown>) => {
  const timestamp = new Date().toISOString();
  console.log(JSON.stringify({
    timestamp,
    type: 'WEBHOOK_EVENT',
    eventType,
    ...data
  }));
};

serve(async (req) => {
  const requestId = crypto.randomUUID();
  const url = new URL(req.url);
  
  logWebhookEvent('REQUEST_RECEIVED', { 
    requestId,
    path: url.pathname,
    method: req.method 
  });

  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Add test endpoint
  if (url.pathname.endsWith('/test')) {
    logWebhookEvent('TEST_ENDPOINT_CALLED', { requestId });
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Webhook endpoint is accessible',
        timestamp: new Date().toISOString(),
        requestId
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }

  try {
    // Log request details
    logWebhookEvent('REQUEST_DETAILS', {
      requestId,
      contentType: req.headers.get('content-type'),
      userAgent: req.headers.get('user-agent'),
      method: req.method,
      headers: Object.fromEntries(req.headers.entries())
    });

    // Verify PayU merchant salt
    const merchantSalt = Deno.env.get('PAYU_MERCHANT_SALT');
    if (!merchantSalt) {
      logWebhookEvent('ERROR', { requestId, error: 'Missing merchant salt' });
      throw new Error('PayU merchant salt not configured');
    }

    // Parse webhook payload
    const formData = await req.formData();
    const params: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      params[key] = value.toString();
    }

    const payload = params as unknown as PayUWebhookPayload;

    logWebhookEvent('PAYLOAD_RECEIVED', {
      requestId,
      txnId: payload.txnid,
      status: payload.status,
      amount: payload.amount,
      mihpayid: payload.mihpayid,
      mode: payload.mode,
      error: payload.error,
      error_Message: payload.error_Message,
      bank_ref_num: payload.bank_ref_num,
      bankcode: payload.bankcode,
      cardnum: payload.cardnum ? '****' + payload.cardnum.slice(-4) : undefined,
      name_on_card: payload.name_on_card,
      issuing_bank: payload.issuing_bank,
      cardtype: payload.cardtype
    });

    // Verify hash signature
    const isValid = await verifyResponseHash(params, merchantSalt);

    if (!isValid) {
      logWebhookEvent('SIGNATURE_INVALID', {
        requestId,
        receivedHash: params.hash,
        txnId: params.txnid
      });
      throw new Error('Invalid webhook signature');
    }

    logWebhookEvent('SIGNATURE_VERIFIED', { requestId });

    // Initialize database service
    const db = new DatabaseService();

    // Update payment status
    const paymentStatus = params.status.toLowerCase() as PaymentStatus;
    logWebhookEvent('UPDATING_PAYMENT', { requestId, status: paymentStatus });

    await db.updatePaymentStatus(
      params.txnid,
      paymentStatus,
      params
    );

    logWebhookEvent('WEBHOOK_PROCESSED', {
      requestId,
      txnId: params.txnid,
      status: paymentStatus
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Webhook processed successfully',
        txnId: params.txnid,
        status: paymentStatus,
        requestId
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    logWebhookEvent('ERROR', {
      requestId,
      error: error.message,
      stack: error.stack
    });
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack,
        requestId 
      }),
      { 
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});
