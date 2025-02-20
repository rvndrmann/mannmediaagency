
// Using crypto module instead of hash module
const generateSHA512Hash = async (text: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-512', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// Production URL for payments
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

  async generateHash(
    merchantKey: string,
    txnId: string,
    amount: string,
    productInfo: string,
    firstname: string,
    email: string,
    merchantSalt: string
  ): Promise<string> {
    try {
      // PayU hash sequence: key|txnid|amount|productinfo|firstname|email|||||||||||SALT
      const hashString = `${merchantKey}|${txnId}|${amount}|${productInfo}|${firstname}|${email}|||||||||||${merchantSalt}`;
      return await generateSHA512Hash(hashString);
    } catch (error) {
      console.error('Hash Generation Error:', error);
      throw error;
    }
  }

  generateHtmlForm(params: {
    txnId: string;
    amount: string;
    productInfo: string;
    firstname: string;
    email: string;
    phone: string;
    successUrl: string;
    failureUrl: string;
    cancelUrl: string;
    hash: string;
  }): string {
    try {
      const formFields = [
        { name: 'key', value: this.merchantKey },
        { name: 'txnid', value: params.txnId },
        { name: 'amount', value: params.amount },
        { name: 'productinfo', value: params.productInfo },
        { name: 'firstname', value: params.firstname },
        { name: 'email', value: params.email },
        { name: 'phone', value: params.phone },
        { name: 'surl', value: params.successUrl },
        { name: 'furl', value: params.failureUrl },
        { name: 'curl', value: params.cancelUrl },
        { name: 'hash', value: params.hash },
        { name: 'service_provider', value: 'payu_paisa' },
        { name: 'udf1', value: params.txnId }
      ];

      const formInputs = formFields
        .map(field => `<input type="hidden" name="${field.name}" value="${field.value}">`)
        .join('\n');

      return `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Redirecting to Payment Gateway...</title>
          </head>
          <body>
            <form id="payuForm" method="post" action="${PAYU_PRODUCTION_URL}">
              ${formInputs}
            </form>
            <script>
              document.getElementById('payuForm').submit();
            </script>
          </body>
        </html>
      `;
    } catch (error) {
      console.error('Form Generation Error:', error);
      throw error;
    }
  }
}
