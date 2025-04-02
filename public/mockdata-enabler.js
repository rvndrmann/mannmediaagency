/**
 * Mann Media Agency - Mock Data Enabler
 * This script enables mock data mode for development and testing purposes.
 * Copy and paste this into the browser console when viewing the Canvas page.
 */

function enableMockData() {
  console.log("Enabling mock data mode...");
  localStorage.setItem('use_mock_data', 'true');
  localStorage.setItem('auth_confirmed', 'true');
  localStorage.setItem('user_email', 'mock-user@example.com');
  localStorage.setItem('auth_timestamp', new Date().toISOString());
  console.log("Mock data mode enabled! Reloading page...");
  window.location.reload();
}

function disableMockData() {
  console.log("Disabling mock data mode...");
  localStorage.removeItem('use_mock_data');
  localStorage.removeItem('auth_confirmed');
  localStorage.removeItem('user_email');
  localStorage.removeItem('auth_timestamp');
  console.log("Mock data mode disabled! Reloading page...");
  window.location.reload();
}

// Display helper text
console.log("%c============= Mann Media Agency - Mock Data Enabler =============", "font-weight: bold; font-size: 14px; color: #7c3aed;");
console.log("%cTo enable mock data mode, run: %cenableMockData()", "font-size: 12px;", "font-weight: bold; font-size: 12px; color: #7c3aed;");
console.log("%cTo disable mock data mode, run: %cdisableMockData()", "font-size: 12px;", "font-weight: bold; font-size: 12px; color: #7c3aed;");
console.log("%c=================================================================", "font-weight: bold; font-size: 14px; color: #7c3aed;");

// Make the functions available globally
window.enableMockData = enableMockData;
window.disableMockData = disableMockData;