// public/js/main.js
import { CONFIG } from './config.js?v=5';
import { getCookie, apiInit, apiSend, apiPoll } from './api.js?v=5';
import { renderMessages, updateSendButton } from './render.js?v=5';
import { Editor } from './editor.js?v=5';
import { FormatMenu } from './format.js?v=5';
import { setupHotkeys } from './hotkeys.js?v=5';
import { InlineInput } from './inline-input.js?v=10';

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

  const editor = new Editor(inputEl);
  const formatMenuController = new FormatMenu(formatMenu, inputEl, editor);
  const inlineInput = new InlineInput(inputEl, editor);

  inputEl.addEventListener('input', () => {
    editor.syncMarkdownText();
    editor.renderLiveMarkdown();
    updateSendButton(sendBtn, editor);
  });

  setupHotkeys(inputEl, editor, () => {
    sendForm.dispatchEvent(new Event('submit'));
  });

  sendForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const content = inlineInput.getContent();
    if (!content.text) return;

    const msg = await apiSend(API, sessionId, content.text, content.metadata);
    if (msg) {
      renderMessages(chatLog, [msg], lastIdRef);
    }

    editor.clear();
    updateSendButton(sendBtn, editor);
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

  apiInit(API, sessionId, COOKIE_NAME).then((data) => {
    sessionId = data.session_id;
    myName = data.name;
    renderMessages(chatLog, data.messages || [], lastIdRef);
    setTimeout(pollLoop, pollInterval);
    inputEl.focus();
  });
})();
