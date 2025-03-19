
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
 * Checks if a URL is for a website suitable for the agent to analyze
 */
export const isAnalyzableWebsite = (url: string): boolean => {
  try {
    const urlObj = new URL(normalizeUrl(url));
    const domain = urlObj.hostname.replace(/^www\./i, '');
    
    // List of domains known to be problematic for automation
    const problematicDomains = [
      'recaptcha.net',
      'captcha.com'
    ];
    
    return !problematicDomains.some(blockedDomain => 
      domain === blockedDomain || domain.endsWith(`.${blockedDomain}`)
    );
  } catch (e) {
    console.error("Error parsing URL:", e);
    return true;
  }
};

/**
 * Determine if URL is appropriate for direct browser integration
 */
export const isSuitableForDirectNavigation = (url: string): boolean => {
  return true; // All URLs are suitable since we're opening in new tabs
};
