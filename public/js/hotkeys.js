// public/js/hotkeys.js
export function setupHotkeys(inputEl, editor, onSubmit) {
  inputEl.addEventListener('keydown', (e) => {
    const isMod = e.metaKey || e.ctrlKey;

    // Ctrl+U: Clear line (like terminal)
    if (e.ctrlKey && e.key === 'u') {
      e.preventDefault();
      inputEl.innerHTML = '';
      editor.clear();
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
