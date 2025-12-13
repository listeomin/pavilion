// public/js/render.js
import { escapeHtml, parseMarkdown, linkifyImages } from './markdown.js?v=4';
import { renderGitHubPreview } from './github.js?v=5';
import { renderMusicPlayer } from './music.js?v=1';

export function renderMessages(chatLog, messages, lastIdRef) {
  if (!messages || !messages.length) return;
  const frag = document.createDocumentFragment();
  messages.forEach(m => {
    const div = document.createElement('div');
    div.className = 'msg';
    const meta = document.createElement('span');
    meta.className = 'meta';
    meta.textContent = m.author + ':';
    const text = document.createElement('span');
    
    let content = '';
    
    // Check metadata type
    if (m.metadata && m.metadata.type === 'music') {
      // Music player instead of text
      content = renderMusicPlayer(m.metadata);
    } else {
      // Regular text with markdown
      content = linkifyImages(parseMarkdown(escapeHtml(m.text)));
      
      // Add GitHub preview if metadata exists
      if (m.metadata) {
        content += renderGitHubPreview(m.metadata);
      }
    }
    
    text.innerHTML = ' ' + content;
    div.appendChild(meta);
    div.appendChild(text);
    frag.appendChild(div);
    lastIdRef.value = Math.max(lastIdRef.value, Number(m.id));
  });
  chatLog.appendChild(frag);
  chatLog.scrollTop = chatLog.scrollHeight;
}

export function updateSendButton(sendBtn, editor, inlineInput) {
  const inCommandMode = inlineInput && inlineInput.commandMode;
  const plainText = inlineInput ? inlineInput.getPlainText() : '';
  const editorText = editor.getText().trim();
  
  // Check if we're in command mode
  if (inCommandMode) {
    // In command mode: only show button if we have query after colon
    const colonIndex = plainText.indexOf(':');
    const hasColon = colonIndex !== -1;
    const afterColon = hasColon ? plainText.substring(colonIndex + 1).trim() : '';
    const hasCommandQuery = hasColon && afterColon.length > 0;
    
    console.log('DEBUG updateSendButton:', {
      inCommandMode,
      plainText,
      hasColon,
      afterColon,
      trimmedLength: afterColon.length,
      hasCommandQuery
    });
    
    if (hasCommandQuery) {
      sendBtn.classList.add('visible');
    } else {
      sendBtn.classList.remove('visible');
    }
  } else {
    // Not in command mode: show button if there's any text AND it doesn't start with /
    if (editorText.length > 0 && !editorText.startsWith('/')) {
      sendBtn.classList.add('visible');
    } else {
      sendBtn.classList.remove('visible');
    }
  }
  
  // Add purple color if command is complete
  const commandReady = inlineInput && inlineInput.isCommandReady();
  if (commandReady) {
    sendBtn.classList.add('command-ready');
  } else {
    sendBtn.classList.remove('command-ready');
  }
}
