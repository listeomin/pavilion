// public/js/config.js

// Auto-detect BASE_PATH from document base or URL
function detectBasePath() {
  console.log('[CONFIG] Starting detectBasePath()');
  console.log('[CONFIG] window.location:', {
    href: window.location.href,
    pathname: window.location.pathname,
    hostname: window.location.hostname
  });
  
  // Method 1: Check <base> tag
  const baseEl = document.querySelector('base');
  console.log('[CONFIG] <base> element:', baseEl);
  
  if (baseEl && baseEl.href) {
    console.log('[CONFIG] <base> href:', baseEl.href);
    const baseUrl = new URL(baseEl.href);
    let basePath = baseUrl.pathname;
    console.log('[CONFIG] baseUrl.pathname:', basePath);
    
    // Remove trailing slash
    if (basePath !== '/' && basePath.endsWith('/')) {
      basePath = basePath.slice(0, -1);
    }
    
    // Return empty string for root path
    if (basePath === '/') {
      console.log('[CONFIG] Base path is root, returning empty string');
      return '';
    }
    
    console.log('[CONFIG] Detected BASE_PATH from <base> tag:', basePath);
    return basePath;
  }
  
  // Method 2: Fallback - check current URL pathname
  const path = window.location.pathname;
  console.log('[CONFIG] Fallback: checking pathname:', path);
  
  if (path.indexOf('/pavilion') === 0) {
    console.log('[CONFIG] Detected BASE_PATH from pathname:', '/pavilion');
    return '/pavilion';
  }
  
  console.log('[CONFIG] Using root BASE_PATH');
  return '';
}

const BASE_PATH = detectBasePath();

export const CONFIG = {
  BASE_PATH: BASE_PATH,
  API_PATH: BASE_PATH + '/server/api.php'
};

console.log('[CONFIG] Final configuration:', CONFIG);
