
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
    merchantKey: merchantKey ? '[PROVIDED]' : '[MISSING]',
    txnId,
    amount,
    productInfo,
    firstname,
    email,
    merchantSalt: merchantSalt ? '[PROVIDED]' : '[MISSING]'
  });

  // Validate required parameters
  if (!merchantKey || !merchantSalt) {
    console.error('Hash Generation - Error: Missing merchant credentials');
    throw new Error('PayU merchant credentials are required');
  }

  if (!txnId || !amount || !productInfo || !firstname || !email) {
    console.error('Hash Generation - Error: Missing required parameters');
    throw new Error('All parameters are required for hash generation');
  }

  // Clean amount to ensure 2 decimal places
  const cleanAmount = Number(amount).toFixed(2);
  
  // PayU hash sequence: key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT
  // Note the 5 empty fields (||||||) before SALT
  const hashString = `${merchantKey}|${txnId}|${cleanAmount}|${productInfo}|${firstname}|${email}|||||||||||${merchantSalt}`;
  
  console.log('Hash Generation - Hash string created (credentials redacted):', 
    hashString
      .replace(merchantKey, '[KEY]')
      .replace(merchantSalt, '[SALT]')
  );
  
  try {
    // Generate SHA512 hash
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
