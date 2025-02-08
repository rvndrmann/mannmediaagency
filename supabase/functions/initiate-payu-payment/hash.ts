export async function generateHash(
  merchantKey: string,
  txnId: string,
  amount: string,
  productInfo: string,
  firstname: string,
  email: string,
  merchantSalt: string
): Promise<string> {
  console.log('Hash Generation - Starting with parameters:', {
    merchantKey,
    txnId,
    amount,
    productInfo,
    firstname,
    email,
    merchantSalt: '[REDACTED]'
  });

  // Clean amount (remove trailing zeros but keep 2 decimal places for PayU)
  const cleanAmount = Number(amount).toFixed(2);
  
  // PayU's hash sequence: key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT
  const hashString = `${merchantKey}|${txnId}|${cleanAmount}|${productInfo}|${firstname}|${email}|||||||||||${merchantSalt}`;
  
  console.log('Hash String (salt redacted):', hashString.replace(merchantSalt, '[REDACTED]'));
  
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(hashString);
    const hashBuffer = await crypto.subtle.digest('SHA-512', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    console.log('Hash Generation - Success. Hash length:', hashHex.length);
    return hashHex.toLowerCase(); // PayU expects lowercase hash
  } catch (error) {
    console.error('Hash Generation - Error:', error);
    throw new Error('Failed to generate hash');
  }
}
