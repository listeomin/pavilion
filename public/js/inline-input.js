// public/js/inline-input.js

export class InlineInput {
  constructor(inputElement, editor) {
    this.input = inputElement;
    this.editor = editor;
    this.musicData = [];
    this.commands = [];
    this.commandMode = false;
    this.currentCommand = null;
    
    this.init();
  }

  async init() {
    await this.loadData();
    this.attachListeners();
  }

  async loadData() {
    try {
      const [musicRes, commandsRes] = await Promise.all([
        fetch('/public/data/music-test.json'),
        fetch('/public/data/commands-test.json')
      ]);
      
      if (!musicRes.ok || !commandsRes.ok) {
        console.error('Response status:', musicRes.status, commandsRes.status);
        throw new Error('Failed to fetch data files');
      }
      
      this.musicData = await musicRes.json();
      this.commands = await commandsRes.json();
      
      console.log('Loaded data:', this.musicData.length, 'artists', this.commands.length, 'commands');
    } catch (err) {
      console.error('Failed to load command data:', err);
    }
  }

  attachListeners() {
    this.input.addEventListener('beforeinput', (e) => this.handleBeforeInput(e));
    this.input.addEventListener('input', () => this.handleInput());
    this.input.addEventListener('keydown', (e) => this.handleKeydown(e));
  }

  handleBeforeInput(e) {
    if (!this.commandMode) return;
    
    // In command mode, prevent default and handle manually
    if (e.inputType === 'insertText' || e.inputType === 'deleteContentBackward') {
      e.preventDefault();
      
      const text = this.getPlainText();
      const cursorPos = this.saveCursorPosition();
      let newText = text;
      let newCursorPos = cursorPos;
      
      if (e.inputType === 'insertText' && e.data) {
        newText = text.slice(0, cursorPos) + e.data + text.slice(cursorPos);
        newCursorPos = cursorPos + e.data.length;
      } else if (e.inputType === 'deleteContentBackward') {
        if (cursorPos > 0) {
          newText = text.slice(0, cursorPos - 1) + text.slice(cursorPos);
          newCursorPos = cursorPos - 1;
        }
      }
      
      // Store for processing
      this.pendingText = newText;
      this.pendingCursorPos = newCursorPos;
      
      // Trigger input event manually
      setTimeout(() => {
        this.handleInput();
      }, 0);
    }
  }

  handleInput() {
    const text = this.pendingText !== undefined ? this.pendingText : this.getPlainText();
    this.pendingText = undefined;
    
    if (text.startsWith('/')) {
      this.enterCommandMode();
      this.processCommandInput(text);
    } else {
      this.exitCommandMode();
    }
  }

  getPlainText() {
    // Get only typed text, exclude hints
    let text = '';
    const walker = document.createTreeWalker(
      this.input,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          // Skip text nodes inside hint spans
          const parent = node.parentElement;
          if (parent && parent.classList.contains('cmd-hint')) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      },
      false
    );
    
    let node;
    while ((node = walker.nextNode())) {
      text += node.textContent;
    }
    
