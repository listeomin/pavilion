// dm.js - Direct Messages frontend logic
import { CONFIG } from './config.js?v=6';
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
      }
    } catch (e) {
      console.error('[DM] Error loading users:', e);
    }
  };

  // Render users list
  const renderUsersList = (users) => {
    const listEl = document.getElementById('dm-users-list');
    if (!listEl) return;

    listEl.innerHTML = users.map(user => `
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
      item.addEventListener('click', () => {
        const userId = item.dataset.userId;
        const username = item.dataset.username;
        const firstName = item.dataset.firstName;
        const emoji = item.dataset.emoji;

        openChat(userId, username, firstName, emoji);
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
            <button type="submit" id="dm-send-btn" class="dm-send-btn">
              <img src="assets/paw.svg" alt="Send">
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
    const sendBtn = document.getElementById('dm-send-btn');

    if (!sendForm || !inputEl || !sendBtn) return;

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

  // Initialize
  await loadUsers();
  if (dmConfig.recipientUserId) {
    await loadMessages();
    const inputEl = document.getElementById('dm-input');
    if (inputEl) inputEl.focus();
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
