// nest.js - инициализация страницы Гнездо без чата
import { CONFIG } from './config.js?v=7';
import { getCookie, apiInit, apiChangeName } from './api.js?v=7';
import * as NightShift from './nightshift.js?v=1';
import { AnimalProfile } from './animalProfile.js?v=18';
import { TelegramAuth } from './telegramAuth.js?v=2';
import { renderGitHubPreview } from './github.js?v=5';
import { parseYouTubeUrl } from './youtube.js?v=2';
import { renderMusicPlayer } from './music.js?v=6';
import { initImageZoom, makeImageZoomable } from './image-zoom.js?v=2';

// Tiptap imports from CDN
import { Editor } from 'https://esm.sh/@tiptap/core@2.1.13';
import StarterKit from 'https://esm.sh/@tiptap/starter-kit@2.1.13';
import Link from 'https://esm.sh/@tiptap/extension-link@2.1.13';
import Image from 'https://esm.sh/@tiptap/extension-image@2.1.13';
import Placeholder from 'https://esm.sh/@tiptap/extension-placeholder@2.1.13';

// Suppress YouTube postMessage errors globally
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

// Remove no-js class immediately (JavaScript is available)
document.body.classList.remove('no-js');

// Hide static content (for SEO/Instant View only)
const staticContent = document.getElementById('nest-static-content');
if (staticContent) {
  staticContent.style.display = 'none';
}

// Function to hide skeleton loading screen
function hideSkeleton() {
  const skeletonContainer = document.getElementById('skeleton-content');
  if (!skeletonContainer) return;

  // Fade out skeleton
  const skeletonBlocks = skeletonContainer.querySelectorAll('.skeleton-content-block');
  skeletonBlocks.forEach(block => block.classList.add('fade-out'));

  // Remove skeleton-active class and delete skeleton after animation
  setTimeout(() => {
    document.body.classList.remove('skeleton-active');
    if (skeletonContainer.parentNode) {
      skeletonContainer.parentNode.removeChild(skeletonContainer);
    }
    // Realign user header after skeleton is removed and layout has settled
    requestAnimationFrame(() => {
      setTimeout(alignUserHeader, 100);
    });
  }, 300);
}

