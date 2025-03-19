
/**
 * Normalizes a URL by ensuring it has the appropriate protocol prefix
 */
export const normalizeUrl = (url: string): string => {
  // If URL doesn't have a protocol, add https://
  if (!/^https?:\/\//i.test(url)) {
    return `https://${url}`;
  }
  return url;
};

/**
 * Validates a URL string
 */
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(normalizeUrl(url));
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * Gets the domain from a URL
 */
export const extractDomain = (url: string): string => {
  try {
    const parsedUrl = new URL(normalizeUrl(url));
    return parsedUrl.hostname;
  } catch (e) {
    return url;
  }
};
