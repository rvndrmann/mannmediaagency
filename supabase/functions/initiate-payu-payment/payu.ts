
const PAYU_TEST_URL = "https://test.payu.in/_payment";

export class PayUService {
  private merchantKey: string;
  private merchantSalt: string;
  
  constructor(merchantKey: string, merchantSalt: string) {
    this.merchantKey = merchantKey;
    this.merchantSalt = merchantSalt;
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
      const cleanAmount = parseFloat(params.amount).toString();

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
      console.log('PayU Service - Generated URL (hash redacted):', 
        redirectUrl.replace(params.hash, '[REDACTED_HASH]')
      );
      
      return redirectUrl;
    } catch (error) {
      console.error('PayU Service - Error generating URL:', error);
      throw new Error('Failed to generate PayU redirect URL');
    }
  }
}
