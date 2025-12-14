// public/js/inline-input.js
import { getAudioUrl } from './audio-mapping.js?v=1';

export class InlineInput {
  constructor(inputElement, editor, updateCallback = null) {
    this.input = inputElement;
    this.editor = editor;
    this.updateCallback = updateCallback;
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
      const commandsRes = await fetch('data/commands-test.json');
      
      if (!commandsRes.ok) {
        console.error('Response status:', commandsRes.status);
        throw new Error('Failed to fetch data files');
      }
      
      this.commands = await commandsRes.json();
      
      console.log('Loaded data:', this.commands.length, 'commands');
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
    
    if (e.inputType === 'insertText' || e.inputType === 'deleteContentBackward') {
      e.preventDefault();
      
      const text = this.getPlainText();
      const cursorPos = this.saveCursorPosition();
      let newText = text;
      let newCursorPos = cursorPos;
      
      if (e.inputType === 'insertText' && e.data) {
        const beforeCursor = text.substring(0, cursorPos);
        if (beforeCursor.endsWith(' –')) {
          newText = text.slice(0, cursorPos) + ' ' + e.data + text.slice(cursorPos);
          newCursorPos = cursorPos + 2;
        } else {
          newText = text.slice(0, cursorPos) + e.data + text.slice(cursorPos);
          newCursorPos = cursorPos + e.data.length;
        }
      } else if (e.inputType === 'deleteContentBackward') {
        if (cursorPos > 0) {
          const beforeCursor = text.substring(0, cursorPos);
          if (beforeCursor.endsWith(' – ')) {
            newText = text.slice(0, cursorPos - 3) + text.slice(cursorPos);
            newCursorPos = cursorPos - 3;
          } else if (beforeCursor.endsWith(' –')) {
            newText = text.slice(0, cursorPos - 2) + text.slice(cursorPos);
            newCursorPos = cursorPos - 2;
          } else {
            newText = text.slice(0, cursorPos - 1) + text.slice(cursorPos);
            newCursorPos = cursorPos - 1;
          }
        }
      }
      
      this.pendingText = newText;
      this.pendingCursorPos = newCursorPos;
      
      setTimeout(() => {
        this.handleInput();
      }, 0);
    }
  }

  async handleInput() {
    const text = this.pendingText !== undefined ? this.pendingText : this.getPlainText();
    this.pendingText = undefined;
    
    if (text.startsWith('/')) {
      this.enterCommandMode();
      await this.processCommandInput(text);
    } else {
      this.exitCommandMode();
    }
    
    if (this.updateCallback) {
      this.updateCallback();
    }
  }

