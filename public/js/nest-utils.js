// nest-utils.js - Utility functions for nest page

// Tiptap modules loaded state
let tiptapLoaded = false;
let Editor, StarterKit, Link, Image, Placeholder;

/**
 * Log to server file instead of console
 */
export const logToServer = async (message, level = 'INFO') => {
  try {
    await fetch('server/api/log.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: `[Nest] ${message}`, level })
    });
  } catch (e) {
    // Silent fail - logging shouldn't break functionality
  }
};

/**
 * Align user header to the right edge of the title
 */
export function alignUserHeader() {
  const h1 = document.querySelector('h1');
  const userHeader = document.getElementById('user-header');

  if (!h1 || !userHeader) {
    return;
  }

  // Force a reflow to ensure layout is calculated
  h1.offsetHeight;

  const h1Rect = h1.getBoundingClientRect();
  const containerRect = h1.parentElement.getBoundingClientRect();
  const rightOffset = h1Rect.right - containerRect.left;
  const marginLeft = rightOffset - userHeader.offsetWidth;

  userHeader.style.marginLeft = marginLeft + 'px';
}

/**
 * Setup alignment with multiple strategies
 */
export function setupHeaderAlignment() {
  const doAlign = () => {
    requestAnimationFrame(() => {
      alignUserHeader();
    });
  };

  // Strategy 1: After fonts load
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      setTimeout(doAlign, 150);
    });
  }

  // Strategy 2: After DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(doAlign, 200);
    });
  } else {
    setTimeout(doAlign, 200);
  }

  // Strategy 3: After window load (images, etc.)
  window.addEventListener('load', () => {
    setTimeout(doAlign, 100);
  });

  // Strategy 4: Fallback with longer delay
  setTimeout(() => {
    doAlign();
  }, 500);

  window.addEventListener('resize', alignUserHeader);
}

/**
 * Load TipTap modules dynamically (only when needed for single post TipTap editor)
 */
export async function loadTipTap() {
  if (tiptapLoaded) {
    return { Editor, StarterKit, Link, Image, Placeholder };
  }

  console.log('[Nest] Loading TipTap modules...');
  const [editorModule, starterKitModule, linkModule, imageModule, placeholderModule] = await Promise.all([
    import('https://esm.sh/@tiptap/core@2.1.13'),
    import('https://esm.sh/@tiptap/starter-kit@2.1.13'),
    import('https://esm.sh/@tiptap/extension-link@2.1.13'),
    import('https://esm.sh/@tiptap/extension-image@2.1.13'),
    import('https://esm.sh/@tiptap/extension-placeholder@2.1.13')
  ]);

  Editor = editorModule.Editor;
  StarterKit = starterKitModule.default;
  Link = linkModule.default;
  Image = imageModule.default;
  Placeholder = placeholderModule.default;
  tiptapLoaded = true;
  console.log('[Nest] TipTap modules loaded');

  return { Editor, StarterKit, Link, Image, Placeholder };
}

/**
 * Suppress YouTube postMessage errors globally
 */
export function suppressYouTubeErrors() {
  const originalError = console.error.bind(console);
  console.error = (...args) => {
    const firstArg = args[0];
    if (firstArg && typeof firstArg === 'string') {
      if (firstArg.includes('postMessage') ||
          firstArg.includes('youtube.com') ||
          firstArg.includes('www-widgetapi')) {
        return;
      }
    }
    originalError(...args);
  };
}

/**
 * Capitalize first letter of string
 */
export function capitalize(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}
