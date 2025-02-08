
import { serve } from "std/http/server.ts";
import { corsHeaders } from "./cors.ts";
import { DatabaseService } from "./db.ts";
import { verifyResponseHash } from "./hash.ts";
import { PayUWebhookPayload, PaymentStatus } from "./types.ts";
import { createLogger } from "./logger.ts";

serve(async (req) => {
  const requestId = crypto.randomUUID();
  const logger = createLogger(requestId);
  const url = new URL(req.url);
  
  logger.info('Request received', { 
    path: url.pathname,
    method: req.method 
  });

  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Health check endpoint
  if (url.pathname.endsWith('/health')) {
    logger.info('Health check called');
    return new Response(
      JSON.stringify({ 
        status: 'healthy',
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

  // Verification endpoint for PayU setup
  if (url.pathname.endsWith('/verify')) {
    logger.info('Verification endpoint called');
    return new Response(
      JSON.stringify({ 
        status: 'ready',
        message: 'PayU webhook endpoint is properly configured',
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
    logger.debug('Processing request', {
      contentType: req.headers.get('content-type'),
      userAgent: req.headers.get('user-agent')
    });

    // Verify PayU merchant salt
    const merchantSalt = Deno.env.get('PAYU_MERCHANT_SALT');
    if (!merchantSalt) {
      logger.error('Configuration error', new Error('PayU merchant salt not configured'));
      throw new Error('PayU merchant salt not configured');
    }

    // Parse webhook payload
    const formData = await req.formData();
    const params: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      params[key] = value.toString();
    }

    const payload = params as unknown as PayUWebhookPayload;

    logger.info('Payload received', {
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
    const isValid = verifyResponseHash(params, merchantSalt);

    if (!isValid) {
      logger.error('Invalid signature', new Error('Invalid webhook signature'), {
        receivedHash: params.hash,
        txnId: params.txnid
      });
      throw new Error('Invalid webhook signature');
    }

    logger.info('Signature verified');

    // Initialize database service
    const db = new DatabaseService(logger);

    // Update payment status
    const paymentStatus = params.status.toLowerCase() as PaymentStatus;
    logger.info('Updating payment', { status: paymentStatus });

    await db.updatePaymentStatus(
      params.txnid,
      paymentStatus,
      params
    );

    logger.info('Webhook processed', {
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
    logger.error('Webhook processing failed', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
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

