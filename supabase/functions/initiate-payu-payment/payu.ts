
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
    const formData = new URLSearchParams();
    
    // Required parameters
    formData.append('key', this.merchantKey);
    formData.append('txnid', params.txnId);
    formData.append('amount', params.amount);
    formData.append('productinfo', params.productInfo);
    formData.append('firstname', 'User');
    formData.append('email', params.email);
    formData.append('phone', '9999999999'); // Required by PayU
    formData.append('surl', params.successUrl);
    formData.append('furl', params.failureUrl);
    formData.append('hash', params.hash);
    formData.append('service_provider', 'payu_paisa');

    // Generate the final URL with parameters
    const redirectUrl = `${PAYU_TEST_URL}?${formData.toString()}`;
    console.log('PayU Service - Generated URL with parameters:', redirectUrl);
    return redirectUrl;
  }
}
