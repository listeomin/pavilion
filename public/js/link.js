// public/js/link.js
export function renderLinkPreview(metadata) {
  if (!metadata || metadata.type !== 'link') {
    return '';
  }

  const { domain, title, url } = metadata;
  const displayText = domain && title ? `${domain} | ${title}` : (title || url);

  return `<a href="${escapeHtml(url)}" target="_blank" style="
    color: #5A57D9;
    text-decoration: none;
    font-family: Georgia, serif;
  " title="${escapeHtml(url)}">${escapeHtml(displayText)}</a>`;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
