// public/js/inline-input.js
import { getAudioUrl } from './audio-mapping.js?v=1';

export class InlineInput {
  constructor(inputElement, editor, updateCallback = null) {
    this.input = inputElement;
    this.editor = editor;
    this.updateCallback = updateCallback;
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
        fetch('/data/music-test.json'),
        fetch('/data/commands-test.json')
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
        // Check if cursor is right after " –" - force space first
        const beforeCursor = text.substring(0, cursorPos);
        if (beforeCursor.endsWith(' –')) {
          // Add space before the character
          newText = text.slice(0, cursorPos) + ' ' + e.data + text.slice(cursorPos);
          newCursorPos = cursorPos + 2; // After space and new char
        } else {
          newText = text.slice(0, cursorPos) + e.data + text.slice(cursorPos);
          newCursorPos = cursorPos + e.data.length;
        }
      } else if (e.inputType === 'deleteContentBackward') {
        if (cursorPos > 0) {
          // Check if we're deleting from right after " – " or " –"
          const beforeCursor = text.substring(0, cursorPos);
          if (beforeCursor.endsWith(' – ')) {
            // Remove entire " – " block
            newText = text.slice(0, cursorPos - 3) + text.slice(cursorPos);
            newCursorPos = cursorPos - 3;
          } else if (beforeCursor.endsWith(' –')) {
            // Remove " –" (dash without trailing space)
            newText = text.slice(0, cursorPos - 2) + text.slice(cursorPos);
            newCursorPos = cursorPos - 2;
          } else {
            // Normal backspace
            newText = text.slice(0, cursorPos - 1) + text.slice(cursorPos);
            newCursorPos = cursorPos - 1;
          }
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
    
    // Trigger update callback after processing
    if (this.updateCallback) {
      this.updateCallback();
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
    
    // Clear input completely when exiting command mode
    const text = this.getPlainText();
    if (text === '/' || text === '') {
      this.input.textContent = '';
    }
    
    this.editor.resume();
  }

  processCommandInput(text) {
    const savedCursorPos = this.pendingCursorPos !== undefined ? this.pendingCursorPos : this.saveCursorPosition();
    this.pendingCursorPos = undefined;
    
    // Parse command structure
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
    
    // Full command with query: /music: query
    const cmdName = text.substring(0, colonIndex + 1); // /music:
    const fullQuery = text.substring(colonIndex + 1).trim();
    
    this.currentCommand = {
      name: cmdName.slice(0, -1), // /music
      query: fullQuery,
      full: text
    };
    
    if (cmdName === '/music:') {
      // Check if we have artist separator (with or without space after)
      let dashIndex = fullQuery.indexOf(' – ');
      if (dashIndex === -1) {
        dashIndex = fullQuery.indexOf(' –');
      }
      
      if (dashIndex !== -1) {
        // Has separator: artist – track
        const artistPart = fullQuery.substring(0, dashIndex);
        let trackPart = fullQuery.substring(dashIndex + 2).trim(); // Skip " –" and trim
        this.renderMusicWithTrack(cmdName, artistPart, trackPart, savedCursorPos);
      } else {
        // Just artist search
        this.renderMusicCommand(cmdName, fullQuery, savedCursorPos);
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
      const queryLower = query.toLowerCase();
      const artistLower = match.artist.toLowerCase();
      
      // Check if full artist name is typed
      if (queryLower === artistLower) {
        // Full match - show in green
        const html = `<span class="cmd-prefix">${cmdPrefix}</span> <span class="cmd-suggestion">${this.escapeHtml(match.artist)}</span>`;
        this.input.innerHTML = html;
        this.restoreCursorPosition(cursorPos);
      } else {
        // Partial match - show typed + hint
        const typed = match.artist.substring(0, query.length);
        const hint = match.artist.substring(query.length);
        
        const html = `<span class="cmd-prefix">${cmdPrefix}</span> <span class="cmd-query">${this.escapeHtml(typed)}</span><span class="cmd-hint">${this.escapeHtml(hint)}</span>`;
        this.input.innerHTML = html;
        this.restoreCursorPosition(cursorPos);
      }
    } else {
      // No match - show query in black
      const html = `<span class="cmd-prefix">${cmdPrefix}</span> <span class="cmd-query">${this.escapeHtml(query)}</span>`;
      this.input.innerHTML = html;
      this.restoreCursorPosition(cursorPos);
    }
  }

  renderMusicWithTrack(cmdPrefix, artist, trackQuery, cursorPos) {
    // Artist is locked, search tracks for this artist
    const artistMatch = this.searchMusic(artist);
    
    if (!artistMatch) {
      // Artist not found - shouldn't happen but handle it
      const html = `<span class="cmd-prefix">${cmdPrefix}</span> <span class="cmd-query">${this.escapeHtml(artist)} – ${this.escapeHtml(trackQuery)}</span>`;
      this.input.innerHTML = html;
      this.restoreCursorPosition(cursorPos);
      return;
    }
    
    // Artist is valid (green), now search for track
    if (!trackQuery) {
      // No track query yet
      const html = `<span class="cmd-prefix">${cmdPrefix}</span> <span class="cmd-suggestion">${this.escapeHtml(artistMatch.artist)} – </span>`;
      this.input.innerHTML = html;
      this.restoreCursorPosition(cursorPos);
      return;
    }
    
    const trackMatch = this.searchTrack(artistMatch.artist, trackQuery);
    
    if (trackMatch) {
      const queryLower = trackQuery.toLowerCase();
      const trackLower = trackMatch.toLowerCase();
      
      if (queryLower === trackLower) {
        // Full track match - all green
        const html = `<span class="cmd-prefix">${cmdPrefix}</span> <span class="cmd-suggestion">${this.escapeHtml(artistMatch.artist)} – ${this.escapeHtml(trackMatch)}</span>`;
        this.input.innerHTML = html;
        this.restoreCursorPosition(cursorPos);
      } else {
        // Partial track match - artist green, track black+hint
        const typed = trackMatch.substring(0, trackQuery.length);
        const hint = trackMatch.substring(trackQuery.length);
        
        const html = `<span class="cmd-prefix">${cmdPrefix}</span> <span class="cmd-suggestion">${this.escapeHtml(artistMatch.artist)} – </span><span class="cmd-query">${this.escapeHtml(typed)}</span><span class="cmd-hint">${this.escapeHtml(hint)}</span>`;
        this.input.innerHTML = html;
        this.restoreCursorPosition(cursorPos);
      }
    } else {
      // No track match - artist green, track black
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

  searchMusic(query) {
    const lowerQuery = query.toLowerCase();
    
    // Search only by artist name start
    for (const artist of this.musicData) {
      if (artist.artist.toLowerCase().startsWith(lowerQuery)) {
        return {
          artist: artist.artist,
          track: null // Don't return track yet
        };
      }
    }
    
    return null;
  }

  searchTrack(artistName, trackQuery) {
    const lowerQuery = trackQuery.toLowerCase();
    
    // Find the artist
    const artistData = this.musicData.find(a => a.artist === artistName);
    if (!artistData) return null;
    
    // Search tracks for this artist only
    for (const track of artistData.tracks) {
      if (track.toLowerCase().startsWith(lowerQuery)) {
        return track;
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
    
    // Check if cursor would be right after "–" without space
    const text = this.getPlainText();
    const dashIndex = text.indexOf(' –');
    if (dashIndex !== -1 && pos === dashIndex + 2) {
      // Cursor is right after "–", move it after the space
      pos = dashIndex + 3; // After " – "
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
    const text = this.getPlainText();
    
    // Arrow Up in empty field: enter command mode with /
    if (e.key === 'ArrowUp' && !this.commandMode && text === '') {
      e.preventDefault();
      this.input.innerHTML = `<span class="cmd-prefix">/</span><span class="cmd-hint">music</span>`;
      this.restoreCursorPosition(1);
      this.enterCommandMode();
      return;
    }
    
    if (!this.commandMode) return;
    
    // Tab or Arrow Up: autocomplete forward
    if ((e.key === 'Tab' || e.key === 'ArrowUp') && this.commandMode) {
      e.preventDefault();
      
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
      } else {
        // Inside /music: - check if we have artist separator
        const colonIndex = text.indexOf(':');
        const fullQuery = text.substring(colonIndex + 1).trim();
        const dashIndex = fullQuery.indexOf(' – ');
        
        if (dashIndex !== -1) {
          // Has artist – track: autocomplete track
          const artistPart = fullQuery.substring(0, dashIndex);
          const trackPart = fullQuery.substring(dashIndex + 3);
          
          if (trackPart) {
            const trackMatch = this.searchTrack(artistPart, trackPart);
            if (trackMatch) {
              // Complete to full track name
              const html = `<span class="cmd-prefix">/music:</span> <span class="cmd-suggestion">${this.escapeHtml(artistPart)} – ${this.escapeHtml(trackMatch)}</span>`;
              this.input.innerHTML = html;
              this.setCursorToEnd();
            }
          }
        } else {
          // Just artist query: autocomplete artist + add dash
          const query = fullQuery;
          
          if (query) {
            const match = this.searchMusic(query);
            if (match) {
              // Complete to full artist name + dash for track
              const html = `<span class="cmd-prefix">/music:</span> <span class="cmd-suggestion">${this.escapeHtml(match.artist)} – </span>`;
              this.input.innerHTML = html;
              this.setCursorToEnd();
            }
          }
        }
      }
      
      // Trigger update callback after autocomplete
      if (this.updateCallback) {
        this.updateCallback();
      }
    }
    
    // Arrow Down: step back
    if (e.key === 'ArrowDown' && this.commandMode) {
      e.preventDefault();
      
      if (text.includes(':')) {
        const colonIndex = text.indexOf(':');
        const fullQuery = text.substring(colonIndex + 1).trim();
        const dashIndex = fullQuery.indexOf(' – ');
        
        if (dashIndex !== -1) {
          // Has artist – track separator
          const trackPart = fullQuery.substring(dashIndex + 3);
          
          if (trackPart) {
            // Has track query -> clear track, keep artist
            const artistPart = fullQuery.substring(0, dashIndex);
            this.input.innerHTML = `<span class="cmd-prefix">/music:</span> <span class="cmd-suggestion">${this.escapeHtml(artistPart)} – </span>`;
            this.setCursorToEnd();
          } else {
            // Just "artist – " -> remove dash, back to artist only
            const artistPart = fullQuery.substring(0, dashIndex);
            this.input.innerHTML = `<span class="cmd-prefix">/music:</span> <span class="cmd-suggestion">${this.escapeHtml(artistPart)}</span>`;
            this.setCursorToEnd();
          }
        } else {
          // No dash separator
          const query = fullQuery;
          
          if (query) {
            // Has artist query -> clear to /music:
            this.input.innerHTML = `<span class="cmd-prefix">/music:</span> `;
            this.setCursorToEnd();
          } else {
            // Just /music: -> back to /
            this.input.innerHTML = `<span class="cmd-prefix">/</span><span class="cmd-hint">music</span>`;
            this.restoreCursorPosition(1);
          }
        }
      } else if (text === '/') {
        // / -> empty (exit command mode)
        this.input.textContent = '';
        this.exitCommandMode();
      }
      
      // Trigger update callback after Arrow Down
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

  getContent() {
    const text = this.getPlainText().trim();
    
    const musicMatch = text.match(/\/music:\s*(.+)/);
    if (musicMatch) {
      const trackInfo = musicMatch[1].trim();
      const parts = trackInfo.split(' – ');
      const artist = parts[0] || trackInfo;
      const track = parts[1] || '';
      const audioUrl = getAudioUrl(artist, track);
      
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

  isCommandReady() {
    if (!this.commandMode) return false;
    
    const text = this.getPlainText();
    
    console.log('DEBUG isCommandReady:', { text, commandMode: this.commandMode });
    
    // Check if /music: has complete artist – track
    if (text.startsWith('/music:')) {
      const fullQuery = text.substring(8).trim();
      
      console.log('DEBUG fullQuery:', fullQuery);
      
      // Look for dash with space before (" –" or " – ")
      let dashIndex = fullQuery.indexOf(' – ');
      let hasDash = dashIndex !== -1;
      let dashLength = 3; // " – "
      
      if (!hasDash) {
        dashIndex = fullQuery.indexOf(' –');
        hasDash = dashIndex !== -1;
        dashLength = 2; // " –"
      }
      
      console.log('DEBUG dash:', { hasDash, dashIndex, dashLength });
      
      if (hasDash) {
        const artistPart = fullQuery.substring(0, dashIndex);
        const trackPart = fullQuery.substring(dashIndex + dashLength).trim();
        
        console.log('DEBUG parts:', { artistPart, trackPart });
        
        if (artistPart && trackPart) {
          // Check if both artist and track are found
          const artistMatch = this.searchMusic(artistPart);
          console.log('DEBUG artistMatch:', artistMatch);
          
          if (artistMatch && artistMatch.artist.toLowerCase() === artistPart.toLowerCase()) {
            const trackMatch = this.searchTrack(artistMatch.artist, trackPart);
            console.log('DEBUG trackMatch:', trackMatch);
            
            if (trackMatch && trackMatch.toLowerCase() === trackPart.toLowerCase()) {
              console.log('DEBUG COMMAND READY = TRUE');
              return true; // Complete match!
            }
          }
        }
      }
    }
    
    console.log('DEBUG COMMAND READY = FALSE');
    return false;
  }
}
