// public/js/main.js
import { CONFIG } from './config.js?v=5';
import { getCookie, apiInit, apiSend, apiPoll, apiChangeName } from './api.js?v=5';
import { renderMessages, updateSendButton, renderSystemMessage, removeSystemMessage } from './render.js?v=5';
import { Editor } from './editor.js?v=5';
import { FormatMenu } from './format.js?v=5';
import { setupHotkeys } from './hotkeys.js?v=5';
import { InlineInput } from './inline-input.js?v=28';
import { WheelScroll } from './wheel-scroll.js?v=1';
import * as NightShift from './nightshift.js?v=1';
import { AnimalProfile } from './animalProfile.js?v=8';

(function () {
  const API = CONFIG.API_PATH;
  const COOKIE_NAME = 'chat_session_id';
  let sessionId = getCookie(COOKIE_NAME) || null;
  let myName = '';
  const lastIdRef = { value: 0 };
  const pollInterval = 3000;

  const chatLog = document.getElementById('chat-log');
  const inputEl = document.getElementById('text');
  const formatMenu = document.getElementById('format-menu');
  const sendBtn = document.getElementById('sendBtn');
  const sendForm = document.getElementById('sendForm');
  const userEmojiEl = document.getElementById('user-emoji');

  const editor = new Editor(inputEl);
  const formatMenuController = new FormatMenu(formatMenu, inputEl, editor);
  const inlineInput = new InlineInput(inputEl, editor, () => {
    updateSendButton(sendBtn, editor, inlineInput);
  });
  
  const wheelScroll = new WheelScroll(inlineInput, () => {
    updateSendButton(sendBtn, editor, inlineInput);
  });
  wheelScroll.attachListener(inputEl);

  inputEl.addEventListener('input', () => {
    editor.syncMarkdownText();
    // editor.renderLiveMarkdown(); // TEMPORARILY DISABLED
    updateSendButton(sendBtn, editor, inlineInput);
  });

  setupHotkeys(inputEl, editor, () => {
    sendForm.dispatchEvent(new Event('submit'));
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
        // Skip unloaded tags
      } else if (node.childNodes) {
        node.childNodes.forEach(processNode);
      }
    };
    inputEl.childNodes.forEach(processNode);
    
    text = text.trim();
    if (!text && images.length === 0) return;
    
    // Show sending message
    const sendingMsg = renderSystemMessage(chatLog, 'Сообщение отправляется', { spinner: true });
    
    // Prepare metadata
    let metadata = null;
    if (images.length > 0) {
      metadata = {
        type: 'images',
        images: images
      };
    }
    
    try {
      const result = await apiSend(API, sessionId, text, metadata);
      
      if (result) {
        // Success - remove sending message
        removeSystemMessage(sendingMsg);
        // Message will appear via polling
      } else {
        // Failed - show error
        removeSystemMessage(sendingMsg);
        renderSystemMessage(chatLog, 'у нас проблемы.', {
          actionButton: {
            text: '[переотправить]',
            onClick: async () => {
              // Retry logic would go here
              console.log('Retry clicked');
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
            console.log('Retry clicked');
          }
        }
      });
    }

    editor.clear();
    updateSendButton(sendBtn, editor, inlineInput);
    inputEl.focus();
  });

  async function pollLoop() {
    try {
      const data = await apiPoll(API, lastIdRef.value);
      if (data && data.messages && data.messages.length) {
        renderMessages(chatLog, data.messages, lastIdRef);
      }
    } catch (e) {
      // silent
    } finally {
      setTimeout(pollLoop, pollInterval);
    }
  }

  let animalProfile = null;

  userEmojiEl.addEventListener('click', async () => {
    userEmojiEl.classList.add('user-emoji-fade');
    
    setTimeout(async () => {
      const data = await apiChangeName(API, sessionId);
      if (data && data.name) {
        myName = data.name;
        const emoji = myName.split(' ')[0];
        userEmojiEl.textContent = emoji;
        userEmojiEl.classList.remove('user-emoji-fade');
      }
    }, 250);
  });

  apiInit(API, sessionId, COOKIE_NAME).then(async (data) => {
    sessionId = data.session_id;
    myName = data.name;
    // Extract emoji from name (first character before space)
    const emoji = myName.split(' ')[0];
    userEmojiEl.textContent = emoji;
    renderMessages(chatLog, data.messages || [], lastIdRef);
    setTimeout(pollLoop, pollInterval);
    inputEl.focus();
    
    // Initialize animal profile
    animalProfile = new AnimalProfile(sessionId, emoji, (newEmoji, newKind) => {
      // Update display when profile is saved
      myName = newEmoji + ' ' + newKind;
      userEmojiEl.textContent = newEmoji;
    });
    await animalProfile.init();
    
    // Animal profile button
    const profileBtn = document.getElementById('animal-profile-btn');
    if (profileBtn) {
      profileBtn.addEventListener('click', () => {
        animalProfile.open();
      });
    }
    
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
            console.log('Retry clicked');
          }
        }
      });
    };
  });
  
  NightShift.init();
})();
