
export async function generateHash(
  merchantKey: string,
  txnId: string,
  amount: string,
  productInfo: string,
  email: string,
  merchantSalt: string
): Promise<string> {
  // Log input parameters
  console.log('Hash Generation - Input Parameters:', {
    merchantKey,
    txnId,
    amount,
    productInfo,
    email,
    merchantSalt: '[REDACTED]'
  });

  // The order of concatenation is important for PayU hash generation
  const hashString = `${merchantKey}|${txnId}|${amount}|${productInfo}|User|${email}|||||||||||${merchantSalt}`;
  console.log('Hash Generation - Hash String (before SHA-512):', hashString);
  
  const encoder = new TextEncoder();
  const data = encoder.encode(hashString);
  const hashBuffer = await crypto.subtle.digest('SHA-512', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  console.log('Hash Generation - Final Hash:', hashHex);
  return hashHex;
}
