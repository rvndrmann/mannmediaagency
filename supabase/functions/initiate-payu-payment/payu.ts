
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
    // Log all parameters before URL generation
    console.log('PayU Service - Input Parameters:', {
      key: this.merchantKey,
      txnid: params.txnId,
      amount: params.amount,
      productinfo: params.productInfo,
      firstname: params.firstname,
      email: params.email,
      phone: params.phone,
      surl: params.successUrl,
      furl: params.failureUrl,
      hash: params.hash,
    });

    // Properly encode each parameter value
    const orderedParams = new URLSearchParams();
    orderedParams.append('key', encodeURIComponent(this.merchantKey));
    orderedParams.append('txnid', encodeURIComponent(params.txnId));
    orderedParams.append('amount', encodeURIComponent(params.amount));
    orderedParams.append('productinfo', encodeURIComponent(params.productInfo));
    orderedParams.append('firstname', encodeURIComponent(params.firstname));
    orderedParams.append('email', encodeURIComponent(params.email));
    orderedParams.append('phone', encodeURIComponent(params.phone));
    orderedParams.append('surl', encodeURIComponent(params.successUrl));
    orderedParams.append('furl', encodeURIComponent(params.failureUrl));
    orderedParams.append('service_provider', 'payu_paisa');
    orderedParams.append('hash', encodeURIComponent(params.hash));

    const redirectUrl = `${PAYU_TEST_URL}?${orderedParams.toString()}`;
    
    // Log the final URL for debugging
    console.log('PayU Service - Final URL:', redirectUrl);
    
    return redirectUrl;
  }
}
