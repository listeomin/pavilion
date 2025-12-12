// public/js/music.js

export function renderMusicPlayer(metadata) {
  if (!metadata || metadata.type !== 'music') return '';
  
  const artist = metadata.artist || '';
  const track = metadata.track || '';
  
  // Пока простой плейсхолдер, позже добавим реальный плеер
  return `
    <div class="music-player">
      <div class="music-info">
        <div class="music-artist">${escapeHtml(artist)}</div>
        ${track ? `<div class="music-track">${escapeHtml(track)}</div>` : ''}
      </div>
      <div class="music-controls">
        <button class="music-play" disabled>▶</button>
      </div>
    </div>
  `;
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
