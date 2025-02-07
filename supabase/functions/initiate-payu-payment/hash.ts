
export async function generateHash(
  merchantKey: string,
  txnId: string,
  amount: string,
  productInfo: string,
  email: string,
  merchantSalt: string
): Promise<string> {
  // The order of concatenation is important for PayU hash generation
  const hashString = `${merchantKey}|${txnId}|${amount}|${productInfo}|User|${email}|||||||||||${merchantSalt}`;
  console.log('Hash string:', hashString);
  
  const encoder = new TextEncoder();
  const data = encoder.encode(hashString);
  const hashBuffer = await crypto.subtle.digest('SHA-512', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  console.log('Generated hash:', hashHex);
  return hashHex;
}
