// public/js/render.js
import { escapeHtml, parseMarkdown, linkifyImages } from './markdown.js?v=4';
import { renderGitHubPreview } from './github.js?v=5';
import { renderPinterestPreview } from './pinterest.js?v=1';
import { renderLinkPreview } from './link.js?v=1';
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
    
    console.log('Message:', m.text, 'Metadata:', m.metadata);
    
    // Check metadata type
    if (m.metadata && m.metadata.type === 'music') {
      console.log('Rendering music player');
      content = renderMusicPlayer(m.metadata);
    } else if (m.metadata && m.metadata.type === 'pinterest') {
      console.log('Rendering pinterest preview');
      // Replace URL with preview in place
      content = m.text.replace(/(https?:\/\/[^\s<>"]+)/gi, (url) => {
        if (url === m.metadata.url) {
          return renderPinterestPreview(m.metadata);
        }
        return url;
      });
      // Apply markdown to the result
      content = linkifyImages(parseMarkdown(escapeHtml(content)));
    } else if (m.metadata && m.metadata.type === 'link') {
      console.log('Rendering link preview');
      // Replace URL with preview in place
      let replacedUrl = false;
      content = m.text.replace(/(https?:\/\/[^\s<>"]+)/gi, (url) => {
        if (!replacedUrl && url === m.metadata.url) {
          replacedUrl = true;
          return '__LINK_PREVIEW__';
        }
        return url;
      });
      
      // Apply markdown to text parts
      content = linkifyImages(parseMarkdown(escapeHtml(content)));
      
      // Replace placeholder with actual preview
      content = content.replace('__LINK_PREVIEW__', renderLinkPreview(m.metadata));
    } else {
      console.log('Rendering regular markdown');
      // Regular text with markdown
      content = linkifyImages(parseMarkdown(escapeHtml(m.text)));
      
      // Add GitHub preview if metadata exists
      if (m.metadata && m.metadata.type === 'github') {
        console.log('Adding GitHub preview');
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
    
    if (hasCommandQuery) {
      sendBtn.classList.add('visible');
    } else {
      sendBtn.classList.remove('visible');
    }
    
    // Add purple color if command is complete
    inlineInput.isCommandReady().then(ready => {
      if (ready) {
        sendBtn.classList.add('command-ready');
      } else {
        sendBtn.classList.remove('command-ready');
      }
    });
  } else {
    // Not in command mode: show button if there's any text AND it doesn't start with /
    if (editorText.length > 0 && !editorText.startsWith('/')) {
      sendBtn.classList.add('visible');
    } else {
      sendBtn.classList.remove('visible');
    }
    
    // Remove purple color when not in command mode
    sendBtn.classList.remove('command-ready');
  }
}
