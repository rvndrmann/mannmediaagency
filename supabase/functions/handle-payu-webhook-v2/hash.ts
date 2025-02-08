
import { createHmac } from "crypto";

export function verifyResponseHash(params: Record<string, string>, salt: string): boolean {
  try {
    const receivedHash = params.hash;
    const calculatedHash = createResponseHash(params, salt);
    return receivedHash === calculatedHash;
  } catch (error) {
    console.error('Hash verification error:', error);
    return false;
  }
}

function createResponseHash(params: Record<string, string>, salt: string): string {
  const hashString = [
    params.txnid || '',
    params.status || '',
    params.amount || '',
    params.productinfo || '',
    params.firstname || '',
    params.email || '',
    salt
  ].join('|');

  return createHmac('sha512', salt)
    .update(hashString)
    .digest('hex');
}
