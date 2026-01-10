// discussions.js - Module for text quotation and discussions
export class DiscussionsManager {
  constructor(config, apiPath) {
    console.log('[Discussions] Creating DiscussionsManager');
    this.config = config;
    this.apiPath = apiPath;
    this.currentPostId = null;
    this.discussions = [];
    this.contextMenu = null;
    this.quoteModal = null;
    this.quoteButton = null;

    this.initializeContextMenu();
    console.log('[Discussions] Constructor complete');
  }

  // Initialize text selection and context menu
  initializeTextSelection(postId, contentElement) {
    console.log('[Discussions] Initializing for post:', postId);
    this.currentPostId = postId;

    // Remove existing listeners if any
    if (contentElement._discussionListeners) {
      contentElement.removeEventListener('mouseup', contentElement._discussionListeners.mouseup);
      contentElement.removeEventListener('contextmenu', contentElement._discussionListeners.contextmenu);
    }

    const mouseupHandler = (e) => {
      // Small delay to ensure selection is complete
      setTimeout(() => this.handleTextSelection(e, contentElement), 10);
    };

    const contextmenuHandler = (e) => {
      console.log('[Discussions] Context menu triggered');
      const selection = window.getSelection();
      console.log('[Discussions] Selection:', selection ? selection.toString() : 'null');
      if (selection && selection.toString().trim().length > 0) {
        console.log('[Discussions] Preventing default and showing menu');
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        this.showContextMenu(e.clientX, e.clientY);
      }
    };

    // Use capture phase to catch event before any other handlers
    contentElement.addEventListener('mouseup', mouseupHandler, false);
    contentElement.addEventListener('contextmenu', contextmenuHandler, true);
    console.log('[Discussions] Event listeners attached to:', contentElement);

    // Store listeners for cleanup
    contentElement._discussionListeners = {
      mouseup: mouseupHandler,
      contextmenu: contextmenuHandler
    };
  }

  // Handle text selection
  handleTextSelection(event, contentElement) {
    const selection = window.getSelection();

    if (!selection || selection.toString().trim().length === 0) {
      this.hideContextMenu();
      this.hideQuoteButton();
      return;
    }

    const selectedText = selection.toString().trim();

    // Check text length (max 300 characters)
    if (selectedText.length > 300) {
      console.log('[Discussions] Selection too long (max 300 characters)');
      this.hideQuoteButton();
      return;
    }

    // Store selection data
    this.currentSelection = {
      text: selectedText,
      range: selection.getRangeAt(0),
      contentElement: contentElement
    };

    // Show floating quote button near selection
    this.showQuoteButton(event);
  }

