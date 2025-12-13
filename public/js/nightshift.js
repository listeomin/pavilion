// nightshift.js

const NIGHTSHIFT_KEY = 'nightshift_enabled';

class NightShift {
  constructor() {
    this.button = document.getElementById('nightshift-toggle');
    this.icon = this.button.querySelector('img');
    this.enabled = localStorage.getItem(NIGHTSHIFT_KEY) === 'true';
    
    this.init();
  }

  init() {
    this.applyState();
    this.button.addEventListener('click', () => this.toggle());
  }

  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem(NIGHTSHIFT_KEY, this.enabled);
    this.applyState();
  }

  applyState() {
    if (this.enabled) {
      document.documentElement.classList.add('nightshift-on');
      this.icon.src = 'assets/sun.svg';
    } else {
      document.documentElement.classList.remove('nightshift-on');
      this.icon.src = 'assets/moon.svg';
    }
  }
}

export function init() {
  new NightShift();
}
