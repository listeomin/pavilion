// public/js/editor.js
import { escapeHtml, parseMarkdown } from './markdown.js?v=4';
import { apiUploadImage, apiDeleteImage } from './api.js?v=5';
import { CONFIG } from './config.js?v=5';

export class Editor {
  constructor(inputEl, maxHistory = 50) {
    this.inputEl = inputEl;
    this.markdownText = '';
    this.history = [''];
    this.historyIndex = 0;
    this.maxHistory = maxHistory;
    this.paused = false;
    
    // Handle paste to preserve line breaks and images
    this.inputEl.addEventListener('paste', (e) => this.handlePaste(e));
    
    // Handle backspace to delete image tags
    this.inputEl.addEventListener('keydown', (e) => this.handleKeydown(e));
  }

  async handlePaste(e) {
    e.preventDefault();
    console.log('[Paste] Event triggered');
    
    // Check for images first
    const items = e.clipboardData.items;
    let hasImage = false;
    
    console.log('[Paste] Items:', items.length);
    for (let item of items) {
      console.log('[Paste] Item type:', item.type);
      if (item.type.startsWith('image/')) {
        console.log('[Paste] Found direct image');
        hasImage = true;
        const file = item.getAsFile();
        await this.insertImageTag(file);
      }
    }
    
    // If no direct image, check HTML for <img> tags
    if (!hasImage) {
      const html = e.clipboardData.getData('text/html');
      console.log('[Paste] HTML:', html ? html.substring(0, 200) : 'none');
      
      if (html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const img = doc.querySelector('img');
        
        if (img && img.src) {
          console.log('[Paste] Found img in HTML, src:', img.src);
          // Found image in HTML - fetch and upload it (ignore text)
          try {
            const response = await fetch(img.src);
            const blob = await response.blob();
            const file = new File([blob], 'pasted-image.png', { type: blob.type });
            await this.insertImageTag(file);
            console.log('[Paste] Image uploaded, stopping');
            return; // Stop here, don't paste text
          } catch (err) {
            console.error('[Paste] Failed to fetch image from HTML:', err);
            // Fall through to text handling
          }
        } else {
          console.log('[Paste] No img found in HTML');
        }
      }
    }
    
    // If still no image, handle as plain text only
    if (!hasImage) {
      const text = e.clipboardData.getData('text/plain');
      console.log('[Paste] Inserting plain text:', text.substring(0, 100));
      
      // Check if text is an image URL
      const imageUrlPattern = /\.(jpg|jpeg|png|gif|webp)/i;
      const trimmedText = text.trim();
      if (imageUrlPattern.test(trimmedText)) {
        console.log('[Paste] Text is image URL, fetching:', trimmedText);
        try {
          const response = await fetch(text);
          const blob = await response.blob();
          const file = new File([blob], 'pasted-image.png', { type: blob.type });
          await this.insertImageTag(file);
          console.log('[Paste] Image URL uploaded, stopping');
          return; // Stop here, don't paste URL as text
        } catch (err) {
          console.error('[Paste] Failed to fetch image URL:', err);
          // Fall through to text handling
        }
      }
      
      // Insert text at cursor position
      const sel = window.getSelection();
      if (!sel.rangeCount) return;
      
      const range = sel.getRangeAt(0);
      range.deleteContents();
      
      const textNode = document.createTextNode(text);
      range.insertNode(textNode);
      
      // Move cursor to end of inserted text
      range.setStartAfter(textNode);
      range.setEndAfter(textNode);
      sel.removeAllRanges();
      sel.addRange(range);
      
      // Trigger input event to update markdown
      this.inputEl.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  async insertImageTag(file) {
    const id = this.generateUUID();
    
    console.log('Inserting image tag, file:', file);
    
    // Create tag (black color initially)
    const tag = document.createElement('span');
    tag.className = 'image-tag';
    tag.contentEditable = 'false';
    tag.dataset.id = id;
    tag.dataset.loaded = 'false';
    tag.textContent = '[картинка]';
    
    // Insert at cursor
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    
    const range = sel.getRangeAt(0);
    range.deleteContents();
    range.insertNode(tag);
    
    // Move cursor after tag
    range.setStartAfter(tag);
    range.setEndAfter(tag);
    sel.removeAllRanges();
    sel.addRange(range);
    
    // Upload in background
    console.log('Starting upload...');
    const result = await apiUploadImage(CONFIG.API_PATH, file);
    console.log('Upload result:', result);
    
    if (result.success) {
      console.log('Upload successful, setting loaded=true');
      tag.dataset.loaded = 'true';
      tag.dataset.url = result.url;
      tag.setAttribute('data-loaded', 'true');
      // Force style recalculation with direct color value
      tag.style.color = '#5A57D9'; // iris color
      console.log('Tag color set to:', tag.style.color);
      console.log('Tag element:', tag);
    } else {
      console.error('Upload failed:', result.error);
      // Tag stays black (not loaded)
    }
    
    this.inputEl.dispatchEvent(new Event('input', { bubbles: true }));
  }

  async handleKeydown(e) {
    if (e.key === 'Backspace') {
      const sel = window.getSelection();
      if (!sel.rangeCount) return;
      
      const range = sel.getRangeAt(0);
      
      // Check if cursor is collapsed (not selecting text)
      if (range.collapsed) {
        const container = range.startContainer;
        const offset = range.startOffset;
        
        // Check if previous sibling is image-tag or quote-tag
        if (container.nodeType === Node.TEXT_NODE && offset === 0) {
          const parent = container.parentNode;
          const prev = container.previousSibling;
          
          if (prev && prev.classList) {
            if (prev.classList.contains('image-tag')) {
              e.preventDefault();
              
              // Delete from server if uploaded
              if (prev.dataset.loaded === 'true') {
                await apiDeleteImage(CONFIG.API_PATH, prev.dataset.id);
              }
              
              prev.remove();
              this.inputEl.dispatchEvent(new Event('input', { bubbles: true }));
              return;
            }
            
            if (prev.classList.contains('quote-tag')) {
              e.preventDefault();
              prev.remove();
              this.inputEl.dispatchEvent(new Event('input', { bubbles: true }));
              return;
            }
          }
        }
        
        // Check if cursor is right after image-tag or quote-tag
        if (container.nodeType === Node.ELEMENT_NODE) {
          const prev = offset > 0 ? container.childNodes[offset - 1] : null;
          
          if (prev && prev.classList) {
            if (prev.classList.contains('image-tag')) {
              e.preventDefault();
              
              // Delete from server if uploaded
              if (prev.dataset.loaded === 'true') {
                await apiDeleteImage(CONFIG.API_PATH, prev.dataset.id);
              }
              
              prev.remove();
              this.inputEl.dispatchEvent(new Event('input', { bubbles: true }));
              return;
            }
            
            if (prev.classList.contains('quote-tag')) {
              e.preventDefault();
              prev.remove();
              this.inputEl.dispatchEvent(new Event('input', { bubbles: true }));
              return;
            }
          }
        }
      }
    }
  }

  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  insertQuoteTag(options = {}) {
    const { messageId = null, author = null, text = '' } = options;
    
    // Create quote tag
    const tag = document.createElement('span');
    tag.className = 'quote-tag';
    tag.contentEditable = 'false';
    tag.textContent = '[цитирую]';
    
    // Store data in attributes
    if (messageId) tag.dataset.messageId = messageId;
    if (author) tag.dataset.author = author;
    if (text) tag.dataset.text = text;
    
    // Always insert at the start of inputEl
    this.inputEl.insertBefore(tag, this.inputEl.firstChild);
    const space = document.createTextNode(' ');
    this.inputEl.insertBefore(space, tag.nextSibling);
    
    // Set cursor after the tag
    const sel = window.getSelection();
    const range = document.createRange();
    range.setStart(space, 1);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
    
    this.inputEl.dispatchEvent(new Event('input', { bubbles: true }));
    this.inputEl.focus();
  }

  getPlainText() {
    return this.inputEl.textContent || '';
  }

  saveCursorPosition() {
    const sel = window.getSelection();
    if (sel.rangeCount === 0) return null;
    const range = sel.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(this.inputEl);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    
    // Count characters including paragraph-breaks as single \n
    let length = 0;
    const walk = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        length += node.length;
      } else if (node.classList && node.classList.contains('paragraph-break')) {
        length += 1; // counts as single \n
      } else if (node.childNodes) {
        for (let child of node.childNodes) {
          walk(child);
        }
      }
    };
    
    walk(preCaretRange.cloneContents());
    return length;
  }

