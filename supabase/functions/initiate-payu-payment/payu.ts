
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
    const urlParams = new URLSearchParams()
    urlParams.append('key', this.merchantKey)
    urlParams.append('txnid', params.txnId)
    urlParams.append('amount', params.amount)
    urlParams.append('productinfo', params.productInfo)
    urlParams.append('firstname', 'User')
    urlParams.append('email', params.email)
    urlParams.append('surl', params.successUrl)
    urlParams.append('furl', params.failureUrl)
    urlParams.append('hash', params.hash)

    return `${PAYU_TEST_URL}?${urlParams.toString()}`
  }
}
