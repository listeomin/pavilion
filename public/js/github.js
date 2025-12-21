// public/js/github.js
export function renderGitHubPreview(metadata) {
  if (!metadata || metadata.type !== 'github') {
    return '';
  }

  const { owner, repo, description, language, stars, forks, avatar, url } = metadata;
  
  const languageHtml = language 
    ? `<span style="margin-right: 12px; color: #666; font-size: 14px;">${language}</span>` 
    : '';
  
  const avatarHtml = avatar 
    ? `<img src="${avatar}" style="width: 48px; height: 48px; border-radius: 4px; margin-right: 12px;" />` 
    : '';

  return `
    <div style="
      margin: 8px 0 8px 3px;
      padding: 16px;
      border: 1px solid rgba(0,0,0,0.1);
      border-radius: 6px;
      background: #fafafa;
      max-width: 540px;
      box-sizing: border-box;
    ">
      <div style="display: flex; align-items: center; margin-bottom: 8px;">
        ${avatarHtml}
        <div>
          <div style="font-family: Ubuntu Mono, monospace; font-size: 16px; font-weight: 600; color: #000;">
            ${owner}/${repo}
          </div>
          <a href="${url}" target="_blank" style="font-size: 13px; color: #666; text-decoration: none;">
            github.com
          </a>
        </div>
      </div>
      ${description ? `<div style="font-size: 14px; color: #444; margin-bottom: 8px; line-height: 1.4;">${escapeHtml(description)}</div>` : ''}
      <div style="display: flex; align-items: center; font-size: 14px; color: #666;">
        ${languageHtml}
        <span style="margin-right: 12px;">★ ${stars}</span>
        <span>⑂ ${forks}</span>
      </div>
    </div>
  `;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
