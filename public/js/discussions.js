// discussions.js v18 - Fixed highlighting across element boundaries
export class DiscussionsManager {
  constructor(config, apiPath) {
    this.config = config;
    this.apiPath = apiPath;
    this.currentPostId = null;
    this.discussions = [];
    this.contextMenu = null;
    this.quoteModal = null;
    this.quoteButton = null;
    this.contentElement = null;
    this.contentElements = new Map();
    this.discussionPanel = null;
    this.onDiscussionsUpdate = null;
    this._loadDebounceTimer = null;

    this.initializeContextMenu();
  }

  initializeTextSelection(postId, contentElement) {
    this.currentPostId = postId;
    this.contentElement = contentElement;
    this.contentElements.set(postId, contentElement);
    this.contentElements.set(parseInt(postId), contentElement);
    this.contentElements.set(String(postId), contentElement);

    if (contentElement._discussionListeners) {
      contentElement.removeEventListener('mouseup', contentElement._discussionListeners.mouseup);
      contentElement.removeEventListener('contextmenu', contentElement._discussionListeners.contextmenu);
    }

    const mouseupHandler = (e) => {
      setTimeout(() => this.handleTextSelection(e, contentElement), 10);
    };

    const contextmenuHandler = (e) => {
      const selection = window.getSelection();
      if (selection && selection.toString().trim().length > 0) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        this.showContextMenu(e.clientX, e.clientY);
      }
    };

    contentElement.addEventListener('mouseup', mouseupHandler, false);
    contentElement.addEventListener('contextmenu', contextmenuHandler, true);

    contentElement._discussionListeners = {
      mouseup: mouseupHandler,
      contextmenu: contextmenuHandler
    };

