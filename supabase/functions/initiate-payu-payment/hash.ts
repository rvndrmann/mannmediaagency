
export async function generateHash(
  merchantKey: string,
  txnId: string,
  amount: string,
  productInfo: string,
  firstname: string,
  email: string,
  merchantSalt: string
): Promise<string> {
  // Log input parameters for debugging
  console.log('Hash Generation - Input Parameters:', {
    merchantKey,
    txnId,
    amount,
    productinfo: productInfo, // Note: PayU expects 'productinfo'
    firstname,
    email,
    merchantSalt: '[REDACTED]'
  });

  // PayU's hash string format with exact parameter names and all UDF fields:
  // key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT
  const hashString = `${merchantKey}|${txnId}|${amount}|${productInfo}|${firstname}|${email}|udf1|udf2|udf3|udf4|udf5||||||${merchantSalt}`;
  
  console.log('Hash Generation - Raw Hash String:', hashString.replace(merchantSalt, '[REDACTED]'));
  
  const encoder = new TextEncoder();
  const data = encoder.encode(hashString);
  const hashBuffer = await crypto.subtle.digest('SHA-512', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  console.log('Hash Generation - Final Hash Length:', hashHex.length);
  return hashHex;
}
