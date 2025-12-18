// public/js/config.js

// Auto-detect BASE_PATH from document base or URL
function detectBasePath() {
  // Method 1: Check <base> tag
  const baseEl = document.querySelector('base');
  
  if (baseEl && baseEl.href) {
    const baseUrl = new URL(baseEl.href);
    let basePath = baseUrl.pathname;
    
    // Remove trailing slash
    if (basePath !== '/' && basePath.endsWith('/')) {
      basePath = basePath.slice(0, -1);
    }
    
    // Return empty string for root path
    if (basePath === '/') {
      return '';
    }
    
    return basePath;
  }
  
  // Method 2: Fallback - check current URL pathname
  const path = window.location.pathname;
  
  if (path.indexOf('/pavilion') === 0) {
    return '/pavilion';
  }
  
  return '';
}

const BASE_PATH = detectBasePath();

export const CONFIG = {
  BASE_PATH: BASE_PATH,
  API_PATH: BASE_PATH + '/server/api.php'
};