  restoreCursorPosition(pos) {
    if (pos === null) return;
    const sel = window.getSelection();
    const range = document.createRange();
    let charCount = 0;
    let nodeStack = [this.inputEl];
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
      } else if (node.classList && node.classList.contains('paragraph-break')) {
        // paragraph-break represents a single \n character
        const nextCharCount = charCount + 1;
        if (pos <= nextCharCount) {
          // Position cursor after the paragraph-break
          const parent = node.parentNode;
          const nextSibling = node.nextSibling;
          if (nextSibling) {
            if (nextSibling.nodeType === Node.TEXT_NODE) {
              range.setStart(nextSibling, 0);
              range.setEnd(nextSibling, 0);
            } else {
              range.setStartAfter(node);
              range.setEndAfter(node);
            }
          } else {
            range.setStartAfter(node);
            range.setEndAfter(node);
          }
          foundStart = true;
        }
        charCount = nextCharCount;
      } else if (node.childNodes) {
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

  renderLiveMarkdown() {
    if (this.paused) return;
    
    // Don't render if we have image tags - they should stay as-is
    const hasTags = this.inputEl.querySelector('.image-tag');
    if (hasTags) return;
    
    const cursorPos = this.saveCursorPosition();
    const rendered = parseMarkdown(escapeHtml(this.markdownText));

    if (this.inputEl.innerHTML !== rendered) {
      this.inputEl.innerHTML = rendered;
      this.restoreCursorPosition(cursorPos);
    }
  }

  syncMarkdownText() {
    if (this.paused) return;
    
    // Get text content but preserve image tags and br elements
    let text = '';
    const processNode = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent;
      } else if (node.nodeName === 'BR') {
        text += '\n';
      } else if (node.classList && node.classList.contains('image-tag')) {
        // Preserve image tag as placeholder
        text += `__IMAGE_TAG_${node.dataset.id}__`;
      } else if (node.classList && node.classList.contains('quote-tag')) {
        // Preserve quote tag as placeholder
        text += '__QUOTE_TAG__';
      } else if (node.childNodes) {
        node.childNodes.forEach(processNode);
      }
    };
    
    this.inputEl.childNodes.forEach(processNode);
    this.markdownText = text;
    this.saveToHistory();
  }

  saveToHistory() {
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }

    if (this.history[this.historyIndex] === this.markdownText) return;

    this.history.push(this.markdownText);

    if (this.history.length > this.maxHistory) {
      this.history.shift();
    } else {
      this.historyIndex++;
    }
  }

  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.markdownText = this.history[this.historyIndex];
      this.renderLiveMarkdown();
      return true;
    }
    return false;
  }

  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.markdownText = this.history[this.historyIndex];
      this.renderLiveMarkdown();
      return true;
    }
    return false;
  }

  clear() {
    this.inputEl.innerHTML = '';
    this.markdownText = '';
    this.history = [''];
    this.historyIndex = 0;
  }

  getText() {
    return this.markdownText || '';
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
    this.syncMarkdownText();
    this.renderLiveMarkdown();
  }
}
