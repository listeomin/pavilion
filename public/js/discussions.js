// discussions.js v21 - Context-aware discussions for readers, all discussions for authors
export class DiscussionsManager {
  constructor(config, apiPath) {
    this.config = config;
    this.apiPath = apiPath;
    this.currentPostId = null;
    this.discussions = [];
    this.allDiscussions = []; // All discussions for blog owner
    this.visiblePostIds = new Set(); // Currently visible posts (for readers)
    this.canDelete = false;
    this.isOwner = config.isOwnNest || false;
    this.contextMenu = null;
    this.quoteModal = null;
    this.quoteButton = null;
    this.contentElement = null;
    this.contentElements = new Map();
    this.discussionPanel = null;
    this.onDiscussionsUpdate = null;
    this._loadDebounceTimer = null;
    this._visibilityObserver = null;
    this._lastSeenComments = this._loadLastSeenComments(); // For "new" indicators

    this.initializeContextMenu();

    // For blog owner, load all discussions immediately
    if (this.isOwner && this.config.urlUsername) {
      this.loadAllBlogDiscussions();
    }
  }

  // Load/save last seen comment counts for "new" indicators
  _loadLastSeenComments() {
    try {
      const data = localStorage.getItem('discussions_last_seen_' + (this.config.urlUsername || ''));
      return data ? JSON.parse(data) : {};
    } catch (e) {
      return {};
    }
  }

  _saveLastSeenComments() {
    try {
      localStorage.setItem('discussions_last_seen_' + (this.config.urlUsername || ''), JSON.stringify(this._lastSeenComments));
    } catch (e) {}
  }

  // Mark discussion as seen (update last seen comment count)
  markDiscussionSeen(discussionId) {
    const discussion = this.discussions.find(d => String(d.id) === String(discussionId))
                    || this.allDiscussions.find(d => String(d.id) === String(discussionId));
    if (discussion) {
      this._lastSeenComments[discussionId] = parseInt(discussion.comment_count) || 0;
      this._saveLastSeenComments();
    }
  }

  // Get new comments count for a discussion
  getNewCommentsCount(discussion) {
    const lastSeen = this._lastSeenComments[discussion.id] || 0;
    const current = parseInt(discussion.comment_count) || 0;
    return Math.max(0, current - lastSeen);
  }

  // Load all discussions for the blog (for owner)
  async loadAllBlogDiscussions() {
    if (!this.config.urlUsername) return [];

    const url = this.apiPath + '/api/discussions.php?action=list&username=' + encodeURIComponent(this.config.urlUsername);
    const response = await fetch(url);
    const result = await response.json();

    if (result.success) {
      this.allDiscussions = result.discussions;
      this.canDelete = result.can_delete || false;
      this.isOwner = result.is_owner || false;

      // Update sidebar if owner
      if (this.isOwner) {
        const container = document.querySelector('.nest-discussions-content');
        if (container) {
          this.renderDiscussionsList(container);
        }
      }

      return this.allDiscussions;
    }
    return [];
  }

  // Setup visibility observer for posts (for readers - contextual discussions)
  setupVisibilityObserver() {
    if (this._visibilityObserver) return;

    this._visibilityObserver = new IntersectionObserver((entries) => {
      let changed = false;

      entries.forEach(entry => {
        const postEl = entry.target;
        const postId = postEl.dataset.postId;
        if (!postId) return;

        if (entry.isIntersecting) {
          if (!this.visiblePostIds.has(postId)) {
            this.visiblePostIds.add(postId);
            changed = true;
          }
        } else {
          if (this.visiblePostIds.has(postId)) {
            this.visiblePostIds.delete(postId);
            changed = true;
          }
        }
      });

      // Update discussions list when visible posts change (only for readers)
      if (changed && !this.isOwner) {
        this._updateContextualDiscussions();
      }
    }, {
      rootMargin: '100px 0px',
      threshold: 0.1
    });
  }

  // Observe a post element for visibility
  observePost(postElement) {
    if (!this._visibilityObserver) {
      this.setupVisibilityObserver();
    }
    this._visibilityObserver.observe(postElement);
  }

  // Update discussions shown to readers based on visible posts
  _updateContextualDiscussions() {
    if (this.isOwner) return; // Owner sees all discussions

    // Filter discussions to only those for visible posts
    const visibleDiscussions = this.discussions.filter(d =>
      this.visiblePostIds.has(String(d.post_id)) || this.visiblePostIds.has(d.post_id)
    );

    const container = document.querySelector('.nest-discussions-content');
    if (container) {
      this._renderFilteredDiscussions(container, visibleDiscussions);
    }
  }

