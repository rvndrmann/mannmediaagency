/**
 * Development mode helpers that can be used to bypass authentication and database requirements
 * during development and testing. These functions should not be used in production.
 */

/**
 * Enable mock data mode for development.
 * This will allow the application to display sample projects and data without requiring authentication.
 */
export function enableMockDataMode() {
  if (process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost') {
    console.log("Enabling mock data mode for development");
    localStorage.setItem('use_mock_data', 'true');
    // Optionally set mock auth data too
    localStorage.setItem('auth_confirmed', 'true');
    localStorage.setItem('user_email', 'mock-user@example.com');
    localStorage.setItem('auth_timestamp', new Date().toISOString());
    return true;
  } else {
    console.warn("Mock data mode can only be enabled in development environments");
    return false;
  }
}

/**
 * Disable mock data mode.
 */
export function disableMockDataMode() {
  console.log("Disabling mock data mode");
  localStorage.removeItem('use_mock_data');
  return true;
}

/**
 * Check if mock data mode is enabled.
 */
export function isMockDataModeEnabled() {
  return localStorage.getItem('use_mock_data') === 'true';
}