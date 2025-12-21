// public/js/quotes.js

export function initQuoteHandlers(editor) {
  // Handle clicks on message authors to insert quote tag
  document.addEventListener('click', (e) => {
    const meta = e.target.closest('.meta-clickable');
    if (meta) {
      const messageEl = meta.closest('.msg');
      if (!messageEl) return;
      
      const messageId = messageEl.dataset.messageId;
      const author = messageEl.dataset.author;
      
      // Get message text (excluding meta)
      const textEl = messageEl.querySelector('span:not(.meta)');
      const text = textEl ? textEl.textContent.trim() : '';
      
      if (editor && messageId && author) {
        editor.insertQuoteTag({
          messageId,
          author,
          text
        });
      }
      return;
    }
    
    // Handle clicks on quote author to scroll to message
    const quoteAuthor = e.target.closest('.quote-author[data-target-message]');
    if (quoteAuthor) {
      const targetId = quoteAuthor.dataset.targetMessage;
      const targetMsg = document.querySelector(`.msg[data-message-id="${targetId}"]`);
      
      if (targetMsg) {
        targetMsg.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Flash highlight without changing layout
        targetMsg.style.transition = 'background-color 0.2s ease, border-radius 0.2s ease';
        targetMsg.style.backgroundColor = 'rgba(152, 193, 94, 0.2)'; // cactus color
        targetMsg.style.borderRadius = '8px';
        
        setTimeout(() => {
          targetMsg.style.transition = 'background-color 0.5s ease, border-radius 0.5s ease';
          targetMsg.style.backgroundColor = '';
          targetMsg.style.borderRadius = '';
        }, 1000);
      }
    }
  });
}

export function extractQuoteData(inputEl) {
  const quoteTags = inputEl.querySelectorAll('.quote-tag');
  if (quoteTags.length === 0) return null;
  
  const quotes = [];
  quoteTags.forEach(tag => {
    quotes.push({
      messageId: tag.dataset.messageId || null,
      author: tag.dataset.author || null,
      text: tag.dataset.text || ''
    });
  });
  
  return quotes.length > 0 ? quotes : null;
}
