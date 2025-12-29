// dm.js - Direct Messages frontend logic
import { CONFIG } from './config.js?v=6';
import * as NightShift from './nightshift.js?v=1';
import { AnimalProfile } from './animalProfile.js?v=18';
import { getCookie, apiInit } from './api.js?v=7';
import { TelegramAuth } from './telegramAuth.js?v=2';

(async function () {
  const API = CONFIG.API_PATH;
  const DM_API = CONFIG.BASE_PATH + '/api/dm.php';
  const COOKIE_NAME = 'chat_session_id';
  let sessionId = getCookie(COOKIE_NAME) || null;

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
        <div class="dm-user-emoji">${user.emoji}</div>
        <div class="dm-user-info">
          <div class="dm-user-name">${escapeHtml(user.firstName)}</div>
          <div class="dm-user-username">@${escapeHtml(user.username)}</div>
        </div>
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

    container.innerHTML = messages.map(msg => {
      const time = formatTime(msg.createdAt);
      return `
        <div class="dm-message ${msg.fromMe ? 'from-me' : 'from-them'}">
          <div class="dm-message-bubble">${escapeHtml(msg.text)}</div>
          <div class="dm-message-time">${time}</div>
        </div>
      `;
    }).join('');

    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
  };

  // Attach send handler to form
  const attachSendHandler = () => {
    const sendForm = document.getElementById('dm-send-form');
    const inputEl = document.getElementById('dm-input');
    const sendBtn = document.getElementById('dm-send-btn');

    if (!sendForm || !inputEl || !sendBtn) return;

    sendForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const text = inputEl.textContent.trim();
      if (!text || !dmConfig.recipientUserId) return;

      // Disable input
      inputEl.contentEditable = 'false';
      sendBtn.disabled = true;

      try {
        const res = await fetch(`${DM_API}?action=send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipient_id: dmConfig.recipientUserId,
            text: text
          })
        });

        const data = await res.json();

        if (data.success) {
          // Add message to UI
          addMessage(data.message);
          inputEl.textContent = '';
        } else {
          console.error('[DM] Send error:', data.error);
          alert('Ошибка отправки сообщения');
        }
      } catch (e) {
        console.error('[DM] Send error:', e);
        alert('Ошибка отправки сообщения');
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

  // Add message to UI
  const addMessage = (msg) => {
    const container = document.getElementById('dm-messages');
    if (!container) return;

    const time = formatTime(msg.createdAt);
    const div = document.createElement('div');
    div.className = `dm-message ${msg.fromMe ? 'from-me' : 'from-them'}`;
    div.innerHTML = `
      <div class="dm-message-bubble">${escapeHtml(msg.text)}</div>
      <div class="dm-message-time">${time}</div>
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

  // Initialize
  await loadUsers();
  if (dmConfig.recipientUserId) {
    await loadMessages();
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
          const currentCount = container.querySelectorAll('.dm-message').length;

          if (data.messages.length > currentCount) {
            // New messages - render all
            renderMessages(data.messages);
          }
        }
      } catch (e) {
        console.error('[DM] Poll error:', e);
      }
    }, 3000);
  }
})();
