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

export function updateSendButton(sendBtn, editor) {
  if (editor.getText().trim().length > 0) {
    sendBtn.classList.add('visible');
  } else {
    sendBtn.classList.remove('visible');
  }
}
