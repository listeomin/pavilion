// public/js/music.js
import { initAudioPlayer } from './audio-player.js?v=3';

export function renderMusicPlayer(metadata) {
  if (!metadata || metadata.type !== 'music') return '';
  
  const artist = metadata.artist || '';
  const track = metadata.track || '';
  const audioUrl = metadata.audioUrl || '';
  
  const playerHtml = `
    <div style="position: relative;">
      <div class="audio-play-btn" style="position: absolute; left: 0; top: 50%; transform: translateY(-50%); width: 32px; height: 32px; background: #BDBCE4; border-radius: 50%; cursor: pointer; z-index: 1;"></div>
      <div class="audio-player" data-audio-url="${escapeHtml(audioUrl)}">
        <div class="audio-info">
          <div class="audio-artist">${escapeHtml(artist)}</div>
          ${track ? `<div class="audio-track">${escapeHtml(track)}</div>` : ''}
        </div>
        <div class="audio-time">00:00</div>
        <div class="audio-progress-container">
          <div class="audio-progress-bar"></div>
        </div>
        <div class="audio-tooltip">Состояние плеера</div>
      </div>
    </div>
  `;
  
  // Init player after element is added to DOM
  setTimeout(() => {
    const wrappers = document.querySelectorAll('[style*="position: relative"] .audio-player[data-audio-url]');
    wrappers.forEach(playerEl => {
      if (!playerEl.dataset.initialized) {
        const wrapper = playerEl.parentElement;
        const playBtn = wrapper.querySelector('.audio-play-btn');
        const url = playerEl.dataset.audioUrl;
        
        if (url && playBtn) {
          const playerInstance = initAudioPlayer(playerEl, url, metadata, playBtn);
          playerEl.dataset.initialized = 'true';
        }
      }
    });
  }, 0);
  
  return playerHtml;
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}
