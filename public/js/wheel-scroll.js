/**
 * Wheel scroll navigation for inline autocomplete
 * Allows scrolling through artist/track matches with mouse wheel
 */

import { TrackPreview } from './track-preview.js?v=1';

export class WheelScroll {
  constructor(inlineInput, updateCallback) {
    this.inlineInput = inlineInput;
    this.updateCallback = updateCallback;
    
    // Track artist matches and current index
    this.artistMatches = [];
    this.currentArtistIndex = 0;
    
    // Track track matches and current index  
    this.trackMatches = [];
    this.currentTrackIndex = 0;
    
    // Current artist for track search context
    this.currentArtist = null;
    
    // Track preview overlay
    this.trackPreview = new TrackPreview();
  }

  /**
   * Attach wheel listener to input element
   * Detects hover over artist/track spans
   */
  attachListener(inputElement) {
    inputElement.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });
    
    // Block keyboard navigation when preview is visible
    inputElement.addEventListener('keydown', (e) => {
      if (this.trackPreview.visible) {
        if (['ArrowUp', 'ArrowDown', 'Backspace', 'Tab'].includes(e.key)) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    });
    
    // Show preview on hover, hide on mouseout
    inputElement.addEventListener('mouseover', (e) => {
      if (e.target.classList.contains('cmd-suggestion')) {
        this.showPreview(e.target, e);
      }
    });
    
    inputElement.addEventListener('mousemove', (e) => {
      if (e.target.classList.contains('cmd-suggestion')) {
        this.showPreview(e.target, e);
      }
    });
    
    inputElement.addEventListener('mouseout', (e) => {
      if (e.target.classList.contains('cmd-suggestion')) {
        this.trackPreview.hide();
      }
    });
  }

  /**
   * Handle wheel event - detect which span is hovered
   */
  handleWheel(e) {
    const target = e.target;
    
    console.log('WHEEL EVENT:', {
      target: target,
      tagName: target.tagName,
      classList: Array.from(target.classList),
      hasClass: target.classList.contains('cmd-suggestion')
    });
    
    // Check if hovering over suggestion span
    if (!target.classList.contains('cmd-suggestion')) return;
    
    console.log('WHEEL on cmd-suggestion!');
    
    e.preventDefault();
    
    const text = this.inlineInput.getPlainText();
    
    // Parse current state
    const colonIndex = text.indexOf(':');
    if (colonIndex === -1) return;
    
    const fullQuery = text.substring(colonIndex + 1).trim();
    const dashIndex = fullQuery.indexOf(' – ');
    
    if (dashIndex !== -1) {
      // Has artist – track: determine which part mouse is over
      const artistPart = fullQuery.substring(0, dashIndex);
      const trackPart = fullQuery.substring(dashIndex + 3);
      
      if (!trackPart) {
        // Only artist part exists
        this.handleArtistWheel(e, artistPart);
        return;
      }
      
      // Get text position under mouse
      const range = document.caretRangeFromPoint(e.clientX, e.clientY);
      if (!range) {
        this.handleArtistWheel(e, artistPart);
        return;
      }
      
      // Calculate position in full text
      const spanText = target.textContent;
      const dashTextIndex = spanText.indexOf(' – ');
      
      if (dashTextIndex === -1) {
        this.handleArtistWheel(e, artistPart);
        return;
      }
      
      // Simple check: find offset in span text
      let offset = 0;
      try {
        offset = range.startOffset;
      } catch (e) {
        // Fallback to artist
        this.handleArtistWheel(e, artistPart);
        return;
      }
      
      // If offset is after dash position, it's track
      if (offset > dashTextIndex + 3) {
        this.handleTrackWheel(e, artistPart, trackPart);
      } else {
        this.handleArtistWheel(e, artistPart);
      }
    } else {
      // Just artist, no track yet
      if (fullQuery) {
        this.handleArtistWheel(e, fullQuery);
      }
    }
  }

  /**
   * Handle wheel on artist part
   */
  handleArtistWheel(e, currentArtist) {
    e.preventDefault();
    
    console.log('handleArtistWheel:', currentArtist);
    
    // Build artist matches if not cached or artist changed
    if (this.currentArtist !== currentArtist || this.artistMatches.length === 0) {
      this.buildArtistMatches(currentArtist);
      this.currentArtist = currentArtist;
    }
    
    console.log('artistMatches:', this.artistMatches);
    
    if (this.artistMatches.length === 0) return;
    
    // Wheel down = next, wheel up = previous
    const direction = e.deltaY > 0 ? 1 : -1;
    this.currentArtistIndex = (this.currentArtistIndex + direction + this.artistMatches.length) % this.artistMatches.length;
    
    // Apply match
    const artist = this.artistMatches[this.currentArtistIndex];
    console.log('Applying artist:', artist, 'at index:', this.currentArtistIndex);
    
    const html = `<span class="cmd-prefix">/music:</span> <span class="cmd-suggestion">${this.escapeHtml(artist)}</span>`;
    this.inlineInput.input.innerHTML = html;
    this.inlineInput.setCursorToEnd();
    
    // Trigger update
    if (this.updateCallback) {
      this.updateCallback();
    }
  }

  /**
   * Handle wheel on track part
   */
  handleTrackWheel(e, artist, currentTrack) {
    e.preventDefault();
    
    console.log('handleTrackWheel:', artist, currentTrack);
    
    // Build track matches if not cached or track changed
    if (this.currentArtist !== artist || this.trackMatches.length === 0) {
      this.buildTrackMatches(artist, currentTrack);
      this.currentArtist = artist;
    }
    
    console.log('trackMatches:', this.trackMatches);
    
    if (this.trackMatches.length === 0) return;
    
    // Wheel down = next, wheel up = previous
    const direction = e.deltaY > 0 ? 1 : -1;
    this.currentTrackIndex = (this.currentTrackIndex + direction + this.trackMatches.length) % this.trackMatches.length;
    
    // Apply match
    const track = this.trackMatches[this.currentTrackIndex];
    console.log('Applying track:', track, 'at index:', this.currentTrackIndex);
    
    const html = `<span class="cmd-prefix">/music:</span> <span class="cmd-suggestion">${this.escapeHtml(artist)} – ${this.escapeHtml(track)}</span>`;
    this.inlineInput.input.innerHTML = html;
    this.inlineInput.setCursorToEnd();
    
    // Update preview with new current track
    const newTarget = this.inlineInput.input.querySelector('.cmd-suggestion');
    if (newTarget) {
      this.trackPreview.show(this.trackMatches, this.currentTrackIndex, newTarget);
    }
    
    // Trigger update
    if (this.updateCallback) {
      this.updateCallback();
    }
  }

  /**
   * Show preview for current state
   */
  showPreview(target, mouseEvent) {
    const text = this.inlineInput.getPlainText();
    const colonIndex = text.indexOf(':');
    if (colonIndex === -1) return;
    
    const fullQuery = text.substring(colonIndex + 1).trim();
    const dashIndex = fullQuery.indexOf(' – ');
    
    if (dashIndex !== -1) {
      // Has track - check if mouse is over track part
      const spanText = target.textContent;
      const dashTextIndex = spanText.indexOf(' – ');
      
      if (dashTextIndex === -1) return;
      
      // Get mouse position in text
      const range = document.caretRangeFromPoint(mouseEvent.clientX, mouseEvent.clientY);
      if (!range) return;
      
      let offset = 0;
      try {
        offset = range.startOffset;
      } catch (e) {
        return;
      }
      
      // Only show preview if mouse is over track part (after " – ")
      if (offset > dashTextIndex + 3) {
        const artistPart = fullQuery.substring(0, dashIndex);
        const trackPart = fullQuery.substring(dashIndex + 3);
        
        // Rebuild track matches if artist changed
        if (this.currentArtist !== artistPart || this.trackMatches.length === 0) {
          this.buildTrackMatches(artistPart, trackPart);
          this.currentArtist = artistPart;
        }
        
        if (trackPart && this.trackMatches.length > 0) {
          this.trackPreview.show(this.trackMatches, this.currentTrackIndex, target);
        }
      } else {
        // Mouse over artist - hide preview
        this.trackPreview.hide();
      }
    }
  }

  /**
   * Build list of matching artists
   */
  buildArtistMatches(query) {
    const lowerQuery = query.toLowerCase();
    this.artistMatches = this.inlineInput.musicData
      .map(item => item.artist)
      .filter(artist => artist.toLowerCase().startsWith(lowerQuery));
    
    // Set index to exact match if exists, otherwise 0
    this.currentArtistIndex = this.artistMatches.findIndex(
      artist => artist.toLowerCase() === lowerQuery
    );
    if (this.currentArtistIndex === -1) {
      this.currentArtistIndex = 0;
    }
  }

  /**
   * Build list of matching tracks for artist
   */
  buildTrackMatches(artist, query) {
    const artistData = this.inlineInput.musicData.find(
      item => item.artist.toLowerCase() === artist.toLowerCase()
    );
    
    if (!artistData) {
      this.trackMatches = [];
      return;
    }
    
    // Take ALL tracks for this artist (not filtered by query)
    this.trackMatches = artistData.tracks;
    
    // Set index to current track if it exists
    const lowerQuery = query.toLowerCase();
    this.currentTrackIndex = this.trackMatches.findIndex(
      track => track.toLowerCase() === lowerQuery
    );
    if (this.currentTrackIndex === -1) {
      this.currentTrackIndex = 0;
    }
    
    console.log('buildTrackMatches result:', {
      artist,
      query,
      totalTracks: this.trackMatches.length,
      currentIndex: this.currentTrackIndex
    });
  }

  /**
   * Reset state
   */
  reset() {
    this.artistMatches = [];
    this.trackMatches = [];
    this.currentArtistIndex = 0;
    this.currentTrackIndex = 0;
    this.currentArtist = null;
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
}
