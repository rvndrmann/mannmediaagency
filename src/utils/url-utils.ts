
/**
 * Normalizes a URL by ensuring it has the proper protocol
 */
export const normalizeUrl = (url: string): string => {
  let normalizedUrl = url.trim();
  
  // If the URL doesn't have a protocol and isn't a search query, add https://
  if (!/^https?:\/\//i.test(normalizedUrl) && normalizedUrl.includes('.')) {
    normalizedUrl = `https://${normalizedUrl}`;
  } 
  // If it doesn't have a protocol and doesn't contain a dot, treat as search query
  else if (!/^https?:\/\//i.test(normalizedUrl) && !normalizedUrl.includes('.')) {
    normalizedUrl = `https://www.google.com/search?q=${encodeURIComponent(normalizedUrl)}`;
  }
  
  return normalizedUrl;
};

/**
 * Common domains known to block iframe embedding
 */
export const IFRAME_BLOCKING_DOMAINS = [
  'facebook.com',
  'google.com',
  'youtube.com',
  'instagram.com',
  'twitter.com',
  'linkedin.com',
  'microsoft.com',
  'apple.com',
  'amazon.com',
  'netflix.com',
  'canva.com',
  'pinterest.com',
  'reddit.com',
  'zoom.us',
  'spotify.com',
  'github.com',
  'office.com',
  'outlook.com',
  'gmail.com',
  'stripe.com',
  'paypal.com',
  'chase.com',
  'bankofamerica.com',
  'wellsfargo.com',
  'citibank.com',
  'discord.com',
  'slack.com',
  'notion.so',
  'twitch.tv'
];

/**
 * Checks if a URL is likely to block iframe embedding
 */
export const isLikelyToBlockIframe = (url: string): boolean => {
  try {
    const urlObj = new URL(normalizeUrl(url));
    const domain = urlObj.hostname.replace(/^www\./i, '');
    
    return IFRAME_BLOCKING_DOMAINS.some(blockingDomain => 
      domain === blockingDomain || domain.endsWith(`.${blockingDomain}`)
    );
  } catch (e) {
    console.error("Error parsing URL:", e);
    return false;
  }
};
