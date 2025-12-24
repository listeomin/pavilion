// public/js/render.js
import { escapeHtml, parseMarkdown, linkifyImages } from './markdown.js?v=5';
import { renderGitHubPreview } from './github.js?v=5';
import { renderPinterestPreview } from './pinterest.js?v=1';
import { renderLinkPreview } from './link.js?v=1';
import { renderMusicPlayer } from './music.js?v=1';

let spinnerInterval = null;

function renderQuote(quote) {
  const { text, author, messageId } = quote;
  
  let quoteHtml = '<div class="quote-block">';
  quoteHtml += `<div class="quote-text"><em>${escapeHtml(text)}</em></div>`;
  
  if (author) {
    if (messageId) {
      quoteHtml += `<div class="quote-author" data-target-message="${messageId}">${escapeHtml(author)}</div>`;
    } else {
      quoteHtml += `<div class="quote-author">${escapeHtml(author)}</div>`;
    }
  }
  
  quoteHtml += '</div>';
  return quoteHtml;
}

export function renderSystemMessage(chatLog, message, options = {}) {
  const { spinner = false, actionButton = null } = options;
  
  const div = document.createElement('div');
  div.className = 'system-msg';
  
  const meta = document.createElement('span');
  meta.className = 'system-meta';
  meta.textContent = '🛳️ капитанская рубка:';
  
  const text = document.createElement('span');
  text.className = 'system-text';
  
  if (spinner) {
    const frames = ['/', '—', '\\', '|'];
    let frameIndex = 0;
    const messageText = message + ' ';
    const spinnerSpan = document.createElement('span');
    spinnerSpan.className = 'system-spinner';
    spinnerSpan.textContent = frames[0];
    
    text.appendChild(document.createTextNode(messageText));
    text.appendChild(spinnerSpan);
    
    spinnerInterval = setInterval(() => {
      frameIndex = (frameIndex + 1) % frames.length;
      spinnerSpan.textContent = frames[frameIndex];
    }, 150);
  } else {
    text.appendChild(document.createTextNode(' ' + message));
  }
  
  if (actionButton) {
    const btn = document.createElement('button');
    btn.className = 'system-action-btn';
    btn.textContent = actionButton.text;
    btn.onclick = actionButton.onClick;
    text.appendChild(document.createTextNode(' '));
    text.appendChild(btn);
  }
  
  div.appendChild(meta);
  div.appendChild(text);
  chatLog.appendChild(div);
  chatLog.scrollTop = chatLog.scrollHeight;
  
  return div;
}

export function removeSystemMessage(element) {
  if (spinnerInterval) {
    clearInterval(spinnerInterval);
    spinnerInterval = null;
  }
  if (element && element.parentNode) {
    element.parentNode.removeChild(element);
  }
}

// SYSTEM_MSG_CLASS: All rebase/seed messages use .system-msg class (🛳️ капитанская рубка)
// Messages from other sessions are rendered as system messages (seed data)
export function renderMessages(chatLog, messages, lastIdRef, options = {}) {
  if (!messages || !messages.length) return;
  const { asSystemMessages = false, currentSessionId = null } = options;
  console.log('Rendering messages:', messages);
  const frag = document.createDocumentFragment();
  messages.forEach(m => {
    // Check if we should merge with previous message
    // Look in both fragment (current batch) and chatLog (existing messages)
    const lastInFrag = frag.lastElementChild;
    const lastInLog = chatLog.lastElementChild;
    const lastMsg = lastInFrag || lastInLog;
    const shouldMerge = lastMsg && 
                       lastMsg.classList.contains('msg') && 
                       lastMsg.dataset.author === m.author;
    
    // SYSTEM_MSG_CLASS: Determine if this should be a system message
    // Either forced via asSystemMessages OR if message is from a different session (seed data)
    const isSystemMsg = asSystemMessages || (currentSessionId && m.session_id !== currentSessionId);
    
    const div = document.createElement('div');
    // SYSTEM_MSG_CLASS: Use system-msg class for rebase/seed messages
    div.className = isSystemMsg ? 'system-msg' : 'msg';
    div.dataset.author = m.author;
    div.dataset.messageId = m.id;
    
    // Only add meta if not merging
    if (!shouldMerge) {
      const meta = document.createElement('span');
      // SYSTEM_MSG_CLASS: Use system-meta for system messages
      meta.className = isSystemMsg ? 'system-meta' : 'meta meta-clickable';
      meta.textContent = m.author + ':';
      if (!isSystemMsg) {
        meta.style.cursor = 'pointer';
      }
      div.appendChild(meta);
    }
    
    const text = document.createElement('span');
    
    let content = '';
    
    // Add quotes if present
    if (m.metadata && m.metadata.quotes) {
      console.log('Found quotes in message:', m.metadata.quotes);
      m.metadata.quotes.forEach(quote => {
        const quoteHtml = renderQuote(quote);
        console.log('Rendered quote HTML:', quoteHtml);
        content += quoteHtml;
      });
    }
    
    // Check metadata type
    if (m.metadata && m.metadata.type === 'music') {
      content = renderMusicPlayer(m.metadata);
    } else if (m.metadata && m.metadata.type === 'images') {
      // Remove any HTML tags from text first
      const cleanText = m.text.replace(/<[^>]*>/g, '');
      
      // Start with escaped text
      content = escapeHtml(cleanText);
      
      // Replace image placeholders with actual images
      m.metadata.images.forEach(img => {
        const placeholder = `__IMAGE_TAG_${img.id}__`;
        const imgTag = `<img src="${img.url}" style="width: 60%; max-height: 600px; object-fit: cover; margin: 8px 0 8px 3px; display: block; box-shadow: 0 0 0 1.5px rgba(0,0,0,.2); pointer-events: none;" loading="lazy" />`;
        content = content.replace(placeholder, imgTag);
      });
      
      // Apply markdown to the rest (without linkifyImages to avoid double processing)
      content = parseMarkdown(content);
    } else if (m.metadata && m.metadata.type === 'pinterest') {
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
      // Regular text with markdown
      content += linkifyImages(parseMarkdown(escapeHtml(m.text)));
      
      // Add GitHub preview if metadata exists
      if (m.metadata && m.metadata.type === 'github') {
        content += renderGitHubPreview(m.metadata);
      }
    }
    
    text.innerHTML = ' ' + content;
    div.appendChild(text);
    frag.appendChild(div);
    lastIdRef.value = Math.max(lastIdRef.value, Number(m.id));
  });
  chatLog.appendChild(frag);
  chatLog.scrollTop = chatLog.scrollHeight;
}

