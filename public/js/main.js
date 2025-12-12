// public/js/main.js
(function(){
  const API = CONFIG.API_PATH;
  const COOKIE_NAME = 'chat_session_id';
  let sessionId = getCookie(COOKIE_NAME) || null;
  let myName = '';
  let lastId = 0;
  let pollInterval = 3000;
  const chatLog = document.getElementById('chat-log');
  const inputEl = document.getElementById('text');
  const formatMenu = document.getElementById('format-menu');
  
  // Store raw markdown text separately
  let markdownText = '';
  
  // Undo/redo history
  let markdownHistory = [''];
  let historyIndex = 0;
  const MAX_HISTORY = 50;

  function setCookie(name, value, days) {
    const d = new Date();
    d.setTime(d.getTime() + (days*24*60*60*1000));
    document.cookie = name + "=" + value + ";path=/;expires=" + d.toUTCString() + ";SameSite=Lax";
  }
  
  function getCookie(name) {
    const v = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
    return v ? v.pop() : null;
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  function parseMarkdown(text) {
    const urlPlaceholders = [];
    const urlRegex = /(https?:\/\/[^\s<>"]+)/gi;
    let protected = text.replace(urlRegex, (url) => {
      const idx = urlPlaceholders.length;
      urlPlaceholders.push(url);
      return `__URL_${idx}__`;
    });

    protected = protected.replace(/`([^`]+)`/g, '<code>$1</code>');
    protected = protected.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    protected = protected.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    protected = protected.replace(/\b_([^_]+)_\b/g, '<em>$1</em>');
    protected = protected.replace(/__URL_(\d+)__/g, (_, idx) => urlPlaceholders[parseInt(idx)]);

    return protected;
  }

  function linkifyImages(text) {
    const imageRegex = /(https?:\/\/[^\s<>"]+\.(?:png|jpg|jpeg|gif|webp)(?:\?[^\s<>"]*)?)/gi;
    return text.replace(imageRegex, (url) => {
      const fixedUrl = url.replace(/^http:\/\/hhrrr\.ru/, 'https://hhrrr.ru');
      const escapedUrl = fixedUrl.replace(/"/g, '&quot;');
      return `<img src="${escapedUrl}" 
                   style="width: 60%; max-height: 600px; object-fit: cover; margin: 8px 0 8px 3px; display: block; box-shadow: 0 0 0 1.5px rgba(0,0,0,.2); pointer-events: none;"
                   onerror="this.outerHTML='<a href=&quot;${escapedUrl}&quot; target=&quot;_blank&quot;>${escapedUrl}</a>'"
                   loading="lazy" />`;
    });
  }

  function renderMessages(messages) {
    if (!messages || !messages.length) return;
    const frag = document.createDocumentFragment();
    messages.forEach(m => {
      const div = document.createElement('div');
      div.className = 'msg';
      const meta = document.createElement('span');
      meta.className = 'meta';
      meta.textContent = m.author + ':';
      const text = document.createElement('span');
      text.innerHTML = ' ' + linkifyImages(parseMarkdown(escapeHtml(m.text)));
      div.appendChild(meta);
      div.appendChild(text);
      frag.appendChild(div);
      lastId = Math.max(lastId, Number(m.id));
    });
    chatLog.appendChild(frag);
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  function getPlainText(el) {
    return (el.textContent || '');
  }

  function updateYouText() {
    const sendBtn = document.getElementById('sendBtn');
    
    if (markdownText.trim().length > 0) {
      sendBtn.classList.add('visible');
    } else {
      sendBtn.classList.remove('visible');
    }
  }

  async function apiInit() {
    const form = new FormData();
    if (sessionId) form.append('session_id', sessionId);
    const res = await fetch(API + '?action=init', { method: 'POST', body: form });
    const data = await res.json();
    sessionId = data.session_id;
    myName = data.name;
    setCookie(COOKIE_NAME, sessionId, 30);
    renderMessages(data.messages || []);
  }

  async function apiSend(text) {
    const payload = { session_id: sessionId, text: text };
    const res = await fetch(API + '?action=send', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    if (!res.ok) return;
    const msg = await res.json();
    renderMessages([msg]);
  }

  async function apiPoll() {
    try {
      const url = API + '?action=poll&after_id=' + encodeURIComponent(lastId);
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (data.messages && data.messages.length) {
        renderMessages(data.messages);
      }
    } catch (e) {
      // silent
    } finally {
      setTimeout(apiPoll, pollInterval);
    }
  }

  function saveCursorPosition() {
    const sel = window.getSelection();
    if (sel.rangeCount === 0) return null;
    const range = sel.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(inputEl);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    return preCaretRange.toString().length;
  }

  function restoreCursorPosition(pos) {
    if (pos === null) return;
    const sel = window.getSelection();
    const range = document.createRange();
    let charCount = 0;
    let nodeStack = [inputEl];
    let node, foundStart = false;

    while (!foundStart && (node = nodeStack.pop())) {
      if (node.nodeType === Node.TEXT_NODE) {
        const nextCharCount = charCount + node.length;
        if (pos <= nextCharCount) {
          range.setStart(node, pos - charCount);
          range.setEnd(node, pos - charCount);
          foundStart = true;
        }
        charCount = nextCharCount;
      } else {
        for (let i = node.childNodes.length - 1; i >= 0; i--) {
          nodeStack.push(node.childNodes[i]);
        }
      }
    }

    if (foundStart) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }

  function renderLiveMarkdown() {
    const cursorPos = saveCursorPosition();
    const rendered = parseMarkdown(escapeHtml(markdownText));
    
    if (inputEl.innerHTML !== rendered) {
      inputEl.innerHTML = rendered;
      restoreCursorPosition(cursorPos);
    }
  }

  function syncMarkdownText() {
    markdownText = getPlainText(inputEl);
    saveToHistory();
  }
  
  function saveToHistory() {
    // Remove any future history if we're not at the end
    if (historyIndex < markdownHistory.length - 1) {
      markdownHistory = markdownHistory.slice(0, historyIndex + 1);
    }
    
    // Don't save if text hasn't changed
    if (markdownHistory[historyIndex] === markdownText) return;
    
    markdownHistory.push(markdownText);
    
    // Limit history size
    if (markdownHistory.length > MAX_HISTORY) {
      markdownHistory.shift();
    } else {
      historyIndex++;
    }
  }
  
  function undo() {
    if (historyIndex > 0) {
      historyIndex--;
      markdownText = markdownHistory[historyIndex];
      renderLiveMarkdown();
      updateYouText();
    }
  }
  
  function redo() {
    if (historyIndex < markdownHistory.length - 1) {
      historyIndex++;
      markdownText = markdownHistory[historyIndex];
      renderLiveMarkdown();
      updateYouText();
    }
  }

  inputEl.addEventListener('input', () => {
    syncMarkdownText();
    renderLiveMarkdown();
    updateYouText();
  });

  inputEl.addEventListener('keydown', (e) => {
    // Hotkeys for formatting
    const isMod = e.metaKey || e.ctrlKey;
    
    // Undo/Redo
    if (isMod && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
      return;
    }
    
    if (isMod && e.key === 'z' && e.shiftKey) {
      e.preventDefault();
      redo();
      return;
    }
    
    if (isMod && e.key === 'b') {
      e.preventDefault();
      applyFormat('bold');
      return;
    }
    
    if (isMod && e.key === 'i') {
      e.preventDefault();
      applyFormat('italic');
      return;
    }
    
    if (isMod && e.key === 'e') {
      e.preventDefault();
      applyFormat('code');
      return;
    }
    
    // Submit on Enter
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      document.getElementById('sendForm').dispatchEvent(new Event('submit'));
    }
  });

  function showFormatMenu() {
    const sel = window.getSelection();
    
    if (!sel.rangeCount || sel.isCollapsed || document.activeElement !== inputEl) {
      formatMenu.classList.remove('visible');
      return;
    }
    
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    const menuX = rect.left + window.scrollX;
    const menuY = rect.top + window.scrollY - 40;
    
    formatMenu.style.left = menuX + 'px';
    formatMenu.style.top = menuY + 'px';
    formatMenu.classList.add('visible');
  }
  
  inputEl.addEventListener('mouseup', showFormatMenu);
  inputEl.addEventListener('keyup', showFormatMenu);
  
  document.addEventListener('mousedown', (e) => {
    if (!formatMenu.contains(e.target) && e.target !== inputEl) {
      formatMenu.classList.remove('visible');
    }
  });
  
  function applyFormat(format) {
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    
    const range = sel.getRangeAt(0);
    
    // Get selection position in plain text
    const preRange = range.cloneRange();
    preRange.selectNodeContents(inputEl);
    preRange.setEnd(range.startContainer, range.startOffset);
    const start = preRange.toString().length;
    const end = start + range.toString().length;
    
    // If no selection, do nothing
    if (start === end) return;
    
    let wrapper;
    switch(format) {
      case 'bold':
        wrapper = '**';
        break;
      case 'italic':
        wrapper = '*';
        break;
      case 'code':
        wrapper = '`';
        break;
      default:
        return;
    }
    
    // Update markdown text
    markdownText = markdownText.slice(0, start) + 
                   wrapper + 
                   markdownText.slice(start, end) + 
                   wrapper + 
                   markdownText.slice(end);
    
    // Save to history
    saveToHistory();
    
    // Render and restore cursor
    const newCursorPos = end + wrapper.length * 2;
    renderLiveMarkdown();
    restoreCursorPosition(newCursorPos);
    
    inputEl.focus();
    updateYouText();
  }

  formatMenu.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    
    e.preventDefault();
    
    const format = btn.dataset.format;
    applyFormat(format);
    formatMenu.classList.remove('visible');
  });

  document.getElementById('sendForm').addEventListener('submit', function(e){
    e.preventDefault();
    const text = markdownText.trim();
    if (!text) return;
    apiSend(text);
    inputEl.innerHTML = '';
    markdownText = '';
    updateYouText();
    inputEl.focus();
  });

  apiInit().then(() => {
    setTimeout(apiPoll, pollInterval);
    inputEl.focus();
  });
})();
