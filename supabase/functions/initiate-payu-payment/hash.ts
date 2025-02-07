
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
  console.log('Hash Generation - Raw Input Parameters:', {
    merchantKey,
    txnId,
    amount,
    productInfo,
    firstname,
    email,
    merchantSalt: '[REDACTED]'
  });

  // PayU's hash string format: key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT
  const hashString = `${merchantKey}|${txnId}|${amount}|${productInfo}|${firstname}|${email}|udf1|udf2|udf3|udf4|udf5||||||${merchantSalt}`;
  
  console.log('Hash Generation - Hash String (before SHA-512):', hashString);
  
  const encoder = new TextEncoder();
  const data = encoder.encode(hashString);
  const hashBuffer = await crypto.subtle.digest('SHA-512', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  // Create hash object with v1 and v2 (both same value as per PayU docs)
  const hashObject = {
    v1: hashHex,
    v2: hashHex
  };
  
  console.log('Hash Generation - Final Hash Object:', hashObject);
  return JSON.stringify(hashObject);
}
