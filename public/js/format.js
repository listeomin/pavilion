// public/js/format.js
export class FormatMenu {
  constructor(formatMenu, inputEl, editor) {
    this.formatMenu = formatMenu;
    this.inputEl = inputEl;
    this.editor = editor;
    this.setupListeners();
  }

  setupListeners() {
    this.inputEl.addEventListener('mouseup', () => this.show());
    this.inputEl.addEventListener('keyup', () => this.show());

    document.addEventListener('mousedown', (e) => {
      if (!this.formatMenu.contains(e.target) && e.target !== this.inputEl) {
        this.hide();
      }
    });

    this.formatMenu.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      e.preventDefault();
      const format = btn.dataset.format;
      this.applyFormat(format);
      this.hide();
    });
  }

  show() {
    const sel = window.getSelection();

    if (!sel.rangeCount || sel.isCollapsed || document.activeElement !== this.inputEl) {
      this.hide();
      return;
    }

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    const menuX = rect.left + window.scrollX;
    const menuY = rect.top + window.scrollY - 40;

    this.formatMenu.style.left = menuX + 'px';
    this.formatMenu.style.top = menuY + 'px';
    this.formatMenu.classList.add('visible');
  }

  hide() {
    this.formatMenu.classList.remove('visible');
  }

  applyFormat(format) {
    const sel = window.getSelection();
    if (!sel.rangeCount) return;

    const range = sel.getRangeAt(0);

    const preRange = range.cloneRange();
    preRange.selectNodeContents(this.inputEl);
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

    this.editor.markdownText = this.editor.markdownText.slice(0, start) +
      wrapper +
      this.editor.markdownText.slice(start, end) +
      wrapper +
      this.editor.markdownText.slice(end);

    this.editor.saveToHistory();

    const newCursorPos = end + wrapper.length * 2;
    this.editor.renderLiveMarkdown();
    this.editor.restoreCursorPosition(newCursorPos);

    this.inputEl.focus();
  }
}
