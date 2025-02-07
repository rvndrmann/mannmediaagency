
export async function generateHash(
  merchantKey: string,
  txnId: string,
  amount: string,
  productInfo: string,
  firstname: string,
  email: string,
  phone: string,
  surl: string,
  furl: string,
  merchantSalt: string
): Promise<string> {
  // Log input parameters for debugging
  console.log('Hash Generation - Input Parameters:', {
    merchantKey,
    txnId,
    amount,
    productInfo,
    firstname,
    email,
    phone,
    surl,
    furl,
    merchantSalt: '[REDACTED]'
  });

  // PayU requires a specific order of parameters for hash generation
  // key|txnid|amount|productinfo|firstname|email|phone|surl|furl|||||||SALT
  const hashString = `${merchantKey}|${txnId}|${amount}|${productInfo}|${firstname}|${email}|${phone}|${surl}|${furl}|||||||${merchantSalt}`;
  console.log('Hash Generation - Hash String (before SHA-512):', hashString);
  
  const encoder = new TextEncoder();
  const data = encoder.encode(hashString);
  const hashBuffer = await crypto.subtle.digest('SHA-512', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  console.log('Hash Generation - Final Hash:', hashHex);
  return hashHex;
}
