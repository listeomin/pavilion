// public/js/contextMenu.js

export class ContextMenu {
  constructor(editor, options = {}) {
    this.editor = editor;
    this.menu = null;
    this.selectedText = '';
    this.myName = options.myName || null;
    this.onEdit = options.onEdit || null;
    this.onDelete = options.onDelete || null;
    this.currentMessageId = null;
    this.currentMenuType = null;
    this.init();
  }

  setMyName(name) {
    this.myName = name;
  }

  init() {
    this.createMenu();
    this.attachListeners();
  }

  createMenu() {
    this.menu = document.createElement('div');
    this.menu.id = 'context-menu';
    this.menu.className = 'context-menu';
    document.body.appendChild(this.menu);
  }

  showTextMenu() {
    this.currentMenuType = 'text';
    this.menu.innerHTML = `
      <div class="context-menu-reactions">
        <span class="context-menu-reaction" data-emoji="😂">😂</span>
        <span class="context-menu-reaction" data-emoji="❤️">❤️</span>
        <span class="context-menu-reaction" data-emoji="🔥">🔥</span>
        <span class="context-menu-reaction" data-emoji="👍">👍</span>
        <span class="context-menu-reaction" data-emoji="💯">💯</span>
        <span class="context-menu-reaction" data-emoji="🍋">🍋</span>
        <span class="context-menu-reaction" data-emoji="😳">😳</span>
      </div>
      <div class="context-menu-item" data-action="copy">Скопировать</div>
      <div class="context-menu-item" data-action="quote">Цитировать</div>
      <div class="context-menu-item" data-action="branch">Создать ветку</div>
    `;
  }

  showMessageMenu() {
    this.currentMenuType = 'message';
    this.menu.innerHTML = `
      <div class="context-menu-item" data-action="edit">Редактировать</div>
      <div class="context-menu-item context-menu-item-danger" data-action="delete">Удалить</div>
    `;
  }

  attachListeners() {
    // Block default context menu for text selection and own messages
    document.addEventListener('contextmenu', (e) => {
      const selection = window.getSelection();
      const text = selection.toString().trim();

      // Check if right-clicking on own message
      const messageEl = e.target.closest('.msg');
      const isOwnMessage = messageEl &&
                          this.myName &&
                          messageEl.dataset.author === this.myName &&
                          !messageEl.classList.contains('system-msg');

      if (text) {
        // Show text selection menu
        e.preventDefault();
        this.selectedText = text;
        this.showTextMenu();
        this.show(e.clientX, e.clientY);
      } else if (isOwnMessage) {
        // Show message edit/delete menu
        e.preventDefault();
        this.currentMessageId = messageEl.dataset.messageId;
        this.showMessageMenu();
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
        if (this.editor) {
          this.editor.insertQuoteTag({ text: this.selectedText });
        }
        break;

      case 'branch':
        try {
          // Import CONFIG dynamically
          const { CONFIG } = await import('./config.js?v=6');

          // Find the message element containing the selected text
          const selection = window.getSelection();
          const messageEl = selection.anchorNode?.parentElement?.closest('.msg');
          const authorName = messageEl?.dataset?.author || null;

          const res = await fetch(CONFIG.BASE_PATH + '/api/branches.php?action=create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: this.selectedText,
              quote_text: this.selectedText,
              quote_author: authorName
            })
          });

          const data = await res.json();

          if (data.success) {
            // Force navigation to the branch page with reload
            window.location.href = `${CONFIG.BASE_PATH}/branches/${data.branch.id}`;
          } else {
            alert('Ошибка создания ветки');
          }
        } catch (e) {
          console.error('[ContextMenu] Error creating branch:', e);
          alert('Ошибка создания ветки');
        }
        break;

      case 'edit':
        if (this.onEdit && this.currentMessageId) {
          this.onEdit(this.currentMessageId);
        }
        break;

      case 'delete':
        if (this.onDelete && this.currentMessageId) {
          this.onDelete(this.currentMessageId);
        }
        break;
    }

    this.hide();
  }
}