  getPlainText() {
    let text = '';
    const walker = document.createTreeWalker(
      this.input,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
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
    
    const text = this.getPlainText();
    if (text === '/' || text === '') {
      this.input.textContent = '';
    }
    
    this.editor.resume();
  }

  async processCommandInput(text) {
    const savedCursorPos = this.pendingCursorPos !== undefined ? this.pendingCursorPos : this.saveCursorPosition();
    this.pendingCursorPos = undefined;
    
    if (text === '/') {
      this.renderCommandHint();
      this.restoreCursorPosition(1);
      return;
    }
    
    const colonIndex = text.indexOf(':');
    
    if (colonIndex === -1) {
      this.renderCommandName(text);
      this.restoreCursorPosition(savedCursorPos);
      return;
    }
    
    const cmdName = text.substring(0, colonIndex + 1);
    const fullQuery = text.substring(colonIndex + 1).trim();
    
    this.currentCommand = {
      name: cmdName.slice(0, -1),
      query: fullQuery,
      full: text
    };
    
    if (cmdName === '/music:') {
      let dashIndex = fullQuery.indexOf(' – ');
      if (dashIndex === -1) {
        dashIndex = fullQuery.indexOf(' –');
      }
      
      if (dashIndex !== -1) {
        const artistPart = fullQuery.substring(0, dashIndex);
        let trackPart = fullQuery.substring(dashIndex + 2).trim();
        await this.renderMusicWithTrack(cmdName, artistPart, trackPart, savedCursorPos);
      } else {
        await this.renderMusicCommand(cmdName, fullQuery, savedCursorPos);
      }
    } else {
      this.renderGenericCommand(cmdName, fullQuery, savedCursorPos);
    }
  }

  renderCommandHint() {
    const html = `<span class="cmd-prefix">/</span><span class="cmd-hint">music</span>`;
    this.input.innerHTML = html;
  }

  renderCommandName(text) {
    const typed = text.substring(1);
    const match = this.findCommandMatch(typed);
    
    if (match) {
      const remaining = match.substring(typed.length);
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
    return cmd ? cmd.command.substring(1) : null;
  }

  async renderMusicCommand(cmdPrefix, query, cursorPos) {
    if (!query) {
      this.input.innerHTML = `<span class="cmd-prefix">${cmdPrefix}</span> `;
      this.restoreCursorPosition(cursorPos);
      return;
    }
    
    const match = await this.searchMusic(query);
    
    if (match) {
      const queryLower = query.toLowerCase();
      const artistLower = match.artist.toLowerCase();
      
      if (queryLower === artistLower) {
        const html = `<span class="cmd-prefix">${cmdPrefix}</span> <span class="cmd-suggestion">${this.escapeHtml(match.artist)}</span>`;
        this.input.innerHTML = html;
        this.restoreCursorPosition(cursorPos);
      } else {
        const typed = match.artist.substring(0, query.length);
        const hint = match.artist.substring(query.length);
        
        const html = `<span class="cmd-prefix">${cmdPrefix}</span> <span class="cmd-query">${this.escapeHtml(typed)}</span><span class="cmd-hint">${this.escapeHtml(hint)}</span>`;
        this.input.innerHTML = html;
        this.restoreCursorPosition(cursorPos);
      }
    } else {
      const html = `<span class="cmd-prefix">${cmdPrefix}</span> <span class="cmd-query">${this.escapeHtml(query)}</span>`;
      this.input.innerHTML = html;
      this.restoreCursorPosition(cursorPos);
    }
  }

  async renderMusicWithTrack(cmdPrefix, artist, trackQuery, cursorPos) {
    const artistMatch = await this.searchMusic(artist);
    
    if (!artistMatch) {
      const html = `<span class="cmd-prefix">${cmdPrefix}</span> <span class="cmd-query">${this.escapeHtml(artist)} – ${this.escapeHtml(trackQuery)}</span>`;
      this.input.innerHTML = html;
      this.restoreCursorPosition(cursorPos);
      return;
    }
    
    if (!trackQuery) {
      const html = `<span class="cmd-prefix">${cmdPrefix}</span> <span class="cmd-suggestion">${this.escapeHtml(artistMatch.artist)} – </span>`;
      this.input.innerHTML = html;
      this.restoreCursorPosition(cursorPos);
      return;
    }
    
    const trackMatch = await this.searchTrack(artistMatch.artist, trackQuery);
    
    if (trackMatch) {
      const queryLower = trackQuery.toLowerCase();
      const trackLower = trackMatch.toLowerCase();
      
      if (queryLower === trackLower) {
        const html = `<span class="cmd-prefix">${cmdPrefix}</span> <span class="cmd-suggestion">${this.escapeHtml(artistMatch.artist)} – ${this.escapeHtml(trackMatch)}</span>`;
        this.input.innerHTML = html;
        this.restoreCursorPosition(cursorPos);
      } else {
        const typed = trackMatch.substring(0, trackQuery.length);
        const hint = trackMatch.substring(trackQuery.length);
        
        const html = `<span class="cmd-prefix">${cmdPrefix}</span> <span class="cmd-suggestion">${this.escapeHtml(artistMatch.artist)} – </span><span class="cmd-query">${this.escapeHtml(typed)}</span><span class="cmd-hint">${this.escapeHtml(hint)}</span>`;
        this.input.innerHTML = html;
        this.restoreCursorPosition(cursorPos);
      }
    } else {
      const html = `<span class="cmd-prefix">${cmdPrefix}</span> <span class="cmd-suggestion">${this.escapeHtml(artistMatch.artist)} – </span><span class="cmd-query">${this.escapeHtml(trackQuery)}</span>`;
      this.input.innerHTML = html;
      this.restoreCursorPosition(cursorPos);
    }
  }

  renderGenericCommand(cmdPrefix, query, cursorPos) {
    const html = `<span class="cmd-prefix">${cmdPrefix}</span> <span class="cmd-query">${this.escapeHtml(query)}</span>`;
    this.input.innerHTML = html;
    this.restoreCursorPosition(cursorPos);
  }

  async searchMusic(query) {
    try {
      const response = await fetch(`/api/music/search-artist?q=${encodeURIComponent(query)}`);
      if (!response.ok) return null;
      
      const data = await response.json();
      if (data.artist) {
        return {
          artist: data.artist,
          track: null
        };
      }
    } catch (error) {
      console.error('Failed to search artist:', error);
    }
    
    return null;
  }

  async searchTrack(artistName, trackQuery) {
    try {
      const response = await fetch(`/api/music/search-track?artist=${encodeURIComponent(artistName)}&q=${encodeURIComponent(trackQuery)}`);
      if (!response.ok) return null;
      
      const data = await response.json();
      return data.track || null;
    } catch (error) {
      console.error('Failed to search track:', error);
      return null;
    }
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
    
    const text = this.getPlainText();
    const dashIndex = text.indexOf(' –');
    if (dashIndex !== -1 && pos === dashIndex + 2) {
      pos = dashIndex + 3;
    }
    
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

  async handleKeydown(e) {
    const text = this.getPlainText();
    
    if (e.key === 'ArrowUp' && !this.commandMode && text === '') {
      e.preventDefault();
      this.input.innerHTML = `<span class="cmd-prefix">/</span><span class="cmd-hint">music</span>`;
      this.restoreCursorPosition(1);
      this.enterCommandMode();
      return;
    }
    
    if (!this.commandMode) return;
    
    if ((e.key === 'Tab' || e.key === 'ArrowUp') && this.commandMode) {
      e.preventDefault();
      
      if (!text.includes(':')) {
        const typed = text.substring(1);
        const match = this.findCommandMatch(typed);
        
        if (match) {
          const completed = `/${match}:`;
          this.input.innerHTML = `<span class="cmd-prefix">${completed}</span> `;
          this.setCursorToEnd();
        }
      } else {
        const colonIndex = text.indexOf(':');
        const fullQuery = text.substring(colonIndex + 1).trim();
        const dashIndex = fullQuery.indexOf(' – ');
        
        if (dashIndex !== -1) {
          const artistPart = fullQuery.substring(0, dashIndex);
          const trackPart = fullQuery.substring(dashIndex + 3);
          
          if (trackPart) {
            const trackMatch = await this.searchTrack(artistPart, trackPart);
            if (trackMatch) {
              const html = `<span class="cmd-prefix">/music:</span> <span class="cmd-suggestion">${this.escapeHtml(artistPart)} – ${this.escapeHtml(trackMatch)}</span>`;
              this.input.innerHTML = html;
              this.setCursorToEnd();
            }
          }
        } else {
          const query = fullQuery;
          
          if (query) {
            const match = await this.searchMusic(query);
            if (match) {
              const html = `<span class="cmd-prefix">/music:</span> <span class="cmd-suggestion">${this.escapeHtml(match.artist)} – </span>`;
              this.input.innerHTML = html;
              this.setCursorToEnd();
            }
          }
        }
      }
      
      if (this.updateCallback) {
        this.updateCallback();
      }
    }
    
    if (e.key === 'ArrowDown' && this.commandMode) {
      e.preventDefault();
      
      if (text.includes(':')) {
        const colonIndex = text.indexOf(':');
        const fullQuery = text.substring(colonIndex + 1).trim();
        const dashIndex = fullQuery.indexOf(' – ');
        
        if (dashIndex !== -1) {
          const trackPart = fullQuery.substring(dashIndex + 3);
          
          if (trackPart) {
            const artistPart = fullQuery.substring(0, dashIndex);
            this.input.innerHTML = `<span class="cmd-prefix">/music:</span> <span class="cmd-suggestion">${this.escapeHtml(artistPart)} – </span>`;
            this.setCursorToEnd();
          } else {
            const artistPart = fullQuery.substring(0, dashIndex);
            this.input.innerHTML = `<span class="cmd-prefix">/music:</span> <span class="cmd-suggestion">${this.escapeHtml(artistPart)}</span>`;
            this.setCursorToEnd();
          }
        } else {
          const query = fullQuery;
          
          if (query) {
            this.input.innerHTML = `<span class="cmd-prefix">/music:</span> `;
            this.setCursorToEnd();
          } else {
            this.input.innerHTML = `<span class="cmd-prefix">/</span><span class="cmd-hint">music</span>`;
            this.restoreCursorPosition(1);
          }
        }
      } else if (text === '/') {
        this.input.textContent = '';
        this.exitCommandMode();
      }
      
      if (this.updateCallback) {
        this.updateCallback();
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

  async getContent() {
    const text = this.getPlainText().trim();
    
    const musicMatch = text.match(/\/music:\s*(.+)/);
    if (musicMatch) {
      const trackInfo = musicMatch[1].trim();
      const parts = trackInfo.split(' – ');
      const artist = parts[0] || trackInfo;
      const track = parts[1] || '';
      const audioUrl = await getAudioUrl(artist, track);
      
      return {
        text: trackInfo,
        metadata: {
          type: 'music',
          artist,
          track,
          audioUrl
        }
      };
    }
    
    return {
      text: this.editor.getText(),
      metadata: null
    };
  }

  async isCommandReady() {
    if (!this.commandMode) return false;
    
    const text = this.getPlainText();
    
    if (text.startsWith('/music:')) {
      const fullQuery = text.substring(8).trim();
      
      let dashIndex = fullQuery.indexOf(' – ');
      let hasDash = dashIndex !== -1;
      let dashLength = 3;
      
      if (!hasDash) {
        dashIndex = fullQuery.indexOf(' –');
        hasDash = dashIndex !== -1;
        dashLength = 2;
      }
      
      if (hasDash) {
        const artistPart = fullQuery.substring(0, dashIndex);
        const trackPart = fullQuery.substring(dashIndex + dashLength).trim();
        
        if (artistPart && trackPart) {
          const artistMatch = await this.searchMusic(artistPart);
          
          if (artistMatch && artistMatch.artist.toLowerCase() === artistPart.toLowerCase()) {
            const trackMatch = await this.searchTrack(artistMatch.artist, trackPart);
            
            if (trackMatch && trackMatch.toLowerCase() === trackPart.toLowerCase()) {
              return true;
            }
          }
        }
      }
    }
    
    return false;
  }
}