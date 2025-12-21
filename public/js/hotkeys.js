// public/js/hotkeys.js
export function setupHotkeys(inputEl, editor, onSubmit, messageHistory = null, getCurrentAuthor = null, commandNavigator = null) {
  inputEl.addEventListener('keydown', (e) => {
    const isMod = e.metaKey || e.ctrlKey;
    const text = inputEl.textContent.trim();

    // Alt (without other keys): Command navigation
    if (e.altKey && !e.shiftKey && !isMod && e.key === 'Alt' && commandNavigator) {
      // Only works when field is empty or starts with /
      if (text === '' || (text.startsWith('/') && !text.includes(':'))) {
        e.preventDefault();
        
        const command = commandNavigator.next();
        
        if (command) {
          inputEl.textContent = command;
          editor.markdownText = command;
          inputEl.classList.add('command-active');
          
          // Move cursor to end
          const sel = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(inputEl);
          range.collapse(false);
          sel.removeAllRanges();
          sel.addRange(range);
        }
        return;
      }
    }

    // Arrow Down: Get last message (empty field) or clear field (non-empty field)
    if (e.key === 'ArrowDown' && !e.altKey && messageHistory && getCurrentAuthor) {
      const isEmpty = inputEl.textContent.trim() === '';
      e.preventDefault();
      
      if (isEmpty) {
        // Empty field: restore last message
        const msg = messageHistory.getLastForAuthor(getCurrentAuthor());
        if (msg) {
          restoreMessage(inputEl, editor, msg);
        }
      } else {
        // Non-empty field: clear it
        inputEl.innerHTML = '';
        editor.clear();
        messageHistory.reset();
        messageHistory.clearEditing();
      }
      return;
    }

    // Arrow Up: Navigate message history backward
    if (e.key === 'ArrowUp' && !e.altKey && messageHistory && getCurrentAuthor) {
      const isEmpty = inputEl.textContent.trim() === '';
      if (isEmpty) {
        e.preventDefault();
        const msg = messageHistory.getPrevious(getCurrentAuthor());
        if (msg) {
          restoreMessage(inputEl, editor, msg);
        }
        return;
      }
    }

    // Ctrl+U: Clear line (like terminal)
    if (e.ctrlKey && e.key === 'u') {
      e.preventDefault();
      inputEl.innerHTML = '';
      editor.clear();
      if (messageHistory) {
        messageHistory.reset();
        messageHistory.clearEditing();
      }
      return;
    }

    // Undo
    if (isMod && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      editor.undo();
      return;
    }

    // Redo
    if (isMod && e.key === 'z' && e.shiftKey) {
      e.preventDefault();
      editor.redo();
      return;
    }

    // Bold
    if (isMod && e.key === 'b') {
      e.preventDefault();
      applyFormatViaHotkey('bold', editor, inputEl);
      return;
    }

    // Italic
    if (isMod && e.key === 'i') {
      e.preventDefault();
      applyFormatViaHotkey('italic', editor, inputEl);
      return;
    }

    // Code
    if (isMod && e.key === 'e') {
      e.preventDefault();
      applyFormatViaHotkey('code', editor, inputEl);
      return;
    }

    // Submit on Enter, new line on Shift+Enter
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Shift+Enter: insert line break
        e.preventDefault();
        const sel = window.getSelection();
        if (!sel.rangeCount) return;
        
        const range = sel.getRangeAt(0);
        range.deleteContents();
        
        // Insert <br> for line break
        const br = document.createElement('br');
        range.insertNode(br);
        
        // Insert empty text node or zero-width space after br to make it visible
        const emptyText = document.createTextNode('\u200B'); // zero-width space
        br.parentNode.insertBefore(emptyText, br.nextSibling);
        
        // Move cursor to empty text node
        range.setStart(emptyText, 1);
        range.setEnd(emptyText, 1);
        sel.removeAllRanges();
        sel.addRange(range);
        
        // Manually sync
        editor.syncMarkdownText();
      } else {
        // Enter: submit
        e.preventDefault();
        onSubmit();
      }
    }
  });

  // Remove command-active class when user types
  inputEl.addEventListener('input', () => {
    const text = inputEl.textContent.trim();
    if (!text.startsWith('/') || text.includes(':')) {
      inputEl.classList.remove('command-active');
    }
  });
}

function restoreMessage(inputEl, editor, msg) {
  // Restore text to input
  inputEl.textContent = msg.text;
  editor.markdownText = msg.text;
  editor.saveToHistory();
  
  // Move cursor to end
  const sel = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(inputEl);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);
  
  // Trigger input event
  inputEl.dispatchEvent(new Event('input', { bubbles: true }));
}

function applyFormatViaHotkey(format, editor, inputEl) {
  const sel = window.getSelection();
  if (!sel.rangeCount) return;

  const range = sel.getRangeAt(0);

  const preRange = range.cloneRange();
  preRange.selectNodeContents(inputEl);
  preRange.setEnd(range.startContainer, range.startOffset);
  const start = preRange.toString().length;
  const end = start + range.toString().length;

  if (start === end) return;

  let wrapper;
  switch (format) {
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

  editor.markdownText = editor.markdownText.slice(0, start) +
    wrapper +
    editor.markdownText.slice(start, end) +
    wrapper +
    editor.markdownText.slice(end);

  editor.saveToHistory();

  const newCursorPos = end + wrapper.length * 2;
  editor.renderLiveMarkdown();
  editor.restoreCursorPosition(newCursorPos);

  inputEl.focus();
}
