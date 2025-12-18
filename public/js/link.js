// public/js/link.js
export function renderLinkPreview(metadata) {
  if (!metadata || metadata.type !== 'link') {
    return '';
  }

  const { title, url } = metadata;

  return `<a href="${escapeHtml(url)}" target="_blank" style="
    color: #5A57D9;
    text-decoration: none;
    font-family: Georgia, serif;
  " title="${escapeHtml(url)}">${escapeHtml(title)}</a>`;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