  // Show floating quote button near selection
  showQuoteButton(event) {
    // Remove existing button if any
    this.hideQuoteButton();

    const button = document.createElement('button');
    button.className = 'discussions-quote-button';
    button.innerHTML = '💬 Цитировать';
    button.style.cssText = `
      position: fixed;
      left: ${event.clientX + 10}px;
      top: ${event.clientY + 10}px;
      background: #BCD1CA;
      border: none;
      border-radius: 8px;
      padding: 8px 16px;
      font-family: 'Ubuntu Sans', sans-serif;
      font-size: 14px;
      color: #5E5D59;
      cursor: pointer;
      z-index: 10001;
      box-shadow: 0px 4px 16px rgba(0, 0, 0, 0.2);
      transition: background 0.2s;
      font-weight: 600;
    `;

    button.addEventListener('mouseenter', () => {
      button.style.background = '#A8C0B8';
    });
    button.addEventListener('mouseleave', () => {
      button.style.background = '#BCD1CA';
    });
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      this.hideQuoteButton();
      this.showQuoteModal();
    });

    document.body.appendChild(button);
    this.quoteButton = button;

    // Hide button on any click outside
    setTimeout(() => {
      document.addEventListener('click', (e) => {
        if (e.target !== button) {
          this.hideQuoteButton();
        }
      }, { once: true });
    }, 10);
  }

  // Hide quote button
  hideQuoteButton() {
    if (this.quoteButton) {
      this.quoteButton.remove();
      this.quoteButton = null;
    }
  }

  // Create context menu HTML
  initializeContextMenu() {
    console.log('[Discussions] Creating context menu');
    // Remove existing menu if any
    if (this.contextMenu) {
      this.contextMenu.remove();
    }

    this.contextMenu = document.createElement('div');
    this.contextMenu.className = 'discussions-context-menu';
    this.contextMenu.style.cssText = `
      position: fixed;
      background: #FFFFFF;
      border: 1px solid #D1CFC5;
      border-radius: 8px;
      padding: 8px;
      box-shadow: 0px 4px 16px rgba(0, 0, 0, 0.1);
      z-index: 10000;
      display: none;
      cursor: pointer;
      font-family: 'Ubuntu Sans', sans-serif;
      font-size: 14px;
      color: #5E5D59;
    `;

    const menuItem = document.createElement('div');
    menuItem.textContent = '💬 Цитировать';
    menuItem.style.cssText = `
      padding: 8px 12px;
      border-radius: 4px;
      transition: background 0.2s;
    `;
    menuItem.addEventListener('mouseenter', () => {
      menuItem.style.background = '#F5F4F0';
    });
    menuItem.addEventListener('mouseleave', () => {
      menuItem.style.background = 'transparent';
    });
    menuItem.addEventListener('click', () => {
      this.hideContextMenu();
      this.showQuoteModal();
    });

    this.contextMenu.appendChild(menuItem);
    document.body.appendChild(this.contextMenu);

    // Hide menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!this.contextMenu.contains(e.target)) {
        this.hideContextMenu();
      }
    });
  }

  // Show context menu at position
  showContextMenu(x, y) {
    if (!this.contextMenu) return;

    this.contextMenu.style.left = `${x}px`;
    this.contextMenu.style.top = `${y}px`;
    this.contextMenu.style.display = 'block';
  }

  // Hide context menu
  hideContextMenu() {
    if (this.contextMenu) {
      this.contextMenu.style.display = 'none';
    }
  }

  // Show quote modal
  showQuoteModal() {
    if (!this.currentSelection) return;

    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'discussions-modal-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    // Create modal
    const modal = document.createElement('div');
    modal.className = 'discussions-modal';
    modal.style.cssText = `
      background: #FFFFFF;
      border-radius: 16px;
      padding: 32px;
      max-width: 500px;
      width: 90%;
      box-shadow: 0px 8px 32px rgba(0, 0, 0, 0.2);
    `;

    // Title
    const title = document.createElement('h3');
    title.textContent = 'Создать обсуждение';
    title.style.cssText = `
      margin: 0 0 16px 0;
      font-family: 'Ubuntu Sans', sans-serif;
      font-size: 20px;
      font-weight: 600;
      color: #5E5D59;
    `;

    // Quote preview
    const quotePreview = document.createElement('div');
    quotePreview.style.cssText = `
      background: #F5F4F0;
      border-left: 4px solid #BCD1CA;
      padding: 12px 16px;
      margin-bottom: 16px;
      border-radius: 4px;
      font-family: 'Ubuntu Sans', sans-serif;
      font-size: 14px;
      color: #5E5D59;
      line-height: 1.5;
      font-style: italic;
    `;
    quotePreview.textContent = `"${this.currentSelection.text}"`;

    // Comment textarea
    const commentLabel = document.createElement('label');
    commentLabel.textContent = 'Ваш комментарий (опционально):';
    commentLabel.style.cssText = `
      display: block;
      margin-bottom: 8px;
      font-family: 'Ubuntu Sans', sans-serif;
      font-size: 14px;
      color: #87867F;
    `;

    const commentTextarea = document.createElement('textarea');
    commentTextarea.placeholder = 'Напишите ваши мысли о цитате...';
    commentTextarea.style.cssText = `
      width: 100%;
      min-height: 100px;
      padding: 12px;
      border: 1px solid #D1CFC5;
      border-radius: 8px;
      font-family: 'Ubuntu Sans', sans-serif;
      font-size: 14px;
      color: #5E5D59;
      resize: vertical;
      margin-bottom: 16px;
      box-sizing: border-box;
    `;
    commentTextarea.addEventListener('focus', () => {
      commentTextarea.style.borderColor = '#BCD1CA';
      commentTextarea.style.outline = 'none';
    });
    commentTextarea.addEventListener('blur', () => {
      commentTextarea.style.borderColor = '#D1CFC5';
    });

    // Buttons
    const buttonsContainer = document.createElement('div');
    buttonsContainer.style.cssText = `
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    `;

    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Отмена';
    cancelButton.style.cssText = `
      padding: 10px 20px;
      border: 1px solid #D1CFC5;
      border-radius: 8px;
      background: transparent;
      font-family: 'Ubuntu Sans', sans-serif;
      font-size: 14px;
      color: #87867F;
      cursor: pointer;
      transition: all 0.2s;
    `;
    cancelButton.addEventListener('mouseenter', () => {
      cancelButton.style.background = '#F5F4F0';
    });
    cancelButton.addEventListener('mouseleave', () => {
      cancelButton.style.background = 'transparent';
    });
    cancelButton.addEventListener('click', () => {
      document.body.removeChild(overlay);
    });

    const createButton = document.createElement('button');
    createButton.textContent = 'Создать обсуждение';
    createButton.style.cssText = `
      padding: 10px 20px;
      border: none;
      border-radius: 8px;
      background: #BCD1CA;
      font-family: 'Ubuntu Sans', sans-serif;
      font-size: 14px;
      color: #5E5D59;
      cursor: pointer;
      transition: all 0.2s;
      font-weight: 600;
    `;
    createButton.addEventListener('mouseenter', () => {
      createButton.style.background = '#A8C0B8';
    });
    createButton.addEventListener('mouseleave', () => {
      createButton.style.background = '#BCD1CA';
    });
    createButton.addEventListener('click', async () => {
      createButton.disabled = true;
      createButton.textContent = 'Создание...';

      try {
        await this.createDiscussion(commentTextarea.value.trim());
        document.body.removeChild(overlay);
      } catch (error) {
        alert('Ошибка создания обсуждения: ' + error.message);
        createButton.disabled = false;
        createButton.textContent = 'Создать обсуждение';
      }
    });

    buttonsContainer.appendChild(cancelButton);
    buttonsContainer.appendChild(createButton);

    modal.appendChild(title);
    modal.appendChild(quotePreview);
    modal.appendChild(commentLabel);
    modal.appendChild(commentTextarea);
    modal.appendChild(buttonsContainer);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Focus textarea
    commentTextarea.focus();

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
      }
    });
  }

  // Create discussion via API
  async createDiscussion(initialComment) {
    if (!this.currentSelection || !this.currentPostId) {
      throw new Error('No selection or post ID');
    }

    // Calculate text position in plain text
    const contentElement = this.currentSelection.contentElement;
    const plainText = contentElement.textContent;
    const range = this.currentSelection.range;

    // Get position by creating a temporary range
    const tempRange = document.createRange();
    tempRange.selectNodeContents(contentElement);
    tempRange.setEnd(range.startContainer, range.startOffset);
    const positionStart = tempRange.toString().length;
    const positionEnd = positionStart + this.currentSelection.text.length;

    // Get context (15 chars before and after)
    const contextBefore = plainText.substring(Math.max(0, positionStart - 15), positionStart);
    const contextAfter = plainText.substring(positionEnd, Math.min(plainText.length, positionEnd + 15));

    const data = {
      post_id: this.currentPostId,
      quote_text: this.currentSelection.text,
      position_start: positionStart,
      position_end: positionEnd,
      context_before: contextBefore,
      context_after: contextAfter,
      initial_comment: initialComment || null
    };

    const response = await fetch(`${this.apiPath}/api/discussions.php?action=create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to create discussion');
    }

    console.log('[Discussions] Created discussion:', result.discussion_id);

    // Clear selection
    window.getSelection().removeAllRanges();
    this.currentSelection = null;

    // Reload discussions (will implement later)
    // await this.loadDiscussions(this.currentPostId);

    return result;
  }

  // Load discussions for a post
  async loadDiscussions(postId) {
    const response = await fetch(`${this.apiPath}/api/discussions.php?action=list&post_id=${postId}`);
    const result = await response.json();

    if (result.success) {
      this.discussions = result.discussions;
      console.log('[Discussions] Loaded', this.discussions.length, 'discussions');
      return this.discussions;
    }

    return [];
  }
}
