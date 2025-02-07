
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
  const hashString = `${merchantKey}|${txnId}|${amount}|${productInfo}|${firstname}|${email}|||||||||||${merchantSalt}`;
  
  console.log('Hash Generation - Hash String (before SHA-512):', hashString);
  
  const encoder = new TextEncoder();
  const data = encoder.encode(hashString);
  const hashBuffer = await crypto.subtle.digest('SHA-512', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  // Return just the hash string without v1/v2 format - PayU's example seems to be showing something different
  return hashHex;
}
