// public/js/config.js

// Auto-detect BASE_PATH from current URL
function detectBasePath() {
  const path = window.location.pathname;
  // If path starts with /pavilion/, use it as base
  if (path.startsWith('/pavilion/')) {
    return '/pavilion';
  }
  // Otherwise, root
  return '';
}

const BASE_PATH = detectBasePath();

export const CONFIG = {
  BASE_PATH: BASE_PATH,
  API_PATH: BASE_PATH + '/server/api.php'
};