  // Render filtered discussions (for readers)
  _renderFilteredDiscussions(container, filteredDiscussions) {
    // Similar to renderDiscussionsList but with filtered data
    const fixedInput = document.querySelector('.discussion-input-fixed');
    if (fixedInput) fixedInput.remove();

    const whale = document.getElementById('discussion-whale');
    if (whale) whale.style.display = filteredDiscussions.length > 0 ? 'none' : 'block';

    container.innerHTML = '';

    if (filteredDiscussions.length === 0) {
      container.innerHTML = '<div style="text-align:center;color:#B0AEA5;padding:32px 0;font-family:\'Ubuntu Mono\',monospace;font-size:16px;"><div style="font-size:32px;margin-bottom:12px;">💬</div><div>Пока нет обсуждений</div><div style="font-size:14px;margin-top:8px;color:#B0AEA5;">Выделите текст в посте, чтобы начать</div></div>';
      return;
    }

    const list = document.createElement('div');
    list.style.cssText = 'display:flex;flex-direction:column;gap:8px;';

    filteredDiscussions.forEach(discussion => {
      list.appendChild(this._createDiscussionItem(discussion));
    });

    container.appendChild(list);
  }

  initializeTextSelection(postId, contentElement) {
    this.currentPostId = postId;
    this.contentElement = contentElement;
    this.contentElements.set(postId, contentElement);
    this.contentElements.set(parseInt(postId), contentElement);
    this.contentElements.set(String(postId), contentElement);

    // For readers: observe post visibility for contextual discussions
    if (!this.isOwner) {
      const postEl = contentElement.closest('.nest-post');
      if (postEl) {
        this.observePost(postEl);
      }
    }

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

    // Mark as seen for owner (update last seen comment count)
    if (this.isOwner) {
      this._lastSeenComments[discussionId] = comments.length;
      this._saveLastSeenComments();
    }

    container.innerHTML = '';

    // Header row: back button (left) + delete button (right)
    const headerRow = document.createElement('div');
    headerRow.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;';

    // Back button - Garden/Olive color, Ubuntu Mono font
    const backBtn = document.createElement('button');
    backBtn.innerHTML = '← Все обсуждения';
    backBtn.style.cssText = 'background:none;border:none;color:#788C5D;font-size:15px;line-height:1.6;cursor:pointer;padding:0;font-family:"Ubuntu Mono",monospace;font-weight:380;';
    backBtn.addEventListener('mouseenter', () => backBtn.style.color = '#5E5D59');
    backBtn.addEventListener('mouseleave', () => backBtn.style.color = '#788C5D');
    backBtn.addEventListener('click', () => {
      // Remove fixed input when going back
      const fixedInput = document.querySelector('.discussion-input-fixed');
      if (fixedInput) fixedInput.remove();
      this.renderDiscussionsList(container);
    });
    headerRow.appendChild(backBtn);

    // Delete button for post authors - in header row (right side)
    if (result.can_delete) {
      const deleteBtn = document.createElement('button');
      deleteBtn.innerHTML = '🗑️';
      deleteBtn.title = 'Удалить обсуждение';
      deleteBtn.style.cssText = 'background:none;border:none;font-size:18px;cursor:pointer;padding:0;color:#B0AEA5;';
      deleteBtn.addEventListener('mouseenter', () => deleteBtn.style.color = '#87867F');
      deleteBtn.addEventListener('mouseleave', () => deleteBtn.style.color = '#B0AEA5');
      deleteBtn.addEventListener('click', async () => {
        const fixedInput = document.querySelector('.discussion-input-fixed');
        if (fixedInput) fixedInput.remove();
        await this.deleteDiscussion(discussionId);
      });
      headerRow.appendChild(deleteBtn);
    }

    container.appendChild(headerRow);

    // Quote section - Cloud/Medium bg, Cactus border, Ubuntu Mono font
    const quoteSection = document.createElement('div');
    quoteSection.style.cssText = 'background:#F0EEE6;border-left:3px solid #BCD1CA;padding:12px 16px;margin-bottom:16px;cursor:pointer;transition:background 0.2s;';
    quoteSection.innerHTML = '<div style="font-family:\'Noto Serif\',serif;font-style:italic;font-size:15px;line-height:1.33;color:#141413;">' + this.escapeHtml(discussion.quote_text) + '</div>';
    quoteSection.title = 'Нажмите, чтобы перейти к цитате';
    quoteSection.addEventListener('mouseenter', () => quoteSection.style.background = '#E8E6DC');
    quoteSection.addEventListener('mouseleave', () => quoteSection.style.background = '#F0EEE6');
    quoteSection.addEventListener('click', () => this.scrollToQuote(discussionId));
    container.appendChild(quoteSection);

    // Comments - chat style with Cascadia Code font (with bottom padding for fixed input)
    const commentsSection = document.createElement('div');
    commentsSection.style.cssText = 'display:flex;flex-direction:column;gap:8px;padding-bottom:80px;';

    if (comments.length === 0) {
      commentsSection.innerHTML = '<div style="text-align:center;color:#B0AEA5;padding:32px 0;font-family:\'Ubuntu Mono\',monospace;font-size:16px;">Пока нет комментариев</div>';
    } else {
      comments.forEach(comment => {
        const commentEl = document.createElement('div');
        commentEl.style.cssText = 'padding:8px 0;font-family:\'Ubuntu Mono\',monospace;font-size:16px;line-height:1.6;color:#141413;';
        commentEl.textContent = (comment.created_by_emoji || '🦔') + ' ' + (comment.created_by_name || 'Аноним') + ': ' + comment.comment_text;
        commentsSection.appendChild(commentEl);
      });
    }
    container.appendChild(commentsSection);

    // Remove any existing fixed input
    const existingInput = document.querySelector('.discussion-input-fixed');
    if (existingInput) existingInput.remove();

    // Input section - fixed to bottom of sidebar (like messenger)
    const inputSection = document.createElement('div');
    inputSection.className = 'discussion-input-fixed';
    inputSection.style.cssText = 'position:fixed;bottom:0;right:0;width:420px;padding:16px 32px;box-sizing:border-box;display:flex;align-items:center;gap:4px;font-family:\'Ubuntu Mono\',monospace;font-size:16px;line-height:1.6;z-index:100;';

    const youLabel = document.createElement('span');
    youLabel.textContent = 'Вы:';
    youLabel.style.cssText = 'color:#141413;flex-shrink:0;';

    const inputWrapper = document.createElement('div');
    inputWrapper.style.cssText = 'flex:1;position:relative;';

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Напишите что-нибудь';
    input.style.cssText = 'width:100%;background:none;border:none;outline:none;font-family:\'Ubuntu Mono\',monospace;font-size:16px;line-height:1.6;color:#141413;padding:0;';

    // Submit on Enter
    input.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const text = input.value.trim();
        if (!text) return;

        input.disabled = true;
        input.placeholder = 'Отправка...';

        try {
          await this.addComment(discussionId, text);
          await this.loadDiscussions(this.currentPostId);
          // Also reload all discussions for owner
          if (this.isOwner && this.config.urlUsername) {
            await this.loadAllBlogDiscussions();
          }
          this.highlightQuotesInContent();
          this.showDiscussionPanel(discussionId);
        } catch (err) {
          alert('Ошибка: ' + err.message);
          input.disabled = false;
          input.placeholder = 'Напишите что-нибудь';
        }
      }
    });

    inputWrapper.appendChild(input);
    inputSection.appendChild(youLabel);
    inputSection.appendChild(inputWrapper);

    // Append to body (fixed positioning)
    document.body.appendChild(inputSection);

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

    // Remove fixed input when showing list
    const fixedInput = document.querySelector('.discussion-input-fixed');
    if (fixedInput) fixedInput.remove();

    // Determine which discussions to show
    let discussionsToShow;
    if (this.isOwner) {
      // Owner sees all discussions (from allDiscussions, sorted by last activity)
      discussionsToShow = this.allDiscussions.length > 0 ? this.allDiscussions : this.discussions;
    } else {
      // Reader sees only discussions for visible posts
      discussionsToShow = this.discussions.filter(d =>
        this.visiblePostIds.size === 0 || // Show all if no visibility tracking yet
        this.visiblePostIds.has(String(d.post_id)) ||
        this.visiblePostIds.has(d.post_id)
      );
    }

    const whale = document.getElementById('discussion-whale');
    if (whale) whale.style.display = discussionsToShow.length > 0 ? 'none' : 'block';

    container.innerHTML = '';

    if (discussionsToShow.length === 0) {
      container.innerHTML = '<div style="text-align:center;color:#B0AEA5;padding:32px 0;font-family:\'Ubuntu Mono\',monospace;font-size:16px;"><div style="font-size:32px;margin-bottom:12px;">💬</div><div>Пока нет обсуждений</div><div style="font-size:14px;margin-top:8px;color:#B0AEA5;">Выделите текст в посте, чтобы начать</div></div>';
      return;
    }

    const list = document.createElement('div');
    list.style.cssText = 'display:flex;flex-direction:column;gap:8px;';

    discussionsToShow.forEach(discussion => {
      list.appendChild(this._createDiscussionItem(discussion));
    });

    container.appendChild(list);
  }

  // Create a discussion item element
  _createDiscussionItem(discussion) {
    const item = document.createElement('div');
    item.style.cssText = 'padding:8px;margin:0 -8px;cursor:pointer;transition:background 0.2s,outline 0.2s;border-radius:8px;';
    item.addEventListener('mouseenter', () => {
      item.style.background = 'rgba(106,155,204,0.1)';
      item.style.outline = '1px dashed #B0AEA5';
    });
    item.addEventListener('mouseleave', () => {
      item.style.background = 'transparent';
      item.style.outline = 'none';
    });

    // Quote preview - always show the quote text as discussion title
    let previewText = discussion.quote_text;

    // Truncate if too long
    if (previewText.length > 50) {
      previewText = previewText.substring(0, 50) + '...';
    }

    // Comment count and new indicator
    const commentCount = parseInt(discussion.comment_count) || 0;
    const newCount = this.isOwner ? this.getNewCommentsCount(discussion) : 0;

    // Format: quote text + comment count (with new indicator for owner)
    let countHtml;
    if (this.isOwner && newCount > 0) {
      // Show new count in accent color for owner
      countHtml = '<span style="font-family:\'Ubuntu Mono\',monospace;font-size:14px;color:#788C5D;flex-shrink:0;font-weight:600;">+' + newCount + '</span>';
    } else {
      countHtml = '<span style="font-family:\'Ubuntu Mono\',monospace;font-size:14px;color:#B0AEA5;flex-shrink:0;">' + commentCount + '</span>';
    }

    item.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;">' +
      '<span style="font-family:\'Ubuntu Mono\',monospace;font-size:15px;line-height:1.6;color:#141413;">' + this.escapeHtml(previewText) + '</span>' +
      countHtml +
      '</div>';

    item.addEventListener('click', () => {
      // For owner: if we have post_slug and we're on the main blog page (not on individual post),
      // navigate to the post page directly instead of scrolling
      if (this.isOwner && discussion.post_slug && !this.config.postSlug) {
        // Navigate to post page with discussion hash
        const url = '/nest/' + this.config.urlUsername + '/' + discussion.post_slug + '#discussion-' + discussion.id;
        window.location.href = url;
      } else {
        this.showDiscussionPanel(discussion.id);
      }
    });

    return item;
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

    // Find the postId from the contentElement's parent post
    let postId = this.currentPostId;
    const postEl = contentElement.closest('.nest-post');
    if (postEl && postEl.dataset.postId) {
      postId = postEl.dataset.postId;
    }

    this.currentSelection = {
      text: selectedText,
      range: selection.getRangeAt(0),
      contentElement: contentElement,
      postId: postId
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
    if (!this.currentSelection) {
      throw new Error('No selection');
    }

    const contentElement = this.currentSelection.contentElement;

    // Use postId from selection (which was determined when text was selected)
    let postId = this.currentSelection.postId || this.currentPostId;

    // Fallback: find from DOM
    if (!postId) {
      const postEl = contentElement.closest('.nest-post');
      if (postEl && postEl.dataset.postId) {
        postId = postEl.dataset.postId;
      }
    }

    if (!postId) {
      throw new Error('No post ID found');
    }

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
      post_id: postId,
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

    // Reload discussions for the post where we created the discussion
    await this.loadDiscussions(postId);
    this.highlightQuotesInContent();

    // Also reload all discussions for owner
    if (this.isOwner && this.config.urlUsername) {
      await this.loadAllBlogDiscussions();
    }

    const discContainer = document.querySelector('.nest-discussions-content');
    if (discContainer) {
      this.switchToDiscussionsTab();
      // Open the newly created discussion panel
      await this.showDiscussionPanel(result.discussion_id);
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
      this.canDelete = result.can_delete || false;
      return this.discussions;
    } else {
      console.error('[Discussions] API error:', result.error);
    }

    return [];
  }

  async deleteDiscussion(discussionId) {
    if (!confirm('Удалить это обсуждение? Это действие нельзя отменить.')) {
      return false;
    }

    const response = await fetch(this.apiPath + '/api/discussions.php?action=delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ discussion_id: discussionId })
    });
    const result = await response.json();

    if (result.success) {
      // Remove highlight from content
      const highlights = document.querySelectorAll('.discussion-highlight[data-discussion-id="' + discussionId + '"]');
      highlights.forEach(el => {
        const parent = el.parentNode;
        if (parent) {
          while (el.firstChild) {
            parent.insertBefore(el.firstChild, el);
          }
          parent.removeChild(el);
          parent.normalize();
        }
      });

      // Reload discussions
      await this.loadDiscussions(this.currentPostId);
      // Also reload all discussions for owner
      if (this.isOwner && this.config.urlUsername) {
        await this.loadAllBlogDiscussions();
      }
      this.highlightQuotesInContent();

      // Update sidebar
      const container = document.querySelector('.nest-discussions-content');
      if (container) {
        this.renderDiscussionsList(container);
      }

      if (this.onDiscussionsUpdate) {
        this.onDiscussionsUpdate(this.discussions);
      }

      return true;
    } else {
      alert('Ошибка: ' + (result.error || 'Не удалось удалить'));
      return false;
    }
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
