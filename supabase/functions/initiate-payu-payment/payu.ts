
const PAYU_TEST_URL = "https://test.payu.in/_payment";

export class PayUService {
  private merchantKey: string;
  private merchantSalt: string;
  
  constructor(merchantKey: string, merchantSalt: string) {
    if (!merchantKey || !merchantSalt) {
      console.error('PayU Service - Initialization Error: Missing credentials', {
        hasMerchantKey: !!merchantKey,
        hasMerchantSalt: !!merchantSalt
      });
      throw new Error('PayU credentials are required');
    }
    
    this.merchantKey = merchantKey;
    this.merchantSalt = merchantSalt;
    console.log('PayU Service - Initialized successfully with merchant key');
  }

  generateRedirectUrl(params: {
    txnId: string,
    amount: string,
    productInfo: string,
    firstname: string,
    email: string,
    phone: string,
    successUrl: string,
    failureUrl: string,
    hash: string
  }): string {
    console.log('PayU Service - Generating redirect URL with params:', {
      ...params,
      hash: '[REDACTED]'
    });

    try {
      // Clean amount (remove trailing zeros)
      const cleanAmount = Number(params.amount).toFixed(2);

      // PayU's parameter order is important for hash verification
      const orderedParams = new URLSearchParams();
      orderedParams.append('key', this.merchantKey);
      orderedParams.append('txnid', params.txnId);
      orderedParams.append('amount', cleanAmount);
      orderedParams.append('productinfo', params.productInfo);
      orderedParams.append('firstname', params.firstname);
      orderedParams.append('email', params.email);
      orderedParams.append('phone', params.phone);
      orderedParams.append('surl', params.successUrl);
      orderedParams.append('furl', params.failureUrl);
      orderedParams.append('service_provider', 'payu_paisa');
      orderedParams.append('hash', params.hash);
      // Add pg parameter for credit card/debit card
      orderedParams.append('pg', 'CC');
      // Enforce INR currency
      orderedParams.append('currency', 'INR');
      // Add callback URL
      orderedParams.append('curl', params.failureUrl);

      const redirectUrl = `${PAYU_TEST_URL}?${orderedParams.toString()}`;
      console.log('PayU Service - Generated URL. Hash and key redacted for security');
      
      return redirectUrl;
    } catch (error) {
      console.error('PayU Service - Error generating URL:', error);
      throw new Error('Failed to generate PayU redirect URL');
    }
  }
}
