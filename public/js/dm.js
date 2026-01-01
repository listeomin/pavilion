// dm.js - Direct Messages frontend logic
import { CONFIG } from './config.js?v=7';
import * as NightShift from './nightshift.js?v=1';
import { AnimalProfile } from './animalProfile.js?v=18';
import { getCookie, apiInit } from './api.js?v=7';
import { TelegramAuth } from './telegramAuth.js?v=2';
import { initImageZoom, makeImageZoomable } from './image-zoom.js?v=2';

(async function () {
  const API = CONFIG.API_PATH;
  const DM_API = CONFIG.BASE_PATH + '/api/dm.php';
  const COOKIE_NAME = 'chat_session_id';
  let sessionId = getCookie(COOKIE_NAME) || null;

  // Resident (AI agent) user IDs
  const RESIDENT_USER_IDS = [5]; // owl_ai

  // Helper function to check if user is a resident
  const isResident = (userId) => RESIDENT_USER_IDS.includes(parseInt(userId));

  // Current filter state
  let currentFilter = 'all'; // 'all', 'pack', 'residents'

  // Pack members (users added to pack) - stored in localStorage
  let packMembers = JSON.parse(localStorage.getItem('dm_pack_members') || '[]');

  // Hidden users - stored in localStorage
  let hiddenUsers = JSON.parse(localStorage.getItem('dm_hidden_users') || '[]');

  // Initialize NightShift
  NightShift.init();

  // Get config from PHP
  const dmConfig = window.DM_CONFIG || {};
  console.log('[DM] Config:', dmConfig);

  // Initialize API to get user emoji
  const userEmojiEl = document.getElementById('user-emoji');
  const data = await apiInit(API, sessionId, COOKIE_NAME);
  sessionId = data.session_id;
  let myName = data.name;
  const initialEmoji = myName.split(' ')[0];

  if (userEmojiEl) {
    userEmojiEl.textContent = initialEmoji;
  }

  // Set fixed margin for user header (Послания)
  const userHeader = document.getElementById('user-header');
  if (userHeader) {
    userHeader.style.marginLeft = '118.453px';
  }

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

  // Load users list
  const loadUsers = async () => {
    try {
      const res = await fetch(`${DM_API}?action=get_users`);
      const data = await res.json();

      if (data.success) {
        renderUsersList(data.users);
        return data.users;
      }
      return [];
    } catch (e) {
      console.error('[DM] Error loading users:', e);
      return [];
    }
  };

  // Render users list
  const renderUsersList = (users) => {
    const listEl = document.getElementById('dm-users-list');
    if (!listEl) return;

    // Filter users based on current filter
    let filteredUsers = users;
    if (currentFilter === 'residents') {
      filteredUsers = users.filter(user => isResident(user.id));
    } else if (currentFilter === 'pack') {
      // Pack members - users added to pack
      filteredUsers = users.filter(user => packMembers.includes(parseInt(user.id)));
    } else if (currentFilter === 'hidden') {
      // Hidden users
      filteredUsers = users.filter(user => hiddenUsers.includes(parseInt(user.id)));
    } else {
      // 'all' shows all users except hidden
      filteredUsers = users.filter(user => !hiddenUsers.includes(parseInt(user.id)));
    }

    listEl.innerHTML = filteredUsers.map(user => `
      <div class="dm-user-item ${user.username === dmConfig.recipientUsername ? 'active' : ''}"
           data-user-id="${user.id}"
           data-username="${user.username}"
           data-first-name="${escapeHtml(user.firstName)}"
           data-emoji="${user.emoji}">
        ${user.emoji} ${escapeHtml(user.firstName)}
      </div>
    `).join('');

    // Add click handlers to user items
    listEl.querySelectorAll('.dm-user-item').forEach(item => {
      // Left click - open chat
      item.addEventListener('click', () => {
        const userId = item.dataset.userId;
        const username = item.dataset.username;
        const firstName = item.dataset.firstName;
        const emoji = item.dataset.emoji;

        openChat(userId, username, firstName, emoji);
      });

      // Right click - show context menu
      item.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showContextMenu(e.clientX, e.clientY, item);
      });
    });
  };

  // Open chat with specific user
  const openChat = async (userId, username, firstName, emoji) => {
    // Update active user in list
    document.querySelectorAll('.dm-user-item').forEach(item => {
      item.classList.remove('active');
    });
    document.querySelector(`[data-user-id="${userId}"]`)?.classList.add('active');

    // Update dmConfig
    dmConfig.recipientUserId = userId;
    dmConfig.recipientUsername = username;
    dmConfig.recipientFirstName = firstName;
    dmConfig.recipientEmoji = emoji;

    // Update URL without reload
    const newUrl = `${CONFIG.BASE_PATH}/messages/${username}`;
    history.pushState({ userId, username, firstName, emoji }, '', newUrl);

    // Hide empty state, show chat container
    const emptyState = document.querySelector('.empty-state');
    let chatContainer = document.querySelector('.dm-chat-container');

    if (emptyState) {
      emptyState.style.display = 'none';
    }

    // Show bird image when chat is opened
    const birdImg = document.querySelector('.dm-background-bird');
    if (birdImg) {
      birdImg.style.display = 'block';
    }

    if (!chatContainer) {
      // Create chat container if it doesn't exist
      const wrap = document.querySelector('.wrap');
      chatContainer = document.createElement('div');
      chatContainer.className = 'dm-chat-container';
      chatContainer.innerHTML = `
        <div class="dm-chat-header">
          <span class="dm-recipient-emoji">${emoji}</span>
          <span class="dm-recipient-name">${escapeHtml(firstName)}</span>
        </div>
        <div id="dm-messages" class="dm-messages"></div>
        <div class="dm-input-wrapper">
          <form id="dm-send-form" class="dm-send-form">
            <div id="dm-input" class="dm-input" contenteditable="true" data-placeholder="Написать послание..."></div>
            <button type="submit" id="dm-send-paw-btn" class="dm-send-paw-btn">
              <img src="assets/send-paw.png" alt="Отправить">
            </button>
          </form>
        </div>
      `;
      wrap.appendChild(chatContainer);

      // Attach send handler
      attachSendHandler();
    } else {
      // Update existing chat header
      chatContainer.querySelector('.dm-recipient-emoji').textContent = emoji;
      chatContainer.querySelector('.dm-recipient-name').textContent = firstName;
      chatContainer.style.display = 'flex';
    }

    // Load messages
    await loadMessages();

    // Focus input
    const inputEl = document.getElementById('dm-input');
    if (inputEl) inputEl.focus();
  };

  // Load messages for current chat
  const loadMessages = async () => {
    if (!dmConfig.recipientUserId) return;

    try {
      const res = await fetch(`${DM_API}?action=get_messages&recipient_id=${dmConfig.recipientUserId}`);
      const data = await res.json();

      if (data.success) {
        renderMessages(data.messages);
      }
    } catch (e) {
      console.error('[DM] Error loading messages:', e);
    }
  };

  // Render messages
  const renderMessages = (messages) => {
    const container = document.getElementById('dm-messages');
    if (!container) return;

    // Remove typing indicator if exists
    const typingIndicator = container.querySelector('.typing-indicator');
    if (typingIndicator) {
      typingIndicator.remove();
    }

    container.innerHTML = messages.map(msg => {
      const time = formatTime(msg.createdAt);
      const content = renderMessageContent(msg.text, msg.metadata);
      const isFromResident = !msg.fromMe && isResident(msg.fromUserId);
      const messageClass = msg.fromMe ? 'from-me' : (isFromResident ? 'from-resident' : 'from-them');
      return `
        <div class="dm-message ${messageClass}">
          <div class="dm-message-bubble">${content}</div>
          <div class="dm-message-time">${time}</div>
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
    const sendForm = document.getElementById('dm-send-form');
    const inputEl = document.getElementById('dm-input');
    const sendBtn = document.getElementById('dm-send-paw-btn');

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

    // Handle paste event for images
    inputEl.addEventListener('paste', async (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          e.preventDefault();
          const file = item.getAsFile();
          await uploadAndInsertImage(file, inputEl);
        }
      }
    });

    sendForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Collect image tags
      const imageTags = inputEl.querySelectorAll('.image-tag[data-loaded="true"]');
      const images = Array.from(imageTags).map(tag => ({
        id: tag.dataset.id,
        url: tag.dataset.url
      }));

      // Get text content with image placeholders
      let text = '';
      const processNode = (node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          text += node.textContent;
        } else if (node.classList && node.classList.contains('image-tag')) {
          if (node.dataset.loaded === 'true') {
            text += `__IMAGE_TAG_${node.dataset.id}__`;
          }
        } else if (node.childNodes) {
          node.childNodes.forEach(processNode);
        }
      };
      inputEl.childNodes.forEach(processNode);
      text = text.trim();

      if (!text && images.length === 0) return;
      if (!dmConfig.recipientUserId) return;

      // Check if sending to a resident
      const sendingToResident = isResident(dmConfig.recipientUserId);

      // If sending to resident, clear input and show typing indicator immediately
      if (sendingToResident) {
        inputEl.innerHTML = '';
        showTypingIndicator();
      }

      // Disable input
      inputEl.contentEditable = 'false';
      sendBtn.disabled = true;

      // Prepare metadata
      let metadata = null;
      if (images.length > 0) {
        metadata = {
          type: 'images',
          images: images
        };
      }

      try {
        const res = await fetch(`${DM_API}?action=send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipient_id: dmConfig.recipientUserId,
            text: text,
            metadata: metadata
          })
        });

        const data = await res.json();

        if (data.success) {
          // Add message to UI
          addMessage(data.message);
          if (!sendingToResident) {
            inputEl.innerHTML = '';
          }
        } else {
          console.error('[DM] Send error:', data.error);
          alert('Ошибка отправки сообщения');
          if (sendingToResident) {
            removeTypingIndicator();
          }
        }
      } catch (e) {
        console.error('[DM] Send error:', e);
        alert('Ошибка отправки сообщения');
        if (sendingToResident) {
          removeTypingIndicator();
        }
      } finally {
        inputEl.contentEditable = 'true';
        sendBtn.disabled = false;
        inputEl.focus();
      }
    });

    // Enter to send (Shift+Enter for new line)
    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendForm.dispatchEvent(new Event('submit'));
      }
    });
  };

  // Initialize send handler if chat is already open
  if (dmConfig.recipientUserId) {
    attachSendHandler();
  }

  // Show typing indicator
  const showTypingIndicator = () => {
    const container = document.getElementById('dm-messages');
    if (!container) return;

    // Remove existing typing indicator if any
    const existing = container.querySelector('.typing-indicator');
    if (existing) return;

    const div = document.createElement('div');
    div.className = 'dm-message typing-indicator';
    div.innerHTML = `
      <div class="dm-message-bubble">Печатает...</div>
    `;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  };

  // Remove typing indicator
  const removeTypingIndicator = () => {
    const container = document.getElementById('dm-messages');
    if (!container) return;

    const indicator = container.querySelector('.typing-indicator');
    if (indicator) {
      indicator.remove();
    }
  };

  // Add message to UI
  const addMessage = (msg) => {
    const container = document.getElementById('dm-messages');
    if (!container) return;

    const time = formatTime(msg.createdAt);
    const content = renderMessageContent(msg.text, msg.metadata);
    const isFromResident = !msg.fromMe && isResident(msg.fromUserId);
    const messageClass = msg.fromMe ? 'from-me' : (isFromResident ? 'from-resident' : 'from-them');
    const div = document.createElement('div');
    div.className = `dm-message ${messageClass}`;
    div.innerHTML = `
      <div class="dm-message-bubble">${content}</div>
      <div class="dm-message-time">${time}</div>
    `;
    container.appendChild(div);

    // Make images in new message zoomable
    div.querySelectorAll('img').forEach(img => {
      if (!img.classList.contains('zoomable-image')) {
        makeImageZoomable(img);
      }
    });

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

  // Render message content with images
  const renderMessageContent = (text, metadata) => {
    let content = escapeHtml(text || '');

    // Replace image placeholders with actual images
    if (metadata && metadata.images && metadata.images.length > 0) {
      metadata.images.forEach(img => {
        const placeholder = `__IMAGE_TAG_${img.id}__`;
        const imageHtml = `<img src="${escapeHtml(img.url)}" alt="Image" style="max-width: 100%; border-radius: 8px; margin: 4px 0; display: block;">`;
        content = content.replace(placeholder, imageHtml);
      });
    }

    return content;
  };

  // Upload and insert image
  const uploadAndInsertImage = async (file, inputEl) => {
    const tempId = 'img_' + Date.now();

    // Create image tag placeholder
    const imgTag = document.createElement('span');
    imgTag.className = 'image-tag';
    imgTag.dataset.id = tempId;
    imgTag.dataset.loaded = 'false';
    imgTag.contentEditable = 'false';
    imgTag.textContent = '[картинка]';

    // Insert into input
    inputEl.appendChild(imgTag);
    inputEl.appendChild(document.createTextNode(' '));

    try {
      // Upload image
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch(CONFIG.BASE_PATH + '/api/upload_image.php', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success && result.file && result.file.url) {
        // Update tag with success
        imgTag.dataset.loaded = 'true';
        imgTag.dataset.url = result.file.url;
      } else {
        // Upload failed - remove tag
        imgTag.remove();
        alert('Ошибка загрузки изображения');
      }
    } catch (error) {
      console.error('[DM] Image upload error:', error);
      imgTag.remove();
      alert('Ошибка загрузки изображения');
    }
  };

  // Context menu functions
  const contextMenu = document.getElementById('dm-user-context-menu');
  let contextMenuTargetItem = null;

  const showContextMenu = (x, y, item) => {
    contextMenuTargetItem = item;
    const userId = parseInt(item.dataset.userId);

    // Update menu items based on user state
    const packItem = contextMenu.querySelector('[data-action="add-to-pack"]');
    const hideItem = contextMenu.querySelector('[data-action="hide"]');

    // Update pack menu item
    if (packMembers.includes(userId)) {
      packItem.textContent = 'Выгнать из стаи';
    } else {
      packItem.textContent = 'В Стаю';
    }

    // Update hide menu item
    if (hiddenUsers.includes(userId)) {
      hideItem.textContent = 'Вернуть';
    } else {
      hideItem.textContent = 'Спрятать';
    }

    contextMenu.style.left = x + 'px';
    contextMenu.style.top = y + 'px';
    contextMenu.style.display = 'block';

    // Add active class with slight delay for animation
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
  contextMenu.querySelectorAll('.dm-context-menu-item').forEach(item => {
    item.addEventListener('click', async () => {
      const action = item.dataset.action;
      if (!contextMenuTargetItem) return;

      const userId = parseInt(contextMenuTargetItem.dataset.userId);
      const username = contextMenuTargetItem.dataset.username;

      if (action === 'add-to-pack') {
        // Toggle pack membership
        if (packMembers.includes(userId)) {
          // Remove from pack
          packMembers = packMembers.filter(id => id !== userId);
        } else {
          // Add to pack
          packMembers.push(userId);
        }
        localStorage.setItem('dm_pack_members', JSON.stringify(packMembers));
      } else if (action === 'goto-nest') {
        // Go to user's nest
        window.location.href = `${CONFIG.BASE_PATH}/nest/${username}`;
        return; // Don't hide menu or re-render, we're navigating away
      } else if (action === 'hide') {
        // Toggle hidden status
        if (hiddenUsers.includes(userId)) {
          // Unhide user
          hiddenUsers = hiddenUsers.filter(id => id !== userId);
        } else {
          // Hide user
          hiddenUsers.push(userId);
        }
        localStorage.setItem('dm_hidden_users', JSON.stringify(hiddenUsers));
      }

      // Re-render users list
      const res = await fetch(`${DM_API}?action=get_users`);
      const data = await res.json();
      if (data.success) {
        renderUsersList(data.users);
      }

      hideContextMenu();
    });
  });

  // Initialize
  let allUsers = []; // Store all users for filtering
  const initialUsers = await loadUsers();
  if (dmConfig.recipientUserId) {
    await loadMessages();
    const inputEl = document.getElementById('dm-input');
    if (inputEl) inputEl.focus();
  }

  // Setup navigation filter
  document.querySelectorAll('.dm-nav-item').forEach(item => {
    item.addEventListener('click', async (e) => {
      e.preventDefault();

      const filter = item.dataset.filter;
      if (filter === currentFilter) return;

      // Update active state
      document.querySelectorAll('.dm-nav-item').forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');

      // Update filter and re-render
      currentFilter = filter;

      // Re-fetch users to ensure we have latest data
      try {
        const res = await fetch(`${DM_API}?action=get_users`);
        const data = await res.json();
        if (data.success) {
          allUsers = data.users;
          renderUsersList(allUsers);
        }
      } catch (e) {
        console.error('[DM] Error loading users:', e);
      }
    });
  });

  // Hidden button - toggle hidden filter
  const hiddenBtn = document.getElementById('dm-hidden-btn');
  if (hiddenBtn) {
    hiddenBtn.addEventListener('click', async () => {
      if (currentFilter === 'hidden') {
        // Switch back to 'all'
        currentFilter = 'all';
        document.querySelectorAll('.dm-nav-item').forEach(nav => nav.classList.remove('active'));
        document.querySelector('.dm-nav-item[data-filter="all"]')?.classList.add('active');
      } else {
        // Switch to 'hidden'
        currentFilter = 'hidden';
        document.querySelectorAll('.dm-nav-item').forEach(nav => nav.classList.remove('active'));
      }

      // Re-fetch users
      try {
        const res = await fetch(`${DM_API}?action=get_users`);
        const data = await res.json();
        if (data.success) {
          allUsers = data.users;
          renderUsersList(allUsers);
        }
      } catch (e) {
        console.error('[DM] Error loading users:', e);
      }
    });
  }

  // Poll for new messages every 3 seconds
  if (dmConfig.recipientUserId) {
    setInterval(async () => {
      try {
        const res = await fetch(`${DM_API}?action=get_messages&recipient_id=${dmConfig.recipientUserId}`);
        const data = await res.json();

        if (data.success) {
          const container = document.getElementById('dm-messages');
          // Exclude typing indicator from count
          const currentCount = container.querySelectorAll('.dm-message:not(.typing-indicator)').length;

          if (data.messages.length > currentCount) {
            // New messages - render all (this will also remove typing indicator)
            renderMessages(data.messages);
          }
        }
      } catch (e) {
        console.error('[DM] Poll error:', e);
      }
    }, 3000);
  }
})();
