
console.log('Hash Generation Module - Initializing');

export async function generateHash(
  merchantKey: string,
  txnId: string,
  amount: string,
  productInfo: string,
  firstname: string,
  email: string,
  merchantSalt: string
): Promise<string> {
  try {
    // Input validation
    const requiredParams = { merchantKey, txnId, amount, productInfo, firstname, email, merchantSalt };
    Object.entries(requiredParams).forEach(([key, value]) => {
      if (!value?.toString().trim()) {
        console.error(`Hash Generation - Missing required parameter: ${key}`);
        throw new Error(`${key} is required for hash generation`);
      }
    });

    // Clean amount to ensure 2 decimal places
    const cleanAmount = Number(amount).toFixed(2);
    
    // PayU hash sequence:
    // key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT
    // Using txnId as udf1 for transaction tracking
    const hashString = `${merchantKey}|${txnId}|${cleanAmount}|${productInfo}|${firstname}|${email}|${txnId}|||||||||||${merchantSalt}`;
    
    // Log hash string with sensitive data redacted
    const redactedHashString = hashString
      .replace(merchantKey, '[KEY_REDACTED]')
      .replace(merchantSalt, '[SALT_REDACTED]')
      .replace(new RegExp(txnId, 'g'), '[TXNID_REDACTED]');
    console.log('Hash Generation - Hash string created:', redactedHashString);
    
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
    throw new Error(`Failed to generate hash: ${error.message}`);
  }
}

export async function verifyResponseHash(
  params: Record<string, string>,
  merchantSalt: string
): Promise<boolean> {
  try {
    // Extract required parameters
    const { status, txnid, amount, productinfo, firstname, email, key, udf1 } = params;
    const receivedHash = params.hash || '';

    // Reverse hash sequence for response validation:
    // SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key
    const reverseHashString = `${merchantSalt}|${status}|||||||||||${email}|${firstname}|${productinfo}|${amount}|${txnid}|${key}`;

    // Generate hash for verification
    const encoder = new TextEncoder();
    const data = encoder.encode(reverseHashString);
    const hashBuffer = await crypto.subtle.digest('SHA-512', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const calculatedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toLowerCase();

    const hashesMatch = calculatedHash === receivedHash.toLowerCase();
    console.log('Hash Verification -', hashesMatch ? 'Success' : 'Failed');
    
    return hashesMatch;
  } catch (error) {
    console.error('Hash Verification - Error:', error);
    return false;
  }
}
