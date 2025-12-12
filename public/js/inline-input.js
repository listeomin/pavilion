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
        fetch('/data/music-test.json'),
        fetch('/data/commands-test.json')
      ]);
      
      this.musicData = await musicRes.json();
      this.commands = await commandsRes.json();
    } catch (err) {
      console.error('Failed to load command data:', err);
    }
  }

  attachListeners() {
    this.input.addEventListener('input', () => this.handleInput());
    this.input.addEventListener('keydown', (e) => this.handleKeydown(e));
  }

  handleInput() {
    const text = this.input.textContent;
    
    // Check if we should enter/exit command mode
    if (text.startsWith('/')) {
      this.enterCommandMode();
      this.processCommandInput(text);
    } else {
      this.exitCommandMode();
    }
  }

  enterCommandMode() {
    if (this.commandMode) return;
    
    this.commandMode = true;
    this.input.classList.add('command-mode');
    
    // Disable editor markdown processing
    this.editor.pause();
  }

  exitCommandMode() {
    if (!this.commandMode) return;
    
    this.commandMode = false;
    this.input.classList.remove('command-mode');
    this.currentCommand = null;
    
    // Re-enable editor
    this.editor.resume();
  }

  processCommandInput(text) {
    const parts = text.split(':');
    const cmdName = parts[0]; // /music
    const cmdQuery = parts[1] ? parts[1].trim() : ''; // query after colon
    
    this.currentCommand = {
      name: cmdName,
      query: cmdQuery,
      full: text
    };
    
    if (cmdName === '/music' && cmdQuery) {
      this.processMusicAutocomplete(cmdQuery);
    }
  }

  processMusicAutocomplete(query) {
    const match = this.searchMusic(query);
    
    if (match) {
      const suggestion = `${match.artist} – ${match.track}`;
      const newText = `/music: ${suggestion}`;
      
      // Update input with autocomplete
      this.input.textContent = newText;
      
      // Set cursor at the end
      this.setCursorToEnd();
    }
  }

  searchMusic(query) {
    const lowerQuery = query.toLowerCase();
    
    // Search through all artists and tracks
    for (const artist of this.musicData) {
      // Match artist name
      if (artist.artist.toLowerCase().includes(lowerQuery)) {
        return {
          artist: artist.artist,
          track: artist.tracks[0] // First track alphabetically
        };
      }
      
      // Match track names
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

  setCursorToEnd() {
    const range = document.createRange();
    const sel = window.getSelection();
    
    // Place cursor at end
    range.selectNodeContents(this.input);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  handleKeydown(e) {
    // Tab for autocomplete (future feature)
    if (e.key === 'Tab' && this.commandMode) {
      e.preventDefault();
    }
  }

  // Get final content for sending
  getContent() {
    const text = this.input.textContent.trim();
    
    // Music command
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
    
    // Regular text - use editor's markdown text
    return {
      text: this.editor.getText(),
      metadata: null
    };
  }
}
