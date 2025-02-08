
const PAYU_LIVE_URL = "https://secure.payu.in/_payment";

export class PayUService {
  private merchantKey: string;
  private merchantSalt: string;
  
  constructor(merchantKey: string, merchantSalt: string) {
    if (!merchantKey?.trim() || !merchantSalt?.trim()) {
      console.error('PayU Service - Initialization Error: Invalid credentials');
      throw new Error('Valid PayU credentials are required');
    }
    
    this.merchantKey = merchantKey.trim();
    this.merchantSalt = merchantSalt.trim();
    console.log('PayU Service - Initialized successfully');
  }

  generateFormData(params: {
    txnId: string,
    amount: string,
    productInfo: string,
    firstname: string,
    email: string,
    phone: string,
    successUrl: string,
    failureUrl: string,
    hash: string
  }): URLSearchParams {
    console.log('PayU Service - Generating form data with params:', {
      ...params,
      hash: '[REDACTED]'
    });

    try {
      // Validate all required parameters
      const requiredParams = ['txnId', 'amount', 'productInfo', 'firstname', 'email', 'phone', 'successUrl', 'failureUrl', 'hash'];
      const missingParams = requiredParams.filter(param => !params[param]);
      
      if (missingParams.length > 0) {
        throw new Error(`Missing required parameters: ${missingParams.join(', ')}`);
      }

      // Clean amount (ensure 2 decimal places)
      const cleanAmount = Number(params.amount).toFixed(2);

      // Create URLSearchParams with parameters in the EXACT order required by PayU
      const formData = new URLSearchParams();
      formData.append('key', this.merchantKey);
      formData.append('txnid', params.txnId);
      formData.append('amount', cleanAmount);
      formData.append('productinfo', params.productInfo);
      formData.append('firstname', params.firstname);
      formData.append('email', params.email);
      formData.append('phone', params.phone);
      formData.append('surl', params.successUrl);
      formData.append('furl', params.failureUrl);
      formData.append('hash', params.hash);
      formData.append('service_provider', 'payu_paisa');
      formData.append('currency', 'INR');

      return formData;
    } catch (error) {
      console.error('PayU Service - Error generating form data:', error);
      throw error;
    }
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
    const formData = this.generateFormData(params);
    const redirectUrl = `${PAYU_LIVE_URL}?${formData.toString()}`;
    console.log('PayU Service - Generated redirect URL:', redirectUrl.replace(this.merchantKey, '[KEY_REDACTED]'));
    return redirectUrl;
  }
}