export function updateMessage(chatLog, updatedMessage) {
  // Find message in DOM by data-message-id
  const messageEl = chatLog.querySelector(`[data-message-id="${updatedMessage.id}"]`);
  if (!messageEl) {
    console.warn('Message not found in DOM:', updatedMessage.id);
    return;
  }

  // Get or create text span
  let textSpan = messageEl.querySelector('span:not(.meta)');
  if (!textSpan) {
    textSpan = document.createElement('span');
    messageEl.appendChild(textSpan);
  }

  let content = '';
  const m = updatedMessage;

  // Add quotes if present
  if (m.metadata && m.metadata.quotes) {
    m.metadata.quotes.forEach(quote => {
      content += renderQuote(quote);
    });
  }

  // Check metadata type
  if (m.metadata && m.metadata.type === 'music') {
    content = renderMusicPlayer(m.metadata);
  } else if (m.metadata && m.metadata.type === 'images') {
    // Remove any HTML tags from text first
    const cleanText = m.text.replace(/<[^>]*>/g, '');
    
    content = escapeHtml(cleanText);
    m.metadata.images.forEach(img => {
      const placeholder = `__IMAGE_TAG_${img.id}__`;
      const imgTag = `<img src="${img.url}" style="width: 60%; max-height: 600px; object-fit: cover; margin: 8px 0 8px 3px; display: block; box-shadow: 0 0 0 1.5px rgba(0,0,0,.2); pointer-events: none;" loading="lazy" />`;
      content = content.replace(placeholder, imgTag);
    });
    content = parseMarkdown(content);
  } else if (m.metadata && m.metadata.type === 'pinterest') {
    content = m.text.replace(/(https?:\/\/[^\s<>"]+)/gi, (url) => {
      if (url === m.metadata.url) {
        return renderPinterestPreview(m.metadata);
      }
      return url;
    });
    content = linkifyImages(parseMarkdown(escapeHtml(content)));
  } else if (m.metadata && m.metadata.type === 'link') {
    let replacedUrl = false;
    content = m.text.replace(/(https?:\/\/[^\s<>"]+)/gi, (url) => {
      if (!replacedUrl && url === m.metadata.url) {
        replacedUrl = true;
        return '__LINK_PREVIEW__';
      }
      return url;
    });
    content = linkifyImages(parseMarkdown(escapeHtml(content)));
    content = content.replace('__LINK_PREVIEW__', renderLinkPreview(m.metadata));
  } else {
    content += linkifyImages(parseMarkdown(escapeHtml(m.text)));
    if (m.metadata && m.metadata.type === 'github') {
      content += renderGitHubPreview(m.metadata);
    }
  }

  textSpan.innerHTML = ' ' + content + '<span style="color: #87867F; font-family: \'Ubuntu Mono\', monospace; margin-left: 4px; font-style: italic; font-weight: 300; font-size: calc(1em - 1px);">ред.</span>';
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
