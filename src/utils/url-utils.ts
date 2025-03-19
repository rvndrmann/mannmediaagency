
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

/**
 * Safely opens a URL in a new browser tab
 */
export const openUrlInNewTab = (url: string): boolean => {
  try {
    const normalizedUrl = normalizeUrl(url);
    // Use window.open with noopener and noreferrer for security
    const newWindow = window.open(normalizedUrl, '_blank', 'noopener,noreferrer');
    
    // Check if the window was successfully opened
    if (newWindow) {
      newWindow.focus();
      return true;
    }
    return false;
  } catch (e) {
    console.error("Error opening URL in new tab:", e);
    return false;
  }
};

/**
 * Checks if the browser supports opening new tabs
 */
export const canOpenNewTabs = (): boolean => {
  try {
    // Try to open and immediately close a blank window to test if popups are blocked
    const testWindow = window.open('about:blank', '_blank');
    if (!testWindow) {
      return false;
    }
    testWindow.close();
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * Safely get URL parameters
 */
export const getUrlParameter = (name: string, url?: string): string | null => {
  const currentUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
  const parsedName = name.replace(/[[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${parsedName}(=([^&#]*)|&|#|$)`);
  const results = regex.exec(currentUrl);
  
  if (!results) return null;
  if (!results[2]) return '';
  
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
};

/**
 * Builds a URL with query parameters
 */
export const buildUrlWithParams = (baseUrl: string, params: Record<string, string>): string => {
  const url = new URL(normalizeUrl(baseUrl));
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });
  return url.toString();
};
