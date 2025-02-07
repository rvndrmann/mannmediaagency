
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
    email: string,
    successUrl: string,
    failureUrl: string,
    hash: string
  }): string {
    // Log all parameters before URL generation
    console.log('PayU Service - Input Parameters:', {
      key: this.merchantKey,
      txnid: params.txnId,
      amount: params.amount,
      productinfo: params.productInfo,
      firstname: 'User',
      email: params.email,
      phone: '9999999999',
      surl: params.successUrl,
      furl: params.failureUrl,
      hash: params.hash,
    });

    // Create parameters object to ensure specific order
    const orderedParams = {
      key: this.merchantKey,
      txnid: params.txnId,
      amount: params.amount,
      productinfo: params.productInfo,
      firstname: 'User',
      email: params.email,
      phone: '9999999999',
      surl: params.successUrl,
      furl: params.failureUrl,
      hash: params.hash,
      service_provider: 'payu_paisa'
    };

    // Validate all required parameters are present
    const requiredParams = ['key', 'txnid', 'amount', 'productinfo', 'firstname', 'email', 'phone', 'surl', 'furl', 'hash'];
    const missingParams = requiredParams.filter(param => !orderedParams[param]);
    
    if (missingParams.length > 0) {
      console.error('Missing required parameters:', missingParams);
      throw new Error(`Missing required parameters: ${missingParams.join(', ')}`);
    }

    // Build URL parameters string manually to ensure proper encoding
    const urlParams = Object.entries(orderedParams)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');

    const redirectUrl = `${PAYU_TEST_URL}?${urlParams}`;
    
    // Log the final URL for debugging
    console.log('PayU Service - Final URL:', redirectUrl);
    console.log('PayU Service - URL Parameters:', urlParams);
    
    return redirectUrl;
  }
}
