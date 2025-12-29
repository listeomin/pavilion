// public/js/nest-preview.js
export function renderNestPreview(metadata) {
  if (!metadata || metadata.type !== 'nest') {
    return '';
  }

  const { emoji, title, url } = metadata;

  return `
    <a href="${escapeHtml(url)}" target="_blank" class="nest-preview-card">
      <div class="nest-preview-badge">ГНЕЗДО</div>
      <div class="nest-preview-content">
        <div class="nest-preview-emoji">${emoji}</div>
        <div class="nest-preview-title">${escapeHtml(title)}</div>
      </div>
    </a>
  `;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