// Function to align user header to the right edge of the title
function alignUserHeader() {
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

(async function () {
  const API = CONFIG.API_PATH;
  const COOKIE_NAME = 'chat_session_id';
  let sessionId = getCookie(COOKIE_NAME) || null;
  const userEmojiEl = document.getElementById('user-emoji');

  // Инициализация NightShift
  NightShift.init();

  // Инициализация API чтобы получить session_id и emoji
  const data = await apiInit(API, sessionId, COOKIE_NAME);
  sessionId = data.session_id;
  const myName = data.name;
  const emoji = myName.split(' ')[0];

  if (userEmojiEl) {
    userEmojiEl.textContent = emoji;
  }

  // Align user header after content loads
  // Use multiple strategies to ensure alignment happens after layout is stable
  const doAlign = () => {
    requestAnimationFrame(() => {
      alignUserHeader();
    });
  };

  // Check if skeleton is active - if yes, wait for it to be removed
  const hasSkeleton = document.body.classList.contains('skeleton-active');

  if (!hasSkeleton) {
    // No skeleton - use multiple strategies to ensure alignment

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
  }
  // If skeleton is active, alignment will happen in hideSkeleton()

  window.addEventListener('resize', alignUserHeader);

  // Handle emoji click for changing animal
  if (userEmojiEl) {
    userEmojiEl.addEventListener('click', async () => {
    userEmojiEl.classList.add('user-emoji-fade');
   
    setTimeout(async () => {
      const data = await apiChangeName(API, sessionId);
      if (data && data.name) {
        const emoji = data.name.split(' ')[0];
       
        // Check if this animal has a saved profile
        let finalName = data.name;
        if (animalProfile) {
          const savedProfile = await animalProfile.fetchProfile(emoji);
          if (savedProfile && savedProfile.kind) {
            // Use saved custom name
            finalName = emoji + ' ' + savedProfile.kind;
          }
        }
       
        userEmojiEl.textContent = emoji;
        userEmojiEl.classList.remove('user-emoji-fade');
       
        // Update animal profile with new emoji
        if (animalProfile) {
          animalProfile.updateCurrentEmoji(emoji);
        }
        
        // Realign header after emoji change
        setTimeout(alignUserHeader, 0);
      }
    }, 250);
    });
  }

  // Инициализация AnimalProfile
  const animalProfile = new AnimalProfile(sessionId, emoji, (newName) => {
    const newEmoji = newName.split(' ')[0];
    if (userEmojiEl) {
      userEmojiEl.textContent = newEmoji;
    }
  });
  await animalProfile.init();

  // Check nest configuration from PHP
  const nestConfig = window.NEST_CONFIG || {};

  // Инициализация Telegram Auth
  const telegramAuth = new TelegramAuth();

  const authData = await telegramAuth.checkAuth();

  // Show Telegram auth button ONLY on /nest (not on personal pages /nest/{username})
  if (!nestConfig.urlUsername) {
    // We're on /nest page (not personal page)
    if (authData && authData.telegram_id) {
      const savedProfile = await animalProfile.loadAndApplyUserProfile();

      if (savedProfile) {
        userEmojiEl.textContent = savedProfile.emoji;
      }

      // Show logout button
      const container = document.getElementById('telegram-auth-container');
      if (container) {
        const displayName = authData.telegram_username || authData.first_name || 'Telegram User';
        const btn = document.createElement('button');
        btn.className = 'my-chat-button';
        btn.textContent = displayName + ' (выйти)';
        btn.onclick = function() {
          telegramAuth.logout();
        };
        container.appendChild(btn);
      }

      // Show logout button in profile
      animalProfile.showLogoutButton();
    } else {
      // Show login widget
      telegramAuth.init('telegram-auth-container', 'hhrrrp_bot', async (newAuthData) => {
        // Reload page - PHP will redirect to /nest/{user_id}
        location.reload();
      });
    }
  } else {
    // We're on /nest/{user_id} page

    // Load profile for authorized users
    if (authData && authData.telegram_id) {
      const savedProfile = await animalProfile.loadAndApplyUserProfile();
      if (savedProfile && userEmojiEl) {
        userEmojiEl.textContent = savedProfile.emoji;
      }

      // Show logout button ONLY on own nest
      if (nestConfig.isOwnNest) {
        animalProfile.showLogoutButton();
      }
    }

    // Hide telegram-auth-container on personal pages
    const container = document.getElementById('telegram-auth-container');
    if (container) {
      container.style.display = 'none';
    }
  }

  // Кнопка профиля
  const profileBtn = document.getElementById('animal-profile-btn');
  if (profileBtn) {
    profileBtn.addEventListener('click', () => {
      animalProfile.open();
    });
  }

  // Inline editing of nest title (only in own nest)
  const h1 = document.querySelector('h1');
  if (h1 && nestConfig.isOwnNest) {
    let originalText = '';
    let isEditing = false;

    h1.style.cursor = 'pointer';
    h1.title = 'Кликните чтобы изменить имя';

    // Save function
    const saveName = async () => {
      if (!isEditing) return;

      const editableSpan = h1.querySelector('.editable-name');
      const newName = editableSpan ? editableSpan.textContent.trim() : '';

      // Validate length
      if (newName.length > 45) {
        alert('Имя слишком длинное! Максимум 45 символов.');
        return false;
      }

      if (newName.length === 0) {
        alert('Имя не может быть пустым!');
        return false;
      }

      // If unchanged, just exit
      if (newName === originalText) {
        const emoji = h1.textContent.split(' ')[0];
        h1.contentEditable = 'false';
        h1.textContent = emoji + ' ' + newName;
        isEditing = false;
        return true;
      }

      // Save to server
      try {
        const response = await fetch(CONFIG.BASE_PATH + '/api/update_nest_name.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newName })
        });

        const text = await response.text();

        let result;
        try {
          result = JSON.parse(text);
        } catch (parseErr) {
          console.error('[Nest] JSON parse error:', parseErr);
          alert('Ошибка: сервер вернул некорректный ответ');
          return false;
        }

        if (result.success) {
          // Update display
          const emoji = h1.textContent.split(' ')[0];
          h1.contentEditable = 'false';
          h1.textContent = emoji + ' ' + newName;
          isEditing = false;

          // Update page title
          document.title = 'Гнездо ' + emoji + ' ' + newName;
          return true;
        } else {
          console.error('[Nest] Server error:', result.error);
          alert('Ошибка: ' + (result.error || 'Не удалось сохранить'));
          return false;
        }
      } catch (err) {
        console.error('[Nest] Network error:', err);
        alert('Ошибка сети: ' + err.message);
        return false;
      }
    };

    h1.addEventListener('click', () => {
      if (isEditing) return;

      // Get current text (without emoji)
      const fullText = h1.textContent;
      const parts = fullText.split(' ');
      const nameWithoutEmoji = parts.slice(1).join(' '); // Skip emoji

      originalText = nameWithoutEmoji;
      isEditing = true;

      // Make editable
      h1.contentEditable = 'true';
      h1.innerHTML = parts[0] + ' <span class="editable-name">' + nameWithoutEmoji + '</span>';

      // Focus on editable part
      const editableSpan = h1.querySelector('.editable-name');
      if (editableSpan) {
        editableSpan.focus();
        // Select text
        const range = document.createRange();
        range.selectNodeContents(editableSpan);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      }
    });

    h1.addEventListener('keydown', async (e) => {
      if (!isEditing) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        await saveName();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        // Cancel editing
        h1.contentEditable = 'false';
        h1.textContent = h1.textContent.split(' ')[0] + ' ' + originalText;
        isEditing = false;
      }
    });

    // Handle blur (click outside) - save instead of cancel
    h1.addEventListener('blur', async () => {
      if (isEditing) {
        const saved = await saveName();
        if (!saved) {
          // If save failed, restore original
          h1.contentEditable = 'false';
          h1.textContent = h1.textContent.split(' ')[0] + ' ' + originalText;
          isEditing = false;
        }
      }
    });
  }

  // Global hotkey: "/" to go to Мурмурация page
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const activeElement = document.activeElement;
      const isInInput = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.contentEditable === 'true'
      );

      if (!isInInput) {
        e.preventDefault();
        window.location.href = './';
      }
    }
  });

  // Tiptap editor for Nest content
  const editorContainer = document.getElementById('nest-editor');
  if (editorContainer && nestConfig.urlUsername) {

    let editor;
    let saveTimeout = null;
    let isSaving = false;

    // Create toolbar
    const createToolbar = () => {
      const toolbar = document.createElement('div');
      toolbar.className = 'tiptap-toolbar';
      toolbar.innerHTML = `
        <button type="button" class="tiptap-toolbar-button" data-action="bold" title="Жирный">Bold</button>
        <button type="button" class="tiptap-toolbar-button" data-action="italic" title="Курсив">Italic</button>
        <button type="button" class="tiptap-toolbar-button" data-action="h1" title="Заголовок 1">H1</button>
        <button type="button" class="tiptap-toolbar-button" data-action="h2" title="Заголовок 2">H2</button>
        <button type="button" class="tiptap-toolbar-button" data-action="h3" title="Заголовок 3">H3</button>
        <button type="button" class="tiptap-toolbar-button" data-action="bulletList" title="Список">• List</button>
        <button type="button" class="tiptap-toolbar-button" data-action="orderedList" title="Нумерованный список">1. List</button>
        <button type="button" class="tiptap-toolbar-button" data-action="code" title="Код">Code</button>
        <button type="button" class="tiptap-toolbar-button" data-action="codeBlock" title="Блок кода">Code Block</button>
        <button type="button" class="tiptap-toolbar-button" data-action="link" title="Ссылка">Link</button>
        <button type="button" class="tiptap-toolbar-button" data-action="image" title="Изображение">Image</button>
      `;
      return toolbar;
    };

    // Configure Tiptap
    const initEditor = async (initialContent = '') => {
      // Create wrapper for editor
      const wrapper = document.createElement('div');
      wrapper.className = 'tiptap-editor-wrapper';

      // Add toolbar if editable
      if (nestConfig.isOwnNest) {
        const toolbar = createToolbar();
        wrapper.appendChild(toolbar);
      }

      // Create editor element
      const editorEl = document.createElement('div');
      editorEl.id = 'tiptap-content';
      wrapper.appendChild(editorEl);

      editorContainer.appendChild(wrapper);

      // Initialize Tiptap
      editor = new Editor({
        element: editorEl,
        extensions: [
          StarterKit,
          Link.configure({
            openOnClick: false,
            HTMLAttributes: {
              class: 'tiptap-link',
            },
          }),
          Image.configure({
            HTMLAttributes: {
              class: 'tiptap-image',
            },
          }),
          Placeholder.configure({
            placeholder: nestConfig.isOwnNest ? 'Начните печатать...' : '',
          }),
        ],
        content: initialContent,
        editable: nestConfig.isOwnNest,
        onUpdate: ({ editor }) => {
          if (!nestConfig.isOwnNest) return;

          // Debounced autosave
          if (saveTimeout) {
            clearTimeout(saveTimeout);
          }

          saveTimeout = setTimeout(async () => {
            await saveContent();
          }, 2000);
        },
      });

      // Setup toolbar buttons
      if (nestConfig.isOwnNest) {
        setupToolbar();
      }

      // Enable image zoom in read-only mode
      if (!nestConfig.isOwnNest) {
        initImageZoom();
        setTimeout(() => {
          const editorImages = document.querySelectorAll('#nest-editor img');
          editorImages.forEach(img => {
            if (!img.classList.contains('zoomable-image')) {
              makeImageZoomable(img);
            }
          });
        }, 100);
      }
    };

    // Setup toolbar button handlers
    const setupToolbar = () => {
      const toolbar = document.querySelector('.tiptap-toolbar');
      if (!toolbar) return;

      toolbar.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const action = btn.dataset.action;

          switch (action) {
            case 'bold':
              editor.chain().focus().toggleBold().run();
              break;
            case 'italic':
              editor.chain().focus().toggleItalic().run();
              break;
            case 'h1':
              editor.chain().focus().toggleHeading({ level: 1 }).run();
              break;
            case 'h2':
              editor.chain().focus().toggleHeading({ level: 2 }).run();
              break;
            case 'h3':
              editor.chain().focus().toggleHeading({ level: 3 }).run();
              break;
            case 'bulletList':
              editor.chain().focus().toggleBulletList().run();
              break;
            case 'orderedList':
              editor.chain().focus().toggleOrderedList().run();
              break;
            case 'code':
              editor.chain().focus().toggleCode().run();
              break;
            case 'codeBlock':
              editor.chain().focus().toggleCodeBlock().run();
              break;
            case 'link':
              const url = prompt('Enter URL:');
              if (url) {
                editor.chain().focus().setLink({ href: url }).run();
              }
              break;
            case 'image':
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'image/*';
              input.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                try {
                  const formData = new FormData();
                  formData.append('image', file);

                  const response = await fetch(CONFIG.BASE_PATH + '/api/upload_image.php', {
                    method: 'POST',
                    body: formData
                  });

                  const result = await response.json();

                  if (result.success && result.file && result.file.url) {
                    editor.chain().focus().setImage({ src: result.file.url }).run();
                  } else {
                    alert('Ошибка загрузки изображения');
                  }
                } catch (err) {
                  console.error('[Nest] Error uploading image:', err);
                  alert('Ошибка: ' + err.message);
                }
              };
              input.click();
              break;
          }
        });
      });

      // Update active states
      editor.on('selectionUpdate', () => {
        toolbar.querySelectorAll('button').forEach(btn => {
          const action = btn.dataset.action;
          let isActive = false;

          switch (action) {
            case 'bold':
              isActive = editor.isActive('bold');
              break;
            case 'italic':
              isActive = editor.isActive('italic');
              break;
            case 'h1':
              isActive = editor.isActive('heading', { level: 1 });
              break;
            case 'h2':
              isActive = editor.isActive('heading', { level: 2 });
              break;
            case 'h3':
              isActive = editor.isActive('heading', { level: 3 });
              break;
            case 'bulletList':
              isActive = editor.isActive('bulletList');
              break;
            case 'orderedList':
              isActive = editor.isActive('orderedList');
              break;
            case 'code':
              isActive = editor.isActive('code');
              break;
            case 'codeBlock':
              isActive = editor.isActive('codeBlock');
              break;
            case 'link':
              isActive = editor.isActive('link');
              break;
          }

          if (isActive) {
            btn.classList.add('is-active');
          } else {
            btn.classList.remove('is-active');
          }
        });
      });
    };

    // Load content from server
    const loadContent = async () => {
      try {
        const url = nestConfig.urlUsername
          ? CONFIG.BASE_PATH + '/api/nest_content.php?action=get&username=' + encodeURIComponent(nestConfig.urlUsername)
          : CONFIG.BASE_PATH + '/api/nest_content.php?action=get';
        const response = await fetch(url);
        const result = await response.json();

        let htmlContent = '';

        if (result.success && result.content) {
          // Check if content is Editor.js JSON format (has blocks property)
          if (result.content.blocks) {
            // Convert Editor.js blocks to HTML
            htmlContent = convertEditorJsToHtml(result.content);
          } else if (typeof result.content === 'string') {
            // Already HTML
            htmlContent = result.content;
          }
        }

        await initEditor(htmlContent);
        hideSkeleton();
      } catch (err) {
        console.error('[Nest] Error loading content:', err);
        await initEditor('');
        hideSkeleton();
      }
    };

    // Convert Editor.js JSON to HTML for Tiptap
    const convertEditorJsToHtml = (data) => {
      if (!data || !data.blocks) return '';

      let html = '';
      data.blocks.forEach(block => {
        const text = block.data?.text || '';

        switch (block.type) {
          case 'header':
            const level = block.data?.level || 2;
            html += `<h${level}>${text}</h${level}>`;
            break;
          case 'paragraph':
            html += `<p>${text}</p>`;
            break;
          case 'list':
            const items = block.data?.items || [];
            const tag = block.data?.style === 'ordered' ? 'ol' : 'ul';
            html += `<${tag}>`;
            items.forEach(item => {
              html += `<li>${item}</li>`;
            });
            html += `</${tag}>`;
            break;
          case 'quote':
            html += `<blockquote>${text}</blockquote>`;
            break;
          case 'code':
            const code = block.data?.code || '';
            html += `<pre><code>${code}</code></pre>`;
            break;
          case 'image':
            const url = block.data?.file?.url || '';
            if (url) {
              html += `<img src="${url}" alt="" />`;
            }
            break;
          case 'delimiter':
            html += '<hr />';
            break;
          default:
            html += `<p>${text}</p>`;
        }
      });

      return html;
    };

    // Save content to server
    const saveContent = async () => {
      if (isSaving || !editor) return;

      isSaving = true;

      try {
        const htmlContent = editor.getHTML();
        const response = await fetch(CONFIG.BASE_PATH + '/api/nest_content.php?action=save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: htmlContent,
            target_username: nestConfig.urlUsername
          })
        });

        const result = await response.json();

        if (!result.success) {
          console.error('[Nest] Save error:', result.error);
        }
      } catch (err) {
        console.error('[Nest] Save error:', err);
      } finally {
        isSaving = false;
      }
    };

    // Initialize editor with content
    loadContent();

  }

  // Render GitHub preview for developer page
  const githubPreviewContainer = document.getElementById('github-preview-container');
  if (githubPreviewContainer) {
    const url = githubPreviewContainer.dataset.url;
    if (url) {
      // Parse owner/repo from URL
      const match = url.match(/github\.com\/([^\/]+)\/([^\/\s?#]+)/i);
      if (match) {
        const owner = match[1];
        const repo = match[2];

        // Fetch GitHub repo metadata
        fetch(`https://api.github.com/repos/${owner}/${repo}`)
          .then(res => res.json())
          .then(data => {
            const metadata = {
              type: 'github',
              owner: data.owner.login,
              repo: data.name,
              description: data.description,
              language: data.language,
              stars: data.stargazers_count,
              forks: data.forks_count,
              avatar: data.owner.avatar_url,
              url: data.html_url
            };

            githubPreviewContainer.innerHTML = renderGitHubPreview(metadata);
          })
          .catch(err => {
            console.error('[Nest] Error loading GitHub preview:', err);
            githubPreviewContainer.innerHTML = `<a href="${url}" target="_blank" style="color: var(--color-iris);">${url}</a>`;
          });
      }
    }
  }
})();
