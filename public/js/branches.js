// branches.js - Branches (topics/threads) frontend logic
import { CONFIG } from './config.js?v=6';
import * as NightShift from './nightshift.js?v=1';
import { AnimalProfile } from './animalProfile.js?v=18';
import { getCookie, apiInit } from './api.js?v=7';
import { TelegramAuth } from './telegramAuth.js?v=2';
import { initImageZoom, makeImageZoomable } from './image-zoom.js?v=2';

(async function () {
  const API = CONFIG.API_PATH;
  const BRANCHES_API = CONFIG.BASE_PATH + '/api/branches.php';
  const COOKIE_NAME = 'chat_session_id';
  let sessionId = getCookie(COOKIE_NAME) || null;

  // Current filter state
  let currentFilter = 'all'; // 'all', 'my', 'hidden'

  // Hidden branches - stored in localStorage
  let hiddenBranches = JSON.parse(localStorage.getItem('hidden_branches') || '[]');

  // Initialize NightShift
  NightShift.init();

  // Get config from PHP
  const branchConfig = window.BRANCH_CONFIG || {};

  // Initialize API to get user emoji
  const userEmojiEl = document.getElementById('user-emoji');
  const data = await apiInit(API, sessionId, COOKIE_NAME);
  sessionId = data.session_id;
  let myName = data.name;
  const initialEmoji = myName.split(' ')[0];

  if (userEmojiEl) {
    userEmojiEl.textContent = initialEmoji;
  }

  // Align user header dynamically based on h1 position
  function alignUserHeader() {
    const h1 = document.querySelector('h1');
    const userHeader = document.getElementById('user-header');

    if (h1 && userHeader) {
      const h1Rect = h1.getBoundingClientRect();
      const containerRect = h1.parentElement.getBoundingClientRect();
      const rightOffset = h1Rect.right - containerRect.left;

      userHeader.style.marginLeft = rightOffset - userHeader.offsetWidth + 'px';
    }
  }

  // Call alignment on load and resize
  alignUserHeader();
  window.addEventListener('resize', alignUserHeader);

  // Initialize Animal Profile
  const animalProfile = new AnimalProfile(sessionId, initialEmoji, (newName) => {
    myName = newName;
    const newEmoji = newName.split(' ')[0];
    if (userEmojiEl) {
      userEmojiEl.textContent = newEmoji;
    }
  });
  await animalProfile.init();

  // Check Telegram auth and load profile
  const telegramAuth = new TelegramAuth();
  const authData = await telegramAuth.checkAuth();

  if (authData && authData.user_id) {
    const savedProfile = await animalProfile.loadAndApplyUserProfile();
    if (savedProfile && userEmojiEl) {
      userEmojiEl.textContent = savedProfile.emoji;
    }
    animalProfile.showLogoutButton();
  }

  // Show profile button
  const profileBtn = document.getElementById('animal-profile-btn');
  if (profileBtn) {
    profileBtn.addEventListener('click', () => {
      animalProfile.open();
    });
  }

  // Load branches list
  const loadBranches = async () => {
    try {
      const res = await fetch(`${BRANCHES_API}?action=get_branches`);
      const data = await res.json();

      if (data.success) {
        renderBranchesList(data.branches);
        return data.branches;
      }
      return [];
    } catch (e) {
      console.error('[Branches] Error loading branches:', e);
      return [];
    }
  };

  // Render branches list
  const renderBranchesList = (branches) => {
    const listEl = document.getElementById('branches-list');
    if (!listEl) return;

    // Filter branches based on current filter
    let filteredBranches = branches;
    if (currentFilter === 'my') {
      // My branches - created by current user
      filteredBranches = branches.filter(branch => branch.creatorUserId === branchConfig.currentUserId);
    } else if (currentFilter === 'hidden') {
      // Hidden branches
      filteredBranches = branches.filter(branch => hiddenBranches.includes(parseInt(branch.id)));
    } else {
      // 'all' shows all branches except hidden
      filteredBranches = branches.filter(branch => !hiddenBranches.includes(parseInt(branch.id)));
    }

    listEl.innerHTML = filteredBranches.map(branch => `
      <div class="branch-item ${branch.id == branchConfig.branchId ? 'active' : ''}"
           data-branch-id="${branch.id}"
           data-title="${escapeHtml(branch.title)}">
        ${escapeHtml(branch.title)}
      </div>
    `).join('');

    // Add click handlers to branch items
    listEl.querySelectorAll('.branch-item').forEach(item => {
      // Left click - open branch
      item.addEventListener('click', () => {
        const branchId = item.dataset.branchId;
        const title = item.dataset.title;
        openBranch(branchId, title);
      });

      // Right click - show context menu
      item.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showContextMenu(e.clientX, e.clientY, item);
      });
    });
  };

  // Open branch
  const openBranch = async (branchId, title) => {
    // Update URL
    const newUrl = `${CONFIG.BASE_PATH}/branches/${branchId}`;
    history.pushState({ branchId, title }, '', newUrl);

    // Update branchConfig
    branchConfig.branchId = branchId;
    branchConfig.branchTitle = title;

    // Hide empty state, show chat container
    const emptyState = document.querySelector('.empty-state');
    let chatContainer = document.querySelector('.branch-chat-container');

    if (emptyState) {
      emptyState.style.display = 'none';
    }

    // Show branches image when branch is opened
    const branchesImg = document.querySelector('.branch-background-bird');
    if (branchesImg) {
      branchesImg.style.display = 'block';
    }

    if (!chatContainer) {
      // Create chat container if it doesn't exist
      const wrap = document.querySelector('.wrap');
      chatContainer = document.createElement('div');
      chatContainer.className = 'branch-chat-container';
      chatContainer.innerHTML = `
        <div class="branch-chat-header">
          <span class="branch-title">${escapeHtml(title)}</span>
        </div>
        <div id="branch-messages" class="branch-messages"></div>
        <div class="branch-input-wrapper">
          <form id="branch-send-form" class="branch-send-form">
            <div id="branch-input" class="branch-input" contenteditable="true" data-placeholder="Написать сообщение..."></div>
            <button type="submit" id="branch-send-paw-btn" class="branch-send-paw-btn">
              <img src="assets/send-paw.png" alt="Отправить">
            </button>
          </form>
        </div>
      `;
      wrap.appendChild(chatContainer);

      // Attach send handler
      attachSendHandler();
    } else {
      chatContainer.querySelector('.branch-title').textContent = title;
      chatContainer.style.display = 'flex';
    }

    // Update active branch in list
    document.querySelectorAll('.branch-item').forEach(item => {
      item.classList.remove('active');
    });
    document.querySelector(`[data-branch-id="${branchId}"]`)?.classList.add('active');

    // Load messages
    await loadMessages();

    // Focus input
    const inputEl = document.getElementById('branch-input');
    if (inputEl) inputEl.focus();
  };

  // Load messages for current branch
  const loadMessages = async () => {
    if (!branchConfig.branchId) return;

    try {
      const res = await fetch(`${BRANCHES_API}?action=get_messages&branch_id=${branchConfig.branchId}`);
      const data = await res.json();

      if (data.success) {
        renderMessages(data.messages);
      }
    } catch (e) {
      console.error('[Branches] Error loading messages:', e);
    }
  };

  // Render messages
  const renderMessages = (messages) => {
    const container = document.getElementById('branch-messages');
    if (!container) return;

    container.innerHTML = messages.map(msg => {
      const time = formatTime(msg.createdAt);
      const content = renderMessageContent(msg.text, msg.metadata);
      const messageClass = msg.fromMe ? 'from-me' : 'from-them';
      return `
        <div class="branch-message ${messageClass}">
          <div class="branch-message-bubble">${content}</div>
          <div class="branch-message-time">${time}</div>
        </div>
      `;
    }).join('');

    // Make images zoomable
    initImageZoom();
    container.querySelectorAll('img').forEach(img => {
      if (!img.classList.contains('zoomable-image')) {
        makeImageZoomable(img);
      }
    });

    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
  };

  // Attach send handler to form
  const attachSendHandler = () => {
    const sendForm = document.getElementById('branch-send-form');
    const inputEl = document.getElementById('branch-input');
    const sendBtn = document.getElementById('branch-send-paw-btn');

    if (!sendForm || !inputEl || !sendBtn) return;

    // Toggle paw button visibility based on input content
    const updatePawVisibility = () => {
      const hasContent = inputEl.textContent.trim().length > 0;
      if (hasContent) {
        sendBtn.classList.add('visible');
      } else {
        sendBtn.classList.remove('visible');
      }
    };

    inputEl.addEventListener('input', updatePawVisibility);
    updatePawVisibility();

    sendForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const text = inputEl.textContent.trim();
      if (!text) return;
      if (!branchConfig.branchId) return;

      // Disable input
      inputEl.contentEditable = 'false';
      sendBtn.disabled = true;

      try {
        const res = await fetch(`${BRANCHES_API}?action=send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            branch_id: branchConfig.branchId,
            text: text
          })
        });

        const data = await res.json();

        if (data.success) {
          // Add message to UI
          addMessage(data.message);
          inputEl.innerHTML = '';
          updatePawVisibility();
        } else {
          alert('Ошибка отправки сообщения');
        }
      } catch (e) {
        console.error('[Branches] Send error:', e);
        alert('Ошибка отправки сообщения');
      } finally {
        inputEl.contentEditable = 'true';
        sendBtn.disabled = false;
        inputEl.focus();
      }
    });

    // Enter to send
    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendForm.dispatchEvent(new Event('submit'));
      }
    });
  };

  // Initialize send handler if branch is already open
  if (branchConfig.branchId) {
    attachSendHandler();
  }

  // Add message to UI
  const addMessage = (msg) => {
    const container = document.getElementById('branch-messages');
    if (!container) return;

    const time = formatTime(msg.createdAt);
    const content = renderMessageContent(msg.text, msg.metadata);
    const messageClass = msg.fromMe ? 'from-me' : 'from-them';
    const div = document.createElement('div');
    div.className = `branch-message ${messageClass}`;
    div.innerHTML = `
      <div class="branch-message-bubble">${content}</div>
      <div class="branch-message-time">${time}</div>
    `;
    container.appendChild(div);

    container.scrollTop = container.scrollHeight;
  };

  // Format time
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    const time = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

    if (messageDate.getTime() === today.getTime()) {
      return time;
    } else if (messageDate.getTime() === today.getTime() - 86400000) {
      return `вчера ${time}`;
    } else {
      const dateStr = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
      return `${dateStr} ${time}`;
    }
  };

  // Escape HTML
  const escapeHtml = (text) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  // Render message content
  const renderMessageContent = (text, metadata) => {
    let html = '';

    // If message has quote metadata, render quote
    if (metadata && metadata.quote) {
      html += '<div class="quote-block">';
      html += `<div class="quote-text"><em>${escapeHtml(metadata.quote.text)}</em></div>`;
      if (metadata.quote.author) {
        html += `<div class="quote-author">${escapeHtml(metadata.quote.author)}</div>`;
      }
      html += '</div>';
    }

    // Add regular message text if present
    if (text) {
      html += escapeHtml(text);
    }

    return html;
  };

  // Context menu functions
  const contextMenu = document.getElementById('branch-context-menu');
  let contextMenuTargetItem = null;

  if (!contextMenu) {
    console.error('[Branches] Context menu not found');
  }

  const showContextMenu = (x, y, item) => {
    if (!contextMenu) return;
    contextMenuTargetItem = item;
    const branchId = parseInt(item.dataset.branchId);

    // Update hide menu item
    const hideItem = contextMenu.querySelector('[data-action="hide"]');
    if (hiddenBranches.includes(branchId)) {
      hideItem.textContent = 'Вернуть';
    } else {
      hideItem.textContent = 'Спрятать';
    }

    contextMenu.style.left = x + 'px';
    contextMenu.style.top = y + 'px';
    contextMenu.style.display = 'block';

    setTimeout(() => {
      contextMenu.classList.add('active');
    }, 10);
  };

  const hideContextMenu = () => {
    contextMenu.classList.remove('active');
    setTimeout(() => {
      contextMenu.style.display = 'none';
      contextMenuTargetItem = null;
    }, 150);
  };

  // Hide context menu on click outside
  document.addEventListener('click', (e) => {
    if (!contextMenu.contains(e.target)) {
      hideContextMenu();
    }
  });

  // Context menu actions
  if (contextMenu) {
    contextMenu.querySelectorAll('.branch-context-menu-item').forEach(item => {
      item.addEventListener('click', async () => {
      const action = item.dataset.action;
      if (!contextMenuTargetItem) return;

      const branchId = parseInt(contextMenuTargetItem.dataset.branchId);

      if (action === 'hide') {
        // Toggle hidden status
        if (hiddenBranches.includes(branchId)) {
          // Unhide branch
          hiddenBranches = hiddenBranches.filter(id => id !== branchId);
        } else {
          // Hide branch
          hiddenBranches.push(branchId);
        }
        localStorage.setItem('hidden_branches', JSON.stringify(hiddenBranches));

        // Re-render branches list
        const res = await fetch(`${BRANCHES_API}?action=get_branches`);
        const data = await res.json();
        if (data.success) {
          renderBranchesList(data.branches);
        }
      }

      hideContextMenu();
      });
    });
  }

  // Initialize
  let allBranches = [];
  allBranches = await loadBranches();
  if (branchConfig.branchId) {
    await loadMessages();
    const inputEl = document.getElementById('branch-input');
    if (inputEl) inputEl.focus();
  }

  // Setup navigation filter
  document.querySelectorAll('.branch-nav-item').forEach(item => {
    item.addEventListener('click', async (e) => {
      e.preventDefault();

      const filter = item.dataset.filter;
      if (filter === currentFilter) return;

      // Update active state
      document.querySelectorAll('.branch-nav-item').forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');

      // Update filter and re-render
      currentFilter = filter;

      // Re-fetch branches
      try {
        const res = await fetch(`${BRANCHES_API}?action=get_branches`);
        const data = await res.json();
        if (data.success) {
          allBranches = data.branches;
          renderBranchesList(allBranches);
        }
      } catch (e) {
        console.error('[Branches] Error loading branches:', e);
      }
    });
  });

  // Poll for new messages every 3 seconds
  if (branchConfig.branchId) {
    setInterval(async () => {
      try {
        const res = await fetch(`${BRANCHES_API}?action=get_messages&branch_id=${branchConfig.branchId}`);
        const data = await res.json();

        if (data.success) {
          const container = document.getElementById('branch-messages');
          const currentCount = container.querySelectorAll('.branch-message').length;

          if (data.messages.length > currentCount) {
            // New messages - render all
            renderMessages(data.messages);
          }
        }
      } catch (e) {
        console.error('[Branches] Poll error:', e);
      }
    }, 3000);
  }
})();
