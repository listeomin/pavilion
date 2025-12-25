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

// Auto-detect WebSocket URL
const WS_PROTOCOL = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const WS_HOST = window.location.hostname === 'localhost'
  ? 'localhost:3001'
  : window.location.host;
const WS_PATH = BASE_PATH + '/ws';

// Version info (update when version.json changes)
export const VERSION = '0.8.0';

export const CONFIG = {
  BASE_PATH: BASE_PATH,
  API_PATH: BASE_PATH + '/server/api.php',
  WS_URL: `${WS_PROTOCOL}//${WS_HOST}${WS_PATH}`,
  VERSION: VERSION
};
