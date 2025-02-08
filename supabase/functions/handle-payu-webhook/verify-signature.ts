
import { createHmac } from "https://deno.land/std@0.177.0/node/crypto.ts";

export function verifyPayUSignature(params: Record<string, string>, salt: string, hash: string): boolean {
  try {
    // PayU's parameter order for hash calculation
    const hashString = [
      params.txnid || '',
      params.status || '',
      params.amount || '',
      params.productinfo || '',
      params.firstname || '',
      params.email || '',
      salt
    ].join('|');

    const calculatedHash = createHmac('sha512', salt)
      .update(hashString)
      .digest('hex');

    return calculatedHash === hash;
  } catch (error) {
    console.error('Hash verification error:', error);
    return false;
  }
}
