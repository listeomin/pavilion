/**
 * Track preview overlay
 * Shows 3 tracks before and after current track on hover
 */

export class TrackPreview {
  constructor() {
    this.container = null;
    this.visible = false;
  }

  /**
   * Create preview container if not exists
   */
  ensureContainer() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'track-preview';
      document.body.appendChild(this.container);
    }
  }

  /**
   * Show preview with tracks around current index
   */
  show(tracks, currentIndex, targetElement) {
    this.ensureContainer();
    
    // Calculate visible range: 3 before, current, 3 after (cyclic)
    const beforeTracks = [];
    const afterTracks = [];
    const totalTracks = tracks.length;
    
    for (let i = 1; i <= 3; i++) {
      // Cyclic index calculation
      const beforeIdx = (currentIndex - i + totalTracks) % totalTracks;
      const afterIdx = (currentIndex + i) % totalTracks;
      
      beforeTracks.unshift({
        text: tracks[beforeIdx],
        distance: i
      });
      
      afterTracks.push({
        text: tracks[afterIdx],
        distance: i
      });
    }
    
    // Build HTML
    let html = '';
    
    // Tracks before current (reversed, closest to current is last)
    beforeTracks.forEach(track => {
      html += `<div class="track-preview-item distance-${track.distance}">${this.escapeHtml(track.text)}</div>`;
    });
    
    // Current track - hidden with CSS
    html += `<div class="track-preview-item current hidden">${this.escapeHtml(tracks[currentIndex])}</div>`;
    
    // Tracks after current
    afterTracks.forEach(track => {
      html += `<div class="track-preview-item distance-${track.distance}">${this.escapeHtml(track.text)}</div>`;
    });
    
    this.container.innerHTML = html;
    
    // Position near target element
    this.position(targetElement, beforeTracks.length);
    
    this.visible = true;
  }

  /**
   * Position container relative to target
   */
  position(targetElement, beforeCount) {
    const rect = targetElement.getBoundingClientRect();
    
    // Find position of track part (after " – ")
    const text = targetElement.textContent;
    const dashIndex = text.indexOf(' – ');
    
    let leftOffset = rect.left;
    
    if (dashIndex !== -1) {
      // Create temporary span to measure artist part width
      const measureSpan = document.createElement('span');
      measureSpan.style.font = window.getComputedStyle(targetElement).font;
      measureSpan.style.visibility = 'hidden';
      measureSpan.style.position = 'absolute';
      measureSpan.textContent = text.substring(0, dashIndex + 3); // "Joy Division – "
      document.body.appendChild(measureSpan);
      
      const artistWidth = measureSpan.offsetWidth;
      document.body.removeChild(measureSpan);
      
      leftOffset = rect.left + artistWidth + 4; // +4px correction
    }
    
    // Calculate vertical offset: current track should align with target
    const targetStyles = window.getComputedStyle(targetElement);
    const fontSize = parseFloat(targetStyles.fontSize);
    const lineHeightRaw = targetStyles.lineHeight;
    
    console.log('DEBUG position:', {
      fontSize,
      lineHeightRaw,
      beforeCount,
      rectTop: rect.top,
      leftOffset
    });
    
    // lineHeight might be "normal" or a number
    let lineHeight;
    if (lineHeightRaw === 'normal' || isNaN(parseFloat(lineHeightRaw))) {
      lineHeight = fontSize * 1.4;
    } else {
      lineHeight = parseFloat(lineHeightRaw);
    }
    
    const topOffset = beforeCount * lineHeight + 16; // +16px correction
    
    console.log('Calculated:', { lineHeight, topOffset });
    
    this.container.style.left = `${leftOffset}px`;
    this.container.style.top = `${rect.top - topOffset}px`;
  }

  /**
   * Hide preview
   */
  hide() {
    if (this.container) {
      this.container.innerHTML = '';
      this.visible = false;
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
}
