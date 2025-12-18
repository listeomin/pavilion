// public/js/markdown.js
export function escapeHtml(s) {
  return s.replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[m]));
}

export function parseMarkdown(text) {
  const urlPlaceholders = [];
  const urlRegex = /(https?:\/\/[^\s<>"]+)/gi;
  let processed = text.replace(urlRegex, (url) => {
    const idx = urlPlaceholders.length;
    urlPlaceholders.push(url);
    return `__URL_${idx}__`;
  });

  processed = processed.replace(/`([^`]+)`/g, '<code>$1</code>');
  processed = processed.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  processed = processed.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  processed = processed.replace(/\b_([^_]+)_\b/g, '<em>$1</em>');
  
  // Convert URLs to clickable links
  processed = processed.replace(/__URL_(\d+)__/g, (_, idx) => {
    const url = urlPlaceholders[parseInt(idx)];
    return `<a href="${url}" target="_blank" style="color: #000; text-decoration: none;">${url}</a>`;
  });

  return processed;
}

export function linkifyImages(text) {
  const imageRegex = /(https?:\/\/[^\s<>"]+\.(?:png|jpg|jpeg|gif|webp)(?:\?[^\s<>"]*)?)/gi;
  return text.replace(imageRegex, (url) => {
    const fixedUrl = url.replace(/^http:\/\/hhrrr\.ru/, 'https://hhrrr.ru');
    const escapedUrl = fixedUrl.replace(/"/g, '&quot;');
    return `<img src="${escapedUrl}" 
                 style="width: 60%; max-height: 600px; object-fit: cover; margin: 8px 0 8px 3px; display: block; box-shadow: 0 0 0 1.5px rgba(0,0,0,.2); pointer-events: none;"
                 onerror="this.outerHTML='<a href=&quot;${escapedUrl}&quot; target=&quot;_blank&quot;>${escapedUrl}</a>'"
                 loading="lazy" />`;
  });
}
