// public/js/main.js
import { CONFIG } from './config.js?v=5';
import { getCookie, apiInit, apiSend, apiPoll, apiChangeName } from './api.js?v=5';
import { renderMessages, updateSendButton } from './render.js?v=5';
import { Editor } from './editor.js?v=5';
import { FormatMenu } from './format.js?v=5';
import { setupHotkeys } from './hotkeys.js?v=5';
import { InlineInput } from './inline-input.js?v=28';
import { WheelScroll } from './wheel-scroll.js?v=1';
import * as NightShift from './nightshift.js?v=1';

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
    editor.renderLiveMarkdown();
    updateSendButton(sendBtn, editor, inlineInput);
  });

  setupHotkeys(inputEl, editor, () => {
    sendForm.dispatchEvent(new Event('submit'));
  });

  sendForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const content = await inlineInput.getContent();
    if (!content.text) return;

    await apiSend(API, sessionId, content.text, content.metadata);
    // Don't render here - let polling pick it up to avoid duplicates

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

  apiInit(API, sessionId, COOKIE_NAME).then((data) => {
    sessionId = data.session_id;
    myName = data.name;
    // Extract emoji from name (first character before space)
    const emoji = myName.split(' ')[0];
    userEmojiEl.textContent = emoji;
    renderMessages(chatLog, data.messages || [], lastIdRef);
    setTimeout(pollLoop, pollInterval);
    inputEl.focus();
  });
  
  NightShift.init();
})();
