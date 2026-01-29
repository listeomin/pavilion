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
      <div class=context-menu-reactions>
        <span class=context-menu-reaction>😂</span>
        <span class=context-menu-reaction>❤️</span>
        <span class=context-menu-reaction>🔥</span>
        <span class=context-menu-reaction>👍</span>
        <span class=context-menu-reaction>💯</span>
        <span class=context-menu-reaction>🍋</span>
        <span class=context-menu-reaction>😳</span>
      </div>
      <div class=context-menu-quote>
        <div class=context-menu-quote-title>Цитировать</div>
        <input type=text id=context-menu-quote-input class=context-menu-quote-input placeholder=Комментарий... autocomplete=off />
      </div>
      <div class=context-menu-item data-action=copy>Скопировать текст</div>
      <div class=context-menu-item data-action=branch>Создать ветку</div>
    `;
    
    // Attach enter handler to input
    setTimeout(() => {
      const input = this.menu.querySelector('.context-menu-quote-input');
      if (input) {
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            this.handleQuoteSubmit(input.value);
          }
        });
        // Prevent menu close when clicking input
        input.addEventListener('click', (e) => {
          e.stopPropagation();
        });
      }
    }, 0);
  }

  showMessageMenu() {
    this.currentMenuType = 'message';
    this.menu.innerHTML = `
      <div class=context-menu-item data-action=edit>Редактировать</div>
      <div class=context-menu-item context-menu-item-danger data-action=delete>Удалить</div>
    `;
  }

  handleQuoteSubmit(comment) {
    if (this.editor) {
      // Insert quote tag
      this.editor.insertQuoteTag({ text: this.selectedText });
      
      // If there's a comment, add it to the input and submit
      if (comment && comment.trim()) {
        // Add comment text after the quote tag
        const textNode = document.createTextNode(comment);
        this.editor.inputEl.appendChild(textNode);
        this.editor.inputEl.dispatchEvent(new Event('input', { bubbles: true }));
        
        // Submit the form
        const sendForm = document.getElementById('sendForm');
        if (sendForm) {
          sendForm.dispatchEvent(new Event('submit'));
        }
      }
    }
    this.hide();
  }

  attachListeners() {
    // Show menu on text selection (mouseup)
    document.addEventListener('mouseup', (e) => {
      // Ignore if clicking inside the menu
      if (this.menu.contains(e.target)) return;
      
      // Small delay to let selection complete
      setTimeout(() => {
        const selection = window.getSelection();
        const text = selection.toString().trim();
        
        if (text && text.length > 0) {
          this.selectedText = text;
          this.showTextMenu();
          this.show(e.clientX, e.clientY);
        }
      }, 10);
    });

    // Also show on right-click (contextmenu) for own messages
    document.addEventListener('contextmenu', (e) => {
      const selection = window.getSelection();
      const text = selection.toString().trim();

      // Check if right-clicking on own message without selection
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

    // Menu item clicks (only for items with data-action)
    this.menu.addEventListener('click', (e) => {
      const item = e.target.closest('[data-action]');
      if (item && !item.classList.contains('disabled')) {
        this.handleAction(item.dataset.action);
      }
      
      // Handle quote block click (but not input)
      const quoteBlock = e.target.closest('.context-menu-quote');
      const isInput = e.target.classList.contains('context-menu-quote-input');
      if (quoteBlock && !isInput) {
        const input = this.menu.querySelector('.context-menu-quote-input');
        this.handleQuoteSubmit(input ? input.value : '');
      }
    });

    // Hide on click outside
    document.addEventListener('mousedown', (e) => {
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

      case 'branch':
        try {
          // Import CONFIG dynamically
          const { CONFIG } = await import('./config.js?v=7');

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
