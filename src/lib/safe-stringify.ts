
/**
 * Safely stringify objects, handling circular references
 */
export function safeStringify(obj: any, indent: number = 2): string {
  try {
    // Create a new object cache to handle circular references
    const cache: any[] = [];
    
    const stringified = JSON.stringify(obj, (key, value) => {
      // Ignore React internal properties
      if (key && (
        key.startsWith('__react') || 
        key.startsWith('_reactFiber') ||
        key.includes('Fiber') || 
        key.includes('fiber')
      )) {
        return '[React Internal]';
      }
      
      // Handle DOM nodes and elements
      if (typeof value === 'object' && value !== null) {
        // Handle DOM nodes
        if (value instanceof Node || value instanceof Element) {
          return '[DOM Element]';
        }
        
        // Handle circular references
        if (cache.includes(value)) {
          return '[Circular Reference]';
        }
        
        // Add value to cache
        cache.push(value);
        
        // Handle functions
        if (typeof value === 'function') {
          return '[Function]';
        }
        
        // Handle dates
        if (value instanceof Date) {
          return value.toISOString();
        }
      }
      
      return value;
    }, indent);
    
    return stringified || '{}';
  } catch (error) {
    console.error('Error stringifying object:', error);
    return String(obj) || '{}';
  }
}

/**
 * Safely parse JSON, returning a default value if parsing fails
 */
export function safeParse<T>(json: string | null | undefined, defaultValue: T): T {
  if (!json) return defaultValue;
  
  try {
    return JSON.parse(json) as T;
  } catch (error) {
    console.error('Error parsing JSON:', error);
    return defaultValue;
  }
}

/**
 * Ensures a value can be safely stored in localStorage
 * by converting it to a string if necessary
 */
export function safeForStorage(value: any): string {
  if (typeof value === 'string') {
    return value;
  }
  
  try {
    return safeStringify(value);
  } catch (error) {
    console.error('Error converting value for storage:', error);
    return '';
  }
}
