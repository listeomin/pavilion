// public/js/main.js
import { CONFIG } from './config.js?v=5';
import { getCookie, apiInit, apiSend, apiChangeName, apiUpdateMessage, apiRebase } from './api.js?v=7';
import { WebSocketClient } from './websocket-client.js?v=2';
import { renderMessages, updateSendButton, renderSystemMessage, removeSystemMessage, updateMessage } from './render.js?v=12';
import { Editor } from './editor.js?v=10';
import { FormatMenu } from './format.js?v=5';
import { setupHotkeys } from './hotkeys.js?v=6';
import { InlineInput } from './inline-input.js?v=28';
import { WheelScroll } from './wheel-scroll.js?v=1';
import * as NightShift from './nightshift.js?v=1';
import { AnimalProfile } from './animalProfile.js?v=20';
import { TelegramAuth } from './telegramAuth.js?v=2';
import { ContextMenu } from './contextMenu.js?v=1';
import { initQuoteHandlers, extractQuoteData } from './quotes.js?v=1';
import { MessageHistory } from './message-history.js?v=1';
import { CommandNavigator } from './command-navigator.js?v=1';
import { initImageZoom } from './image-zoom.js?v=1';

// Function to align user header to the right edge of the title
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

(function () {
  const API = CONFIG.API_PATH;
  const COOKIE_NAME = 'chat_session_id';
  let sessionId = getCookie(COOKIE_NAME) || null;
  let myName = '';
  const lastIdRef = { value: 0 };
  let wsClient = null;
  const chatLog = document.getElementById('chat-log');
  const inputEl = document.getElementById('text');
  const formatMenu = document.getElementById('format-menu');
  const sendBtn = document.getElementById('sendBtn');
  const sendPawBtn = document.getElementById('sendPawBtn');
  const sendForm = document.getElementById('sendForm');
  const userEmojiEl = document.getElementById('user-emoji');
  const editor = new Editor(inputEl);
  const formatMenuController = new FormatMenu(formatMenu, inputEl, editor);
  const inlineInput = new InlineInput(inputEl, editor, () => {
    updateSendButton(sendBtn, editor, inlineInput, sendPawBtn);
  });
  const messageHistory = new MessageHistory();
  const commandNavigator = new CommandNavigator();
 
  const wheelScroll = new WheelScroll(inlineInput, () => {
    updateSendButton(sendBtn, editor, inlineInput, sendPawBtn);
  });
  wheelScroll.attachListener(inputEl);
  inputEl.addEventListener('input', () => {
    editor.syncMarkdownText();
    // editor.renderLiveMarkdown(); // TEMPORARILY DISABLED
    updateSendButton(sendBtn, editor, inlineInput, sendPawBtn);
  });
  
  // Handle blur event to restore placeholder
  inputEl.addEventListener('blur', () => {
    // Clean up empty content to ensure placeholder shows
    const text = inputEl.textContent.trim();
    if (!text) {
      inputEl.innerHTML = '';
      editor.markdownText = '';
    }
  });
  setupHotkeys(inputEl, editor, () => {
    sendForm.dispatchEvent(new Event('submit'));
  }, messageHistory, () => myName, commandNavigator);
  
  // Global hotkey: "/" to focus input field
  document.addEventListener('keydown', (e) => {
    // Only if "/" is pressed and we're not already in an input/textarea
    if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const activeElement = document.activeElement;
      const isInInput = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.contentEditable === 'true'
      );
      
      if (!isInInput) {
        e.preventDefault();
        inputEl.focus();
      }
    }
  });
  sendForm.addEventListener('submit', async (e) => {
    console.log('[SUBMIT] Form submit triggered!', e);
    console.trace('[SUBMIT] Stack trace:');
    e.preventDefault();

    // Extract quotes first
    const quotes = extractQuoteData(inputEl);
    console.log('Extracted quotes:', quotes);
   
    // Collect image tags
    const imageTags = inputEl.querySelectorAll('.image-tag[data-loaded="true"]');
    const images = Array.from(imageTags).map(tag => ({
      id: tag.dataset.id,
      url: tag.dataset.url
    }));
   
    // Get text content with image placeholders and quote placeholders
    let text = '';
    const processNode = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent;
      } else if (node.classList && node.classList.contains('image-tag')) {
        if (node.dataset.loaded === 'true') {
          text += `__IMAGE_TAG_${node.dataset.id}__`;
        }
        // Skip unloaded tags
      } else if (node.classList && node.classList.contains('quote-tag')) {
        // Skip quote tags in text, they're in metadata
      } else if (node.childNodes) {
        node.childNodes.forEach(processNode);
      }
    };
    inputEl.childNodes.forEach(processNode);
   
    text = text.trim();

    // Check for /rebase command
    if (text === '/rebase') {
      const sendingMsg = renderSystemMessage(chatLog, 'Сброс базы данных...', { spinner: true });
      try {
        const result = await apiRebase(API);
        removeSystemMessage(sendingMsg);
        if (result.success) {
          // WS will handle rebase event, but we need to reinit immediately
          // to avoid race condition with next message send
          sessionId = null;
          const initData = await apiInit(API, null, COOKIE_NAME);
          sessionId = initData.session_id;
          myName = initData.name;
          
          // Update emoji
          const emoji = myName.split(' ')[0];
          userEmojiEl.textContent = emoji;
          
          // Reconnect WebSocket with new session
          if (wsClient) {
            wsClient.reconnectWithNewSession(sessionId);
          }
          
          // Update animal profile
          if (animalProfile) {
            animalProfile.updateCurrentEmoji(emoji);
            await animalProfile.init();
          }
          
          // Clear chat and render fresh messages
          chatLog.innerHTML = '';
          lastIdRef.value = 0;
          // SYSTEM_MSG_CLASS: Render rebase seed messages as system messages
          renderMessages(chatLog, result.messages || [], lastIdRef, { asSystemMessages: true, currentSessionId: sessionId });
          
          editor.clear();
          updateSendButton(sendBtn, editor, inlineInput, sendPawBtn);
          inputEl.focus();
        } else {
          renderSystemMessage(chatLog, 'Ошибка сброса базы', {});
        }
      } catch (error) {
        removeSystemMessage(sendingMsg);
        renderSystemMessage(chatLog, 'Ошибка сброса базы', {});
      }
      return;
    }
  
    if (!text && images.length === 0 && !quotes) return;
   
    // Show sending message
    const sendingMsg = renderSystemMessage(chatLog, 'Сообщение отправляется', { spinner: true });
   
    // Prepare metadata
    let metadata = null;
    if (images.length > 0 || quotes) {
      metadata = {};
      if (images.length > 0) {
        metadata.type = 'images';
        metadata.images = images;
      }
      if (quotes) {
        metadata.quotes = quotes;
      }
    }
   
    console.log('Sending metadata:', metadata);
    console.log('Sending text:', text);
   
    try {
      let result;
      const wasEditing = messageHistory.isEditing();
     
      // Check if we're editing an existing message
      if (wasEditing) {
        const messageId = messageHistory.getEditingMessageId();
        console.log('Updating message:', messageId);
        result = await apiUpdateMessage(API, sessionId, messageId, text, metadata);
        messageHistory.clearEditing();
      } else {
        result = await apiSend(API, sessionId, text, metadata);
       
        if (result) {
          // Add new message to history
          messageHistory.addMessage(text, myName, metadata, result.id);
        }
      }
     
      if (result) {
        // Success - remove sending message
        removeSystemMessage(sendingMsg);
       
        // If we updated a message, update it in DOM
        if (wasEditing) {
          console.log('Updating message in DOM:', result);
          updateMessage(chatLog, result);
        }
        // New messages will appear via polling
      } else {
        // Failed - show error
        removeSystemMessage(sendingMsg);
        renderSystemMessage(chatLog, 'у нас проблемы.', {
          actionButton: {
            text: '[переотправить]',
            onClick: async () => {
              // Retry logic would go here
            }
          }
        });
      }
    } catch (error) {
      // Network error
      removeSystemMessage(sendingMsg);
      renderSystemMessage(chatLog, 'у нас проблемы.', {
        actionButton: {
          text: '[переотправить]',
          onClick: async () => {
          }
        }
      });
    }
    editor.clear();
    updateSendButton(sendBtn, editor, inlineInput, sendPawBtn);
    inputEl.focus();
  });
  function setupWebSocket() {
    wsClient = new WebSocketClient(CONFIG.WS_URL, sessionId);
   
    wsClient.on('auth_ok', (data) => {
      console.log('[Main] WS authenticated:', data.name);
    });
   
    wsClient.on('message_new', (message) => {
      console.log('[Main] New message via WS:', message);
      // SYSTEM_MSG_CLASS: Pass current session ID to determine if message is seed
      renderMessages(chatLog, [message], lastIdRef);
    });
   
    wsClient.on('message_updated', (message) => {
      console.log('[Main] Message updated via WS:', message);
      updateMessage(chatLog, message);
    });
   
    wsClient.on('rebase', async (data) => {
      console.log('[Main] Rebase via WS:', data);
      // Clear chat
      chatLog.innerHTML = '';
      lastIdRef.value = 0;
      
      // Reset session and reinitialize
      sessionId = null;
      try {
        const initData = await apiInit(API, null, COOKIE_NAME);
        sessionId = initData.session_id;
        myName = initData.name;
        
        // Update emoji
        const emoji = myName.split(' ')[0];
        userEmojiEl.textContent = emoji;
        
        // Reconnect WebSocket with new session
        wsClient.reconnectWithNewSession(sessionId);
        
        // Update animal profile
        if (animalProfile) {
          animalProfile.updateCurrentEmoji(emoji);
          await animalProfile.init();
        }
        
        // Render messages from rebase event
        // SYSTEM_MSG_CLASS: Render rebase seed messages as system messages
        renderMessages(chatLog, data.messages || [], lastIdRef, { asSystemMessages: true, currentSessionId: sessionId });
      } catch (error) {
        console.error('[Main] Rebase reinit failed:', error);
        renderSystemMessage(chatLog, 'Ошибка переподключения после rebase', {});
      }
    });
   
    wsClient.on('disconnected', () => {
      console.warn('[Main] WS disconnected');
    });
   
    wsClient.on('max_reconnect_attempts', () => {
      console.error('[Main] WS max reconnect attempts reached');
      // TODO: Show connection error to user
    });
   
    wsClient.connect();
  }
 
  let animalProfile = null;
  userEmojiEl.addEventListener('click', async () => {
    userEmojiEl.classList.add('user-emoji-fade');
   
    setTimeout(async () => {
      const data = await apiChangeName(API, sessionId);
      if (data && data.name) {
        const emoji = data.name.split(' ')[0];
       
        // Check if this animal has a saved profile
        let finalName = data.name;
        if (animalProfile) {
          const savedProfile = await animalProfile.fetchProfile(emoji);
          if (savedProfile && savedProfile.kind) {
            // Use saved custom name
            finalName = emoji + ' ' + savedProfile.kind;
          }
        }
       
        myName = finalName;
        userEmojiEl.textContent = emoji;
        userEmojiEl.classList.remove('user-emoji-fade');
       
        // Update animal profile with new emoji
        if (animalProfile) {
          animalProfile.updateCurrentEmoji(emoji);
        }
        
        // Realign header after emoji change
        setTimeout(alignUserHeader, 0);
      }
    }, 250);
  });
  apiInit(API, sessionId, COOKIE_NAME).then(async (data) => {
    sessionId = data.session_id;

    // Сначала инициализируем animal profile (НЕ устанавливаем myName пока!)
    const initialEmoji = data.name.split(' ')[0];
    animalProfile = new AnimalProfile(sessionId, initialEmoji, (newName) => {
      // Update display when profile is saved
      console.log('[Main] Animal profile saved, updating name:', myName, '->', newName);
      myName = newName;
      const newEmoji = newName.split(' ')[0];
      userEmojiEl.textContent = newEmoji;
      console.log('[Main] Updated myName:', myName);
    });
    await animalProfile.init();

    // Проверяем авторизацию Telegram СРАЗУ
    const telegramAuth = new TelegramAuth();
    const authData = await telegramAuth.checkAuth();

    // Если авторизован - загружаем профиль ДО установки myName
    if (authData && authData.user_id) {
      console.log('[Main] User already authorized, loading profile...');
      const savedProfile = await animalProfile.loadAndApplyUserProfile();

      if (savedProfile) {
        console.log('[Main] Using saved profile:', savedProfile);
        myName = savedProfile.name;
        userEmojiEl.textContent = savedProfile.emoji;
      } else {
        console.log('[Main] No saved profile, using session name');
        myName = data.name;
        userEmojiEl.textContent = initialEmoji;
      }
    } else {
      // Не авторизован - используем имя из сессии
      console.log('[Main] Not authorized, using session name');
      myName = data.name;
      userEmojiEl.textContent = initialEmoji;
    }

    console.log('[Main] Final myName:', myName);

    // Render all messages as regular messages (not system messages)
    // Only rebase/seed operations should show messages as system messages
    renderMessages(chatLog, data.messages || [], lastIdRef);
    setupWebSocket();
    inputEl.focus();

    // Initialize image zoom for existing images
    initImageZoom();

    // Align user header after content loads
    setTimeout(alignUserHeader, 0);
    window.addEventListener('resize', alignUserHeader);
   
    // Animal profile button
    const profileBtn = document.getElementById('animal-profile-btn');
    if (profileBtn) {
      profileBtn.addEventListener('click', () => {
        animalProfile.open();
      });
    }
   
// Initialize Telegram Auth UI
    telegramAuth.init('telegram-auth-container', 'hhrrrp_bot', async (newAuthData) => {
      console.log('[Main] New Telegram authorization:', newAuthData);

      const displayName = newAuthData.first_name || newAuthData.username || 'Telegram User';

      const container = document.getElementById('telegram-auth-container');
      if (container) {
        // Создаём кнопку и вешаем обработчик напрямую
        const btn = document.createElement('button');
        btn.className = 'my-chat-button';
        btn.textContent = displayName + ' (выйти)';
        btn.onclick = function() {
          telegramAuth.logout();
        };
        container.innerHTML = '';
        container.appendChild(btn);
      }

      // Загружаем профиль ТОЛЬКО если это НОВАЯ авторизация (не при загрузке страницы)
      if (animalProfile && !authData) {
        console.log('[Main] New login detected, loading profile...');
        const savedProfile = await animalProfile.loadAndApplyUserProfile();

        if (savedProfile) {
          console.log('[Main] Loaded profile after login:', savedProfile);
          myName = savedProfile.name;
          userEmojiEl.textContent = savedProfile.emoji;
        }

        animalProfile.showLogoutButton();
      }
    });
   
    // TEST: Show system message with spinner
    window.testSystemMessage = () => {
      const msg = renderSystemMessage(chatLog, 'Сообщение отправляется', { spinner: true });
      setTimeout(() => {
        removeSystemMessage(msg);
      }, 3000);
    };
   
    // TEST: Show system message with action button
    window.testSystemError = () => {
      renderSystemMessage(chatLog, 'у нас проблемы.', {
        actionButton: {
          text: '[переотправить]',
          onClick: () => {
          }
        }
      });
    };
  }).catch((error) => {
    console.error('[Main] Init failed:', error);
    renderSystemMessage(chatLog, 'Не удалось подключиться к серверу', {});
    // Disable input
    inputEl.disabled = true;
    sendBtn.disabled = true;
  });
 
  NightShift.init();
 
  // Initialize context menu
  new ContextMenu(editor);
 
  // Initialize quote handlers
  initQuoteHandlers(editor);
})();