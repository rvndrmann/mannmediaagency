
// Use production URL for live mode
const PAYU_PRODUCTION_URL = "https://secure.payu.in/_payment";

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
    console.log('PayU Service - Initialized with merchant key:', merchantKey.substring(0, 4) + '...');
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
    cancelUrl: string,
    hash: string
  }): FormData {
    console.log('PayU Service - Generating form data with params:', {
      ...params,
      email: params.email ? params.email.substring(0, 4) + '...' : 'missing',
      hash: '[REDACTED]'
    });

    try {
      // Validate all required parameters
      const requiredParams = [
        'txnId', 'amount', 'productInfo', 'firstname', 'email', 
        'phone', 'successUrl', 'failureUrl', 'cancelUrl', 'hash'
      ];
      const missingParams = requiredParams.filter(param => !params[param]);
      
      if (missingParams.length > 0) {
        throw new Error(`Missing required parameters: ${missingParams.join(', ')}`);
      }

      // Clean amount (ensure 2 decimal places)
      const cleanAmount = Number(params.amount).toFixed(2);

      // Create FormData with parameters in the EXACT order required by PayU
      const formData = new FormData();
      formData.append('key', this.merchantKey);
      formData.append('txnid', params.txnId);
      formData.append('amount', cleanAmount);
      formData.append('productinfo', params.productInfo);
      formData.append('firstname', params.firstname);
      formData.append('email', params.email);
      formData.append('phone', params.phone);
      formData.append('surl', params.successUrl);
      formData.append('furl', params.failureUrl);
      formData.append('curl', params.cancelUrl);
      // Add webhook notification URL
      formData.append('notify_url', 'https://avdwgvjhufslhqrrmxgo.supabase.co/functions/v1/handle-payu-webhook');
      formData.append('hash', params.hash);
      formData.append('service_provider', 'payu_paisa');
      formData.append('currency', 'INR');
      formData.append('udf1', params.txnId); // Using txnId as udf1 for tracking
      formData.append('retry', '0'); // Disable retry attempts
      formData.append('pg', ''); // Let PayU choose payment gateway

      console.log('PayU Service - Form data generated successfully');
      return formData;
    } catch (error) {
      console.error('PayU Service - Error generating form data:', error);
      throw error;
    }
  }

  generateHtmlForm(params: {
    txnId: string,
    amount: string,
    productInfo: string,
    firstname: string,
    email: string,
    phone: string,
    successUrl: string,
    failureUrl: string,
    cancelUrl: string,
    hash: string
  }): string {
    const formData = this.generateFormData(params);
    const formEntries: string[] = [];
    
    // Convert FormData to hidden input fields
    formData.forEach((value, key) => {
      formEntries.push(`<input type="hidden" name="${key}" value="${value}">`);
    });

    // Create an HTML form that will auto-submit
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Redirecting to PayU...</title>
        </head>
        <body>
          <form id="payuForm" method="post" action="${PAYU_PRODUCTION_URL}">
            ${formEntries.join('\n            ')}
          </form>
          <script>
            document.getElementById('payuForm').submit();
          </script>
        </body>
      </html>
    `;
  }
}
