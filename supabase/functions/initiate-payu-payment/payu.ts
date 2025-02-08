
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
    // Log input parameters
    console.log('PayU Service - Parameters:', {
      ...params,
      hash: '[REDACTED]'
    });

    // Create URL parameters in PayU's exact order
    const orderedParams = new URLSearchParams();
    orderedParams.append('key', this.merchantKey);
    orderedParams.append('txnid', params.txnId);
    orderedParams.append('amount', params.amount);
    orderedParams.append('productinfo', params.productInfo); // Note: PayU expects 'productinfo'
    orderedParams.append('firstname', params.firstname);
    orderedParams.append('email', params.email);
    orderedParams.append('phone', params.phone);
    // Add UDF fields (required by PayU)
    orderedParams.append('udf1', 'udf1');
    orderedParams.append('udf2', 'udf2');
    orderedParams.append('udf3', 'udf3');
    orderedParams.append('udf4', 'udf4');
    orderedParams.append('udf5', 'udf5');
    orderedParams.append('surl', params.successUrl);
    orderedParams.append('furl', params.failureUrl);
    orderedParams.append('service_provider', 'payu_paisa');
    orderedParams.append('hash', params.hash);

    const redirectUrl = `${PAYU_TEST_URL}?${orderedParams.toString()}`;
    console.log('PayU Service - Final URL (sanitized):', redirectUrl.replace(params.hash, '[REDACTED_HASH]'));
    
    return redirectUrl;
  }
}
