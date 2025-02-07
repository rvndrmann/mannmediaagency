
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

    // Create parameters object with specific order
    const orderedParams = new URLSearchParams();
    orderedParams.append('key', this.merchantKey);
    orderedParams.append('txnid', params.txnId);
    orderedParams.append('amount', params.amount);
    orderedParams.append('productinfo', params.productInfo);
    orderedParams.append('firstname', params.firstname);
    orderedParams.append('email', params.email);
    orderedParams.append('phone', params.phone);
    orderedParams.append('surl', params.successUrl);
    orderedParams.append('furl', params.failureUrl);
    orderedParams.append('service_provider', 'payu_paisa');
    orderedParams.append('hash', params.hash);

    const redirectUrl = `${PAYU_TEST_URL}?${orderedParams.toString()}`;
    
    // Log the final URL for debugging
    console.log('PayU Service - Final URL:', redirectUrl);
    
    return redirectUrl;
  }
}
