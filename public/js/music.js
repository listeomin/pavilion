// public/js/music.js
import { initAudioPlayer } from './audio-player.js?v=3';

export function renderMusicPlayer(metadata) {
  if (!metadata || metadata.type !== 'music') return '';
  
  const artist = metadata.artist || '';
  const track = metadata.track || '';
  const audioUrl = metadata.audioUrl || '';
  
  const playerHtml = `
    <div style="position: relative;">
      <div class="audio-play-btn" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); width: 32px; height: 32px; background: #BDBCE4; border-radius: 50%; cursor: pointer; z-index: 1;">
        <svg class="play-icon" width="10" height="12" viewBox="0 0 10 12" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 0.490714V11.5057C0.00163266 11.5936 0.026412 11.6795 0.0718393 11.7548C0.117267 11.8301 0.181736 11.892 0.258747 11.9344C0.335758 11.9768 0.422588 11.9982 0.510481 11.9963C0.598375 11.9945 0.684225 11.9695 0.759375 11.9238L9.76437 6.41634C9.83631 6.3728 9.89579 6.31145 9.93707 6.2382C9.97836 6.16495 10 6.08229 10 5.99821C10 5.91413 9.97836 5.83148 9.93707 5.75823C9.89579 5.68498 9.83631 5.62363 9.76437 5.58009L0.759375 0.0725893C0.684225 0.0269691 0.598375 0.00196974 0.510481 0.000111708C0.422588 -0.00174633 0.335758 0.0196028 0.258747 0.0620064C0.181736 0.10441 0.117267 0.166369 0.0718393 0.241635C0.026412 0.316902 0.00163266 0.402816 0 0.490714Z" fill="#FAF9F5"/>
        </svg>
        <svg class="pause-icon" width="11" height="12" viewBox="0 0 11 12" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M11 1V11C11 11.2652 10.8946 11.5196 10.7071 11.7071C10.5196 11.8946 10.2652 12 10 12H7.5C7.23478 12 6.98043 11.8946 6.79289 11.7071C6.60536 11.5196 6.5 11.2652 6.5 11V1C6.5 0.734784 6.60536 0.48043 6.79289 0.292893C6.98043 0.105357 7.23478 0 7.5 0H10C10.2652 0 10.5196 0.105357 10.7071 0.292893C10.8946 0.48043 11 0.734784 11 1ZM3.5 0H1C0.734784 0 0.48043 0.105357 0.292893 0.292893C0.105357 0.48043 0 0.734784 0 1V11C0 11.2652 0.105357 11.5196 0.292893 11.7071C0.48043 11.8946 0.734784 12 1 12H3.5C3.76522 12 4.01957 11.8946 4.20711 11.7071C4.39464 11.5196 4.5 11.2652 4.5 11V1C4.5 0.734784 4.39464 0.48043 4.20711 0.292893C4.01957 0.105357 3.76522 0 3.5 0Z" fill="#FAF9F5"/>
        </svg>
      </div>
      <div class="audio-player" data-audio-url="${escapeHtml(audioUrl)}">
        <div class="audio-info">
          <div class="audio-artist">${escapeHtml(artist)}</div>
          ${track ? `<div class="audio-track">${escapeHtml(track)}</div>` : ''}
        </div>
        <div class="audio-time">00:00</div>
        <a href="${escapeHtml(audioUrl)}" download class="audio-download-btn">Скачать</a>
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
