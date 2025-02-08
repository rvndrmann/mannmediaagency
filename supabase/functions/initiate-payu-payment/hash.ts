
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
    
    // PayU hash sequence: key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT
    // 5 empty UDF fields + 6 empty fields = 11 pipes between email and SALT
    const hashString = `${merchantKey}|${txnId}|${cleanAmount}|${productInfo}|${firstname}|${email}|||||||||||${merchantSalt}`;
    
    // Validate pipe separator count (should be exactly 16)
    const pipeCount = (hashString.match(/\|/g) || []).length;
    if (pipeCount !== 16) {
      console.error(`Hash Generation - Invalid pipe count: ${pipeCount}, expected 16`);
      throw new Error(`Invalid hash string format: expected 16 separators, got ${pipeCount}`);
    }
    
    // Log hash string with sensitive data redacted
    const redactedHashString = hashString
      .replace(merchantKey, '[KEY_REDACTED]')
      .replace(merchantSalt, '[SALT_REDACTED]')
      .replace(email, '[EMAIL_REDACTED]');
    console.log('Hash Generation - Hash string created:', redactedHashString);
    console.log('Hash Generation - String components:', {
      pipeCount,
      totalLength: hashString.length,
      emptyFieldsCount: hashString.split('||').length - 1
    });
    
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
    const { status, txnid, amount, productinfo, firstname, email, key } = params;
    const receivedHash = params.hash || '';

    // Validate required parameters
    const requiredParams = { status, txnid, amount, productinfo, firstname, email, key, merchantSalt };
    Object.entries(requiredParams).forEach(([paramKey, value]) => {
      if (!value?.toString().trim()) {
        console.error(`Hash Verification - Missing required parameter: ${paramKey}`);
        throw new Error(`${paramKey} is required for hash verification`);
      }
    });

    // PayU response hash sequence: SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key
    // 11 empty fields between status and email
    const reverseHashString = `${merchantSalt}|${status}|||||||||||${email}|${firstname}|${productinfo}|${amount}|${txnid}|${key}`;
    
    // Validate pipe separator count (should be exactly 16)
    const pipeCount = (reverseHashString.match(/\|/g) || []).length;
    if (pipeCount !== 16) {
      console.error(`Hash Verification - Invalid pipe count: ${pipeCount}, expected 16`);
      throw new Error(`Invalid verification hash string format: expected 16 separators, got ${pipeCount}`);
    }
    
    // Log verification string with sensitive data redacted
    const redactedVerificationString = reverseHashString
      .replace(merchantSalt, '[SALT_REDACTED]')
      .replace(key, '[KEY_REDACTED]')
      .replace(email, '[EMAIL_REDACTED]');
    console.log('Hash Verification - Verification string:', redactedVerificationString);
    console.log('Hash Verification - String components:', {
      pipeCount,
      totalLength: reverseHashString.length,
      emptyFieldsCount: reverseHashString.split('||').length - 1
    });

    // Generate hash for verification
    const encoder = new TextEncoder();
    const data = encoder.encode(reverseHashString);
    const hashBuffer = await crypto.subtle.digest('SHA-512', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const calculatedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toLowerCase();

    const hashesMatch = calculatedHash === receivedHash.toLowerCase();
    console.log('Hash Verification - Result:', {
      match: hashesMatch,
      calculatedHashLength: calculatedHash.length,
      receivedHashLength: receivedHash.length
    });

    return hashesMatch;
  } catch (error) {
    console.error('Hash Verification - Error:', error);
    return false;
  }
}
