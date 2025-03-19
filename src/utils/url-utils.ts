
/**
 * Normalizes a URL by ensuring it has the proper protocol
 */
export function normalizeUrl(url: string): string {
  if (!url) return "";
  
  // If URL doesn't start with http:// or https://, add https://
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`;
  }
  return url;
}

/**
 * Checks if the browser allows opening a new tab
 */
export function canOpenNewTabs(): boolean {
  try {
    // Try to create a new window with a test URL
    const newWindow = window.open('about:blank', '_blank');
    
    if (!newWindow || newWindow.closed) {
      return false;
    }
    
    // Close the window immediately
    newWindow.close();
    return true;
  } catch (error) {
    console.error("Error checking popup permissions:", error);
    return false;
  }
}

/**
 * Attempts to open a URL in a new tab
 */
export function openUrlInNewTab(url: string): boolean {
  try {
    const normalizedUrl = normalizeUrl(url);
    const newWindow = window.open(normalizedUrl, '_blank');
    
    if (!newWindow || newWindow.closed) {
      console.error("Failed to open URL in new tab. Popup blocker may be enabled.");
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Error opening URL in new tab:", error);
    return false;
  }
}

/**
 * Validates a URL string
 */
export function isValidUrl(url: string): boolean {
  if (!url) return false;
  
  try {
    new URL(normalizeUrl(url));
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Extracts domain from URL
 */
export function getDomainFromUrl(url: string): string {
  try {
    const parsedUrl = new URL(normalizeUrl(url));
    return parsedUrl.hostname;
  } catch (e) {
    return "";
  }
}
