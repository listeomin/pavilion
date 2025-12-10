// public/js/config.js
const CONFIG = {
  API_PATH: window.location.hostname === 'localhost' 
    ? '/server/api.php' 
    : '/pavilion/server/api.php'
};
