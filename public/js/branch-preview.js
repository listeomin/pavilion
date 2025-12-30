// public/js/branch-preview.js
export function renderBranchPreview(metadata) {
  if (!metadata || metadata.type !== 'branch') {
    return '';
  }

  const { title, url } = metadata;

  return `
    <a href="${escapeHtml(url)}" class="nest-preview-card branch-preview-card">
      <div class="nest-preview-badge">ВЕТКА</div>
      <div class="nest-preview-content">
        <div class="nest-preview-emoji">🍃</div>
        <div class="nest-preview-title">${escapeHtml(title)}</div>
      </div>
    </a>
  `;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