    return text;
  }

  enterCommandMode() {
    if (this.commandMode) return;
    
    this.commandMode = true;
    this.input.classList.add('command-mode');
    this.editor.pause();
  }

  exitCommandMode() {
    if (!this.commandMode) return;
    
    this.commandMode = false;
    this.input.classList.remove('command-mode');
    this.currentCommand = null;
    this.editor.resume();
  }

  processCommandInput(text) {
    const savedCursorPos = this.pendingCursorPos !== undefined ? this.pendingCursorPos : this.saveCursorPosition();
    this.pendingCursorPos = undefined;
    
    // Parse command structure
    if (text === '/') {
      // Show hint for available commands
      this.renderCommandHint();
      this.restoreCursorPosition(1); // After /
      return;
    }
    
    const colonIndex = text.indexOf(':');
    
    if (colonIndex === -1) {
      // Still typing command name: /mus
      this.renderCommandName(text);
      this.restoreCursorPosition(savedCursorPos);
      return;
    }
    
    // Full command with query: /music: query
    const cmdName = text.substring(0, colonIndex + 1); // /music:
    const query = text.substring(colonIndex + 1).trim();
    
    this.currentCommand = {
      name: cmdName.slice(0, -1), // /music
      query: query,
      full: text
    };
    
    if (cmdName === '/music:') {
      this.renderMusicCommand(cmdName, query, savedCursorPos);
    } else {
      this.renderGenericCommand(cmdName, query, savedCursorPos);
    }
  }

  renderCommandHint() {
    const html = `<span class="cmd-prefix">/</span><span class="cmd-hint">music</span>`;
    this.input.innerHTML = html;
  }

  renderCommandName(text) {
    // Typing command: /mus -> show /mus (purple) + ic (gray)
    const typed = text.substring(1); // mus
    const match = this.findCommandMatch(typed);
    
    if (match) {
      const remaining = match.substring(typed.length); // ic
      const html = `<span class="cmd-prefix">/${typed}</span><span class="cmd-hint">${remaining}</span>`;
      this.input.innerHTML = html;
    } else {
      this.input.innerHTML = `<span class="cmd-prefix">${this.escapeHtml(text)}</span>`;
    }
  }

  findCommandMatch(partial) {
    const cmd = this.commands.find(c => 
      c.command.substring(1).startsWith(partial)
    );
    return cmd ? cmd.command.substring(1) : null; // music
  }

  renderMusicCommand(cmdPrefix, query, cursorPos) {
    if (!query) {
      // Just /music: with no query
      this.input.innerHTML = `<span class="cmd-prefix">${cmdPrefix}</span> `;
      this.restoreCursorPosition(cursorPos);
      return;
    }
    
    const match = this.searchMusic(query);
    
    if (match) {
      // Found suggestion
      const suggestion = `${match.artist} – ${match.track}`;
      const html = `<span class="cmd-prefix">${cmdPrefix}</span> <span class="cmd-suggestion">${this.escapeHtml(suggestion)}</span>`;
      this.input.innerHTML = html;
      this.setCursorToEnd();
    } else {
      // No match, show query in default color
      const html = `<span class="cmd-prefix">${cmdPrefix}</span> <span class="cmd-query">${this.escapeHtml(query)}</span>`;
      this.input.innerHTML = html;
      this.restoreCursorPosition(cursorPos);
    }
  }

  renderGenericCommand(cmdPrefix, query, cursorPos) {
    const html = `<span class="cmd-prefix">${cmdPrefix}</span> <span class="cmd-query">${this.escapeHtml(query)}</span>`;
    this.input.innerHTML = html;
    this.restoreCursorPosition(cursorPos);
  }

  searchMusic(query) {
    const lowerQuery = query.toLowerCase();
    
    for (const artist of this.musicData) {
      if (artist.artist.toLowerCase().includes(lowerQuery)) {
        return {
          artist: artist.artist,
          track: artist.tracks[0]
        };
      }
      
      for (const track of artist.tracks) {
        if (track.toLowerCase().includes(lowerQuery)) {
          return {
            artist: artist.artist,
            track: track
          };
        }
      }
    }
    
    return null;
  }

  saveCursorPosition() {
    const sel = window.getSelection();
    if (!sel.rangeCount) return 0;
    
    const range = sel.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(this.input);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    
    return preCaretRange.toString().length;
  }

  restoreCursorPosition(pos) {
    if (pos === null || pos === undefined) return;
    
    const sel = window.getSelection();
    const range = document.createRange();
    
    let currentPos = 0;
    const walker = document.createTreeWalker(
      this.input,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    
    let node;
    while ((node = walker.nextNode())) {
      const nodeLength = node.textContent.length;
      
      if (currentPos + nodeLength >= pos) {
        range.setStart(node, pos - currentPos);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        return;
      }
      
      currentPos += nodeLength;
    }
    
    // If position not found, set to end
    this.setCursorToEnd();
  }

  setCursorToEnd() {
    const range = document.createRange();
    const sel = window.getSelection();
    
    range.selectNodeContents(this.input);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  handleKeydown(e) {
    if (e.key === 'Tab' && this.commandMode) {
      e.preventDefault();
      // TODO: autocomplete on tab
    }
    
    // Arrow up: autocomplete command
    if (e.key === 'ArrowUp' && this.commandMode) {
      e.preventDefault();
      const text = this.getPlainText();
      
      // If typing command name without colon
      if (!text.includes(':')) {
        const typed = text.substring(1);
        const match = this.findCommandMatch(typed);
        
        if (match) {
          // Complete to /music:
          const completed = `/${match}:`;
          this.input.innerHTML = `<span class="cmd-prefix">${completed}</span> `;
          this.setCursorToEnd();
        }
      }
    }
  }

  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  getContent() {
    const text = this.getPlainText().trim();
    
    const musicMatch = text.match(/\/music:\s*(.+)/);
    if (musicMatch) {
      const trackInfo = musicMatch[1].trim();
      const parts = trackInfo.split(' – ');
      
      return {
        text: trackInfo,
        metadata: {
          type: 'music',
          artist: parts[0] || trackInfo,
          track: parts[1] || ''
        }
      };
    }
    
    return {
      text: this.editor.getText(),
      metadata: null
    };
  }
}