    if (this._loadDebounceTimer) {
      clearTimeout(this._loadDebounceTimer);
    }
    this._loadDebounceTimer = setTimeout(() => {
      this.loadDiscussions(postId).then(() => {
        this.highlightQuotesInContent();
      }).catch(err => {
        console.error('[Discussions] Failed to load:', err);
      });
    }, 100);
  }

  highlightQuotesInContent() {
    if (this.discussions.length === 0) return;

    // Remove existing highlights first
    for (const [postId, contentEl] of this.contentElements) {
      this.removeHighlights(contentEl);
    }
    if (this.contentElement) {
      this.removeHighlights(this.contentElement);
    }

    // Highlight each discussion
    for (const discussion of this.discussions) {
      this.highlightQuote(discussion);
    }
  }

  removeHighlights(element) {
    if (!element) return;
    const highlights = element.querySelectorAll('.discussion-highlight');
    highlights.forEach(el => {
      const parent = el.parentNode;
      if (!parent) return;
      while (el.firstChild) {
        parent.insertBefore(el.firstChild, el);
      }
      parent.removeChild(el);
    });
    element.normalize();
  }

  highlightQuote(discussion) {
    const quoteText = discussion.quote_text;
    const postId = discussion.post_id;

    // Find target element
    let targetElement = this.contentElements.get(postId)
      || this.contentElements.get(parseInt(postId))
      || this.contentElements.get(String(postId));

    if (!targetElement) {
      const postEl = document.querySelector('.nest-post[data-post-id="' + postId + '"]');
      if (postEl) targetElement = postEl.querySelector('.nest-post-content');
    }

    if (!targetElement) {
      targetElement = document.querySelector('.nest-post-content');
    }

    if (!targetElement) {
      targetElement = this.contentElement;
    }

    if (!targetElement) return;

    // Collect all text nodes
    const textNodes = [];
    const walker = document.createTreeWalker(targetElement, NodeFilter.SHOW_TEXT, null, false);
    let node;
    while (node = walker.nextNode()) {
      if (node.textContent.length > 0) {
        textNodes.push(node);
      }
    }

    if (textNodes.length === 0) return;

    // Build full text and track node positions
    let fullText = '';
    const nodeMap = [];
    for (const textNode of textNodes) {
      const start = fullText.length;
      fullText += textNode.textContent;
      nodeMap.push({ node: textNode, start: start, end: fullText.length });
    }

    // Find quote in full text
    let quoteStart = fullText.indexOf(quoteText);
    if (quoteStart === -1) {
      const trimmed = quoteText.trim();
      quoteStart = fullText.indexOf(trimmed);
      if (quoteStart === -1) return;
    }
    const quoteEnd = quoteStart + quoteText.length;

    // Find all nodes that overlap with the quote
    const overlappingNodes = [];
    for (const item of nodeMap) {
      if (item.end > quoteStart && item.start < quoteEnd) {
        overlappingNodes.push(item);
      }
    }

    if (overlappingNodes.length === 0) return;

    // Highlight each overlapping text node
    const highlightSpans = [];

    for (const item of overlappingNodes) {
      const nodeText = item.node.textContent;
      const nodeStart = item.start;

      // Calculate which part of this node to highlight
      const highlightStart = Math.max(0, quoteStart - nodeStart);
      const highlightEnd = Math.min(nodeText.length, quoteEnd - nodeStart);

      if (highlightStart >= highlightEnd) continue;

      const beforeText = nodeText.substring(0, highlightStart);
      const matchText = nodeText.substring(highlightStart, highlightEnd);
      const afterText = nodeText.substring(highlightEnd);

      const parent = item.node.parentNode;
      if (!parent) continue;

      // Create highlight span
      const span = document.createElement('span');
      span.className = 'discussion-highlight';
      span.dataset.discussionId = discussion.id;
      span.style.cssText = 'background:rgba(188,209,202,0.4);border-bottom:2px solid #BCD1CA;cursor:pointer;padding:1px 0;';
      span.textContent = matchText;
      highlightSpans.push(span);

      // Replace text node with fragments
      const fragment = document.createDocumentFragment();
      if (beforeText) fragment.appendChild(document.createTextNode(beforeText));
      fragment.appendChild(span);
      if (afterText) fragment.appendChild(document.createTextNode(afterText));

      parent.replaceChild(fragment, item.node);
    }

    // Add click handlers to all highlight spans for this discussion
    for (const span of highlightSpans) {
      span.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.switchToDiscussionsTab();
        this.showDiscussionPanel(discussion.id);
      });
      span.addEventListener('mouseenter', () => {
        span.style.background = 'rgba(188,209,202,0.6)';
      });
      span.addEventListener('mouseleave', () => {
        span.style.background = 'rgba(188,209,202,0.4)';
      });
    }
  }

  switchToDiscussionsTab() {
    const discContainer = document.querySelector('.nest-discussions-content');
    if (discContainer) {
      discContainer.style.display = 'block';
      const navContent = document.querySelector('.nest-navigation-content');
      const metaContent = document.querySelector('.nest-meta-content');
      if (navContent) navContent.style.display = 'none';
      if (metaContent) metaContent.style.display = 'none';

      document.querySelectorAll('.nest-nav-item').forEach(tab => {
        tab.classList.remove('active');
        if (tab.getAttribute('href') === '#discussions') {
          tab.classList.add('active');
        }
      });
    }
  }

  scrollToQuote(discussionId) {
    // First ensure highlights are created
    this.highlightQuotesInContent();

    // Small delay to let DOM update
    setTimeout(() => {
      const highlight = document.querySelector('.discussion-highlight[data-discussion-id="' + discussionId + '"]');

      if (highlight) {
        highlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Flash effect
        const origBg = highlight.style.background;
        highlight.style.background = 'rgba(188,209,202,0.8)';
        highlight.style.outline = '3px solid #BCD1CA';
        setTimeout(() => {
          highlight.style.background = origBg || 'rgba(188,209,202,0.4)';
          highlight.style.outline = 'none';
        }, 2000);
      } else {
        // Fallback to scrolling to post
        const discussion = this.discussions.find(d => String(d.id) === String(discussionId));
        if (discussion) {
          const postEl = document.querySelector('.nest-post[data-post-id="' + discussion.post_id + '"]');
          if (postEl) {
            postEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      }
    }, 50);
  }

  async showDiscussionPanel(discussionId) {
    const container = document.querySelector('.nest-discussions-content');
    if (!container) return;

    const response = await fetch(this.apiPath + '/api/discussions.php?action=get&id=' + discussionId);
    const result = await response.json();

    if (!result.success) {
      console.error('[Discussions] Failed to load discussion:', result.error);
      return;
    }

    const discussion = result.discussion;
    const comments = result.comments || [];

    container.innerHTML = '';

    // Back button
    const backBtn = document.createElement('button');
    backBtn.innerHTML = '← Все обсуждения';
    backBtn.style.cssText = 'background:none;border:none;color:#87867F;font-size:13px;cursor:pointer;padding:8px 0;margin-bottom:8px;font-family:Ubuntu Sans,sans-serif;';
    backBtn.addEventListener('mouseenter', () => backBtn.style.color = '#5E5D59');
    backBtn.addEventListener('mouseleave', () => backBtn.style.color = '#87867F');
    backBtn.addEventListener('click', () => this.renderDiscussionsList(container));
    container.appendChild(backBtn);

    // Quote section - clickable to scroll
    const quoteSection = document.createElement('div');
    quoteSection.style.cssText = 'background:#F5F4F0;border-left:4px solid #BCD1CA;padding:12px;margin-bottom:16px;border-radius:4px;cursor:pointer;transition:background 0.2s;';
    quoteSection.innerHTML = '<div style="font-style:italic;color:#5E5D59;font-size:14px;line-height:1.5;">"' + this.escapeHtml(discussion.quote_text) + '"</div><div style="font-size:11px;color:#A9A8A3;margin-top:8px;">' + (discussion.created_by_emoji || '🦔') + ' ' + this.escapeHtml(discussion.created_by_name || 'Аноним') + ' · ' + this.formatDate(discussion.created_at) + '</div>';
    quoteSection.title = 'Нажмите, чтобы перейти к цитате';
    quoteSection.addEventListener('mouseenter', () => quoteSection.style.background = '#EAE9E5');
    quoteSection.addEventListener('mouseleave', () => quoteSection.style.background = '#F5F4F0');
    quoteSection.addEventListener('click', () => this.scrollToQuote(discussionId));
    container.appendChild(quoteSection);

    // Comments
    const commentsSection = document.createElement('div');
    commentsSection.style.cssText = 'margin-bottom:16px;';

    if (comments.length === 0) {
      commentsSection.innerHTML = '<div style="text-align:center;color:#A9A8A3;padding:32px 0;">Пока нет комментариев</div>';
    } else {
      comments.forEach(comment => {
        const commentEl = document.createElement('div');
        commentEl.style.cssText = 'padding:12px 0;border-bottom:1px solid #F0EFE9;';
        commentEl.innerHTML = '<div style="display:flex;align-items:center;margin-bottom:8px;"><span style="font-size:16px;margin-right:8px;">' + (comment.created_by_emoji || '🦔') + '</span><span style="font-weight:500;color:#5E5D59;">' + this.escapeHtml(comment.created_by_name || 'Аноним') + '</span><span style="color:#A9A8A3;font-size:12px;margin-left:auto;">' + this.formatDate(comment.created_at) + '</span></div><div style="color:#5E5D59;line-height:1.5;padding-left:28px;">' + this.escapeHtml(comment.comment_text) + '</div>';
        commentsSection.appendChild(commentEl);
      });
    }
    container.appendChild(commentsSection);

    // Comment input
    const inputSection = document.createElement('div');
    inputSection.style.cssText = 'padding:16px 0;border-top:1px solid #E5E4E0;';

    const textarea = document.createElement('textarea');
    textarea.placeholder = 'Написать комментарий...';
    textarea.style.cssText = 'width:100%;min-height:80px;padding:12px;border:1px solid #D1CFC5;border-radius:8px;font-family:Ubuntu Sans,sans-serif;font-size:14px;color:#5E5D59;resize:none;box-sizing:border-box;margin-bottom:12px;';

    const submitBtn = document.createElement('button');
    submitBtn.textContent = 'Отправить';
    submitBtn.style.cssText = 'width:100%;padding:12px;background:#BCD1CA;border:none;border-radius:8px;font-family:Ubuntu Sans,sans-serif;font-size:14px;font-weight:600;color:#5E5D59;cursor:pointer;';
    submitBtn.addEventListener('mouseenter', () => submitBtn.style.background = '#A8C0B8');
    submitBtn.addEventListener('mouseleave', () => submitBtn.style.background = '#BCD1CA');
    submitBtn.addEventListener('click', async () => {
      const text = textarea.value.trim();
      if (!text) return;

      submitBtn.disabled = true;
      submitBtn.textContent = 'Отправка...';

      try {
        await this.addComment(discussionId, text);
        await this.loadDiscussions(this.currentPostId);
        this.highlightQuotesInContent();
        this.showDiscussionPanel(discussionId);
      } catch (err) {
        alert('Ошибка: ' + err.message);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Отправить';
      }
    });

    inputSection.appendChild(textarea);
    inputSection.appendChild(submitBtn);
    container.appendChild(inputSection);

    // Scroll to quote in post
    setTimeout(() => this.scrollToQuote(discussionId), 150);
  }

  async addComment(discussionId, text) {
    const response = await fetch(this.apiPath + '/api/discussions.php?action=add_comment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ discussion_id: discussionId, comment_text: text })
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to add comment');
    return result;
  }

  renderDiscussionsList(container) {
    if (!container) return;

    const whale = document.getElementById('discussion-whale');
    if (whale) whale.style.display = this.discussions.length > 0 ? 'none' : 'block';

    container.innerHTML = '';

    if (this.discussions.length === 0) {
      container.innerHTML = '<div style="text-align:center;color:#A9A8A3;padding:32px 16px;"><div style="font-size:32px;margin-bottom:12px;">💬</div><div>Пока нет обсуждений</div><div style="font-size:12px;margin-top:8px;">Выделите текст в посте, чтобы начать обсуждение</div></div>';
      return;
    }

    const list = document.createElement('div');
    list.style.cssText = 'padding:8px 0;';

    this.discussions.forEach(discussion => {
      const item = document.createElement('div');
      item.style.cssText = 'padding:12px 16px;border-bottom:1px solid #F0EFE9;cursor:pointer;transition:background 0.2s;';
      item.addEventListener('mouseenter', () => item.style.background = '#F5F4F0');
      item.addEventListener('mouseleave', () => item.style.background = 'transparent');

      const quotePreview = discussion.quote_text.length > 60
        ? discussion.quote_text.substring(0, 60) + '...'
        : discussion.quote_text;

      item.innerHTML = '<div style="font-style:italic;color:#5E5D59;font-size:14px;line-height:1.4;margin-bottom:8px;">"' + this.escapeHtml(quotePreview) + '"</div><div style="display:flex;align-items:center;font-size:12px;color:#A9A8A3;"><span style="margin-right:8px;">💬 ' + (discussion.comment_count || 0) + '</span><span>' + (discussion.created_by_emoji || '🦔') + ' ' + this.escapeHtml(discussion.created_by_name || 'Аноним') + '</span><span style="margin-left:auto;">' + this.formatDate(discussion.created_at) + '</span></div>';

      item.addEventListener('click', () => {
        this.showDiscussionPanel(discussion.id);
      });

      list.appendChild(item);
    });

    container.appendChild(list);
  }

  handleTextSelection(event, contentElement) {
    const selection = window.getSelection();

    if (!selection || selection.toString().trim().length === 0) {
      this.hideContextMenu();
      this.hideQuoteButton();
      return;
    }

    const selectedText = selection.toString().trim();

    if (selectedText.length > 300) {
      this.hideQuoteButton();
      return;
    }

    this.currentSelection = {
      text: selectedText,
      range: selection.getRangeAt(0),
      contentElement: contentElement
    };

    this.showQuoteButton(event);
  }

  showQuoteButton(event) {
    this.hideQuoteButton();

    const button = document.createElement('button');
    button.className = 'discussions-quote-button';
    button.innerHTML = '💬 Обсудить';
    button.style.cssText = 'position:fixed;left:' + (event.clientX + 10) + 'px;top:' + (event.clientY + 10) + 'px;background:#BCD1CA;border:none;border-radius:8px;padding:8px 16px;font-family:Ubuntu Sans,sans-serif;font-size:14px;color:#5E5D59;cursor:pointer;z-index:10001;box-shadow:0px 4px 16px rgba(0,0,0,0.2);font-weight:600;';

    button.addEventListener('mouseenter', () => button.style.background = '#A8C0B8');
    button.addEventListener('mouseleave', () => button.style.background = '#BCD1CA');
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      this.hideQuoteButton();
      this.showQuoteModal();
    });

    document.body.appendChild(button);
    this.quoteButton = button;

    setTimeout(() => {
      document.addEventListener('click', (e) => {
        if (e.target !== button) this.hideQuoteButton();
      }, { once: true });
    }, 10);
  }

  hideQuoteButton() {
    if (this.quoteButton) {
      this.quoteButton.remove();
      this.quoteButton = null;
    }
  }

  initializeContextMenu() {
    if (this.contextMenu) this.contextMenu.remove();

    this.contextMenu = document.createElement('div');
    this.contextMenu.className = 'discussions-context-menu';
    this.contextMenu.style.cssText = 'position:fixed;background:#FFFFFF;border:1px solid #D1CFC5;border-radius:8px;padding:8px;box-shadow:0px 4px 16px rgba(0,0,0,0.1);z-index:10000;display:none;cursor:pointer;font-family:Ubuntu Sans,sans-serif;font-size:14px;color:#5E5D59;';

    const menuItem = document.createElement('div');
    menuItem.textContent = '💬 Обсудить';
    menuItem.style.cssText = 'padding:8px 12px;border-radius:4px;transition:background 0.2s;';
    menuItem.addEventListener('mouseenter', () => menuItem.style.background = '#F5F4F0');
    menuItem.addEventListener('mouseleave', () => menuItem.style.background = 'transparent');
    menuItem.addEventListener('click', () => {
      this.hideContextMenu();
      this.showQuoteModal();
    });

    this.contextMenu.appendChild(menuItem);
    document.body.appendChild(this.contextMenu);

    document.addEventListener('click', (e) => {
      if (!this.contextMenu.contains(e.target)) this.hideContextMenu();
    });
  }

  showContextMenu(x, y) {
    if (!this.contextMenu) return;
    this.contextMenu.style.left = x + 'px';
    this.contextMenu.style.top = y + 'px';
    this.contextMenu.style.display = 'block';
  }

  hideContextMenu() {
    if (this.contextMenu) this.contextMenu.style.display = 'none';
  }

  showQuoteModal() {
    if (!this.currentSelection) return;

    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;';

    const modal = document.createElement('div');
    modal.style.cssText = 'background:#FFFFFF;border-radius:16px;padding:32px;max-width:500px;width:90%;box-shadow:0px 8px 32px rgba(0,0,0,0.2);';

    const title = document.createElement('h3');
    title.textContent = 'Создать обсуждение';
    title.style.cssText = 'margin:0 0 16px 0;font-family:Ubuntu Sans,sans-serif;font-size:20px;font-weight:600;color:#5E5D59;';

    const quotePreview = document.createElement('div');
    quotePreview.style.cssText = 'background:#F5F4F0;border-left:4px solid #BCD1CA;padding:12px 16px;margin-bottom:16px;border-radius:4px;font-family:Ubuntu Sans,sans-serif;font-size:14px;color:#5E5D59;line-height:1.5;font-style:italic;';
    quotePreview.textContent = '"' + this.currentSelection.text + '"';

    const commentLabel = document.createElement('label');
    commentLabel.textContent = 'Ваш комментарий (опционально):';
    commentLabel.style.cssText = 'display:block;margin-bottom:8px;font-family:Ubuntu Sans,sans-serif;font-size:14px;color:#87867F;';

    const commentTextarea = document.createElement('textarea');
    commentTextarea.placeholder = 'Напишите ваши мысли о цитате...';
    commentTextarea.style.cssText = 'width:100%;min-height:100px;padding:12px;border:1px solid #D1CFC5;border-radius:8px;font-family:Ubuntu Sans,sans-serif;font-size:14px;color:#5E5D59;resize:vertical;margin-bottom:16px;box-sizing:border-box;';

    const buttonsContainer = document.createElement('div');
    buttonsContainer.style.cssText = 'display:flex;gap:12px;justify-content:flex-end;';

    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Отмена';
    cancelButton.style.cssText = 'padding:10px 20px;border:1px solid #D1CFC5;border-radius:8px;background:transparent;font-family:Ubuntu Sans,sans-serif;font-size:14px;color:#87867F;cursor:pointer;';
    cancelButton.addEventListener('click', () => document.body.removeChild(overlay));

    const createButton = document.createElement('button');
    createButton.textContent = 'Создать обсуждение';
    createButton.style.cssText = 'padding:10px 20px;border:none;border-radius:8px;background:#BCD1CA;font-family:Ubuntu Sans,sans-serif;font-size:14px;color:#5E5D59;cursor:pointer;font-weight:600;';
    createButton.addEventListener('mouseenter', () => createButton.style.background = '#A8C0B8');
    createButton.addEventListener('mouseleave', () => createButton.style.background = '#BCD1CA');
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

    commentTextarea.focus();

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) document.body.removeChild(overlay);
    });
  }

  async createDiscussion(initialComment) {
    if (!this.currentSelection || !this.currentPostId) {
      throw new Error('No selection or post ID');
    }

    const contentElement = this.currentSelection.contentElement;
    const plainText = contentElement.textContent;
    const range = this.currentSelection.range;

    const tempRange = document.createRange();
    tempRange.selectNodeContents(contentElement);
    tempRange.setEnd(range.startContainer, range.startOffset);
    const positionStart = tempRange.toString().length;
    const positionEnd = positionStart + this.currentSelection.text.length;

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

    const response = await fetch(this.apiPath + '/api/discussions.php?action=create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to create discussion');
    }

    window.getSelection().removeAllRanges();
    this.currentSelection = null;

    await this.loadDiscussions(this.currentPostId);
    this.highlightQuotesInContent();

    const discContainer = document.querySelector('.nest-discussions-content');
    if (discContainer) {
      this.renderDiscussionsList(discContainer);
      this.switchToDiscussionsTab();
    }

    if (this.onDiscussionsUpdate) {
      this.onDiscussionsUpdate(this.discussions);
    }

    return result;
  }

  async loadDiscussions(postId) {
    const allPostIds = Array.from(this.contentElements.keys());
    if (postId && !allPostIds.includes(postId) && !allPostIds.includes(parseInt(postId))) {
      allPostIds.push(postId);
    }

    let url;
    if (allPostIds.length > 1) {
      url = this.apiPath + '/api/discussions.php?action=list&post_ids=' + allPostIds.join(',');
    } else {
      url = this.apiPath + '/api/discussions.php?action=list&post_id=' + postId;
    }

    const response = await fetch(url);
    const result = await response.json();

    if (result.success) {
      this.discussions = result.discussions;
      return this.discussions;
    } else {
      console.error('[Discussions] API error:', result.error);
    }

    return [];
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'только что';
    if (diffMins < 60) return diffMins + ' мин назад';
    if (diffHours < 24) return diffHours + ' ч назад';
    if (diffDays < 7) return diffDays + ' дн назад';

    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  }
}
