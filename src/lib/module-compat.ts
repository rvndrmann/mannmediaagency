
/**
 * This utility provides compatibility functions for ESM/CommonJS module interop
 */

// Polyfill for CommonJS require if needed
export function createRequire() {
  // This function is called when a module tries to use require
  // We don't actually want to implement require, but rather make it not crash
  return (id: string) => {
    console.warn(`Module tried to use CommonJS require("${id}"). Using ESM import compatibility.`);
    return {}; // Return empty object as fallback
  };
}

// Make sure global and process are defined
export function ensureGlobals() {
  // These should already be defined in index.html, but just in case
  if (typeof window !== 'undefined') {
    // @ts-ignore
    window.global = window.global || window;
    // @ts-ignore
    window.process = window.process || { env: {} };
  }
}

// Call this in main.tsx
export function setupModuleCompat() {
  ensureGlobals();
}
