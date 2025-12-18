// public/js/contextMenu.js

export class ContextMenu {
  constructor() {
    this.menu = null;
    this.selectedText = '';
    this.init();
  }

  init() {
    this.createMenu();
    this.attachListeners();
  }

  createMenu() {
    this.menu = document.createElement('div');
    this.menu.id = 'context-menu';
    this.menu.className = 'context-menu';
    this.menu.innerHTML = `
      <div class="context-menu-item" data-action="copy">Скопировать</div>
      <div class="context-menu-item disabled" data-action="quote">Цитировать</div>
      <div class="context-menu-item disabled" data-action="branch">Создать ветку</div>
      <div class="context-menu-divider"></div>
      <div class="context-menu-reactions">
        <span class="context-menu-reaction" data-emoji="😂">😂</span>
        <span class="context-menu-reaction" data-emoji="❤️">❤️</span>
        <span class="context-menu-reaction" data-emoji="🔥">🔥</span>
        <span class="context-menu-reaction" data-emoji="👍">👍</span>
        <span class="context-menu-reaction" data-emoji="💯">💯</span>
        <span class="context-menu-reaction" data-emoji="🍋">🍋</span>
        <span class="context-menu-reaction" data-emoji="😳">😳</span>
      </div>
    `;
    document.body.appendChild(this.menu);
  }

  attachListeners() {
    // Block default context menu only when text is selected
    document.addEventListener('contextmenu', (e) => {
      const selection = window.getSelection();
      const text = selection.toString().trim();

      if (text) {
        e.preventDefault();
        this.selectedText = text;
        this.show(e.clientX, e.clientY);
      } else {
        this.hide();
      }
    });

    // Menu item clicks
    this.menu.addEventListener('click', (e) => {
      const item = e.target.closest('[data-action]');
      if (item && !item.classList.contains('disabled')) {
        this.handleAction(item.dataset.action);
      }
    });

    // Hide on click outside
    document.addEventListener('click', (e) => {
      if (!this.menu.contains(e.target)) {
        this.hide();
      }
    });

    // Hide on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hide();
      }
    });
  }

  show(x, y) {
    this.menu.style.left = `${x}px`;
    this.menu.style.top = `${y}px`;
    this.menu.classList.add('active');

    // Adjust position if menu goes off screen
    const rect = this.menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      this.menu.style.left = `${x - rect.width}px`;
    }
    if (rect.bottom > window.innerHeight) {
      this.menu.style.top = `${y - rect.height}px`;
    }
  }

  hide() {
    this.menu.classList.remove('active');
    this.selectedText = '';
  }

  async handleAction(action) {
    switch (action) {
      case 'copy':
        try {
          await navigator.clipboard.writeText(this.selectedText);
        } catch (err) {
          console.error('Failed to copy:', err);
        }
        break;
      
      case 'quote':
        // TODO: implement quote
        break;
      
      case 'branch':
        // TODO: implement branch
        break;
    }
    
    this.hide();
  }
}
