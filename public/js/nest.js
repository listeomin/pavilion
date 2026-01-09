// nest.js - инициализация страницы Гнездо без чата
import { CONFIG } from './config.js?v=7';
import { getCookie, apiInit, apiChangeName } from './api.js?v=7';
import * as NightShift from './nightshift.js?v=1';
import { AnimalProfile } from './animalProfile.js?v=18';
import { TelegramAuth } from './telegramAuth.js?v=2';
import { renderGitHubPreview } from './github.js?v=5';
import { parseYouTubeUrl } from './youtube.js?v=2';
import { renderMusicPlayer } from './music.js?v=6';
import { initImageZoom, makeImageZoomable, watchForImages } from './image-zoom.js?v=11';
import { NestPostsManager } from './nest-posts-manager.js?v=22';

// Tiptap modules will be loaded dynamically when needed (only for single post view with TipTap editor)
// This prevents blocking the page load for list view
let Editor, StarterKit, Link, Image, Placeholder;
let tiptapLoaded = false;

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
console.log('[Nest] JavaScript starting at:', performance.now().toFixed(2), 'ms');
document.body.classList.remove('no-js');

// Hide static content (for SEO/Instant View only)
const staticContent = document.getElementById('nest-static-content');
if (staticContent) {
  staticContent.style.display = 'none';
}

// Function to hide skeleton loading screen
let skeletonHidden = false;
function hideSkeleton() {
  if (skeletonHidden) return;
  skeletonHidden = true;

  const skeletonContainer = document.getElementById('skeleton-content');
  if (!skeletonContainer) return;

  // Fade out skeleton
  skeletonContainer.classList.add('fade-out');

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

// Fallback: force hide skeleton after 2 seconds if not hidden yet
setTimeout(() => {
  if (!skeletonHidden) {
    console.warn('[Nest] Skeleton timeout - forcing hide');
    hideSkeleton();
  }
}, 2000);

// Load TipTap modules dynamically (only when needed for single post TipTap editor)
async function loadTipTap() {
  if (tiptapLoaded) return;

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
  let postsManager = null; // Global postsManager instance for filtering
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
        <div class="tiptap-toolbar-group">
          <button type="button" class="tiptap-toolbar-button" data-action="bold" title="Bold (Ctrl+B)">B</button>
          <button type="button" class="tiptap-toolbar-button" data-action="italic" title="Italic (Ctrl+I)">I</button>
          <button type="button" class="tiptap-toolbar-button" data-action="code" title="Code (Ctrl+E)">&lt;&gt;</button>
        </div>
        <div class="tiptap-toolbar-separator"></div>
        <div class="tiptap-toolbar-group">
          <button type="button" class="tiptap-toolbar-button" data-action="h1" title="Heading 1">H1</button>
          <button type="button" class="tiptap-toolbar-button" data-action="h2" title="Heading 2">H2</button>
          <button type="button" class="tiptap-toolbar-button" data-action="h3" title="Heading 3">H3</button>
        </div>
        <div class="tiptap-toolbar-separator"></div>
        <div class="tiptap-toolbar-group">
          <button type="button" class="tiptap-toolbar-button" data-action="bulletList" title="Bullet List">•</button>
          <button type="button" class="tiptap-toolbar-button" data-action="orderedList" title="Ordered List">1.</button>
        </div>
        <div class="tiptap-toolbar-separator"></div>
        <div class="tiptap-toolbar-group">
          <button type="button" class="tiptap-toolbar-button" data-action="codeBlock" title="Code Block">{ }</button>
          <button type="button" class="tiptap-toolbar-button" data-action="link" title="Link">🔗</button>
          <button type="button" class="tiptap-toolbar-button" data-action="image" title="Image">🖼</button>
        </div>
      `;
      return toolbar;
    };

    // Configure Tiptap
    const initEditor = async (initialContent = '') => {
      // Load TipTap modules if not already loaded
      await loadTipTap();

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
        onCreate: ({ editor }) => {
          // Enable image zoom in read-only mode after content is rendered
          if (!nestConfig.isOwnNest) {
            setTimeout(() => {
              initImageZoom();
              // Make all images in editor zoomable (using multiple selectors)
              const selectors = ['.ProseMirror img', '.tiptap img', '#nest-editor img'];
              selectors.forEach(selector => {
                document.querySelectorAll(selector).forEach(img => {
                  if (!img.classList.contains('zoomable-image')) {
                    makeImageZoomable(img);
                  }
                });
              });
            }, 100);
          }
        },
        onUpdate: ({ editor }) => {
          if (!nestConfig.isOwnNest) return;

          // Update navigation in real-time (but don't highlight tags during editing)
          setTimeout(() => {
            renderNavigation();
          }, 100);

          // Debounced autosave
          if (saveTimeout) {
            clearTimeout(saveTimeout);
          }

          saveTimeout = setTimeout(async () => {
            await saveContent();
          }, 2000);
        },
        onBlur: ({ editor }) => {
          // Highlight tags when editor loses focus (not during typing)
          setTimeout(() => {
            highlightTags();
          }, 100);
        },
      });

      // Initial navigation render (no delay to avoid visual flicker)
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(async () => {
        // Load sections from server first
        await loadSections();
        renderNavigation();
        // Only highlight tags in edit mode to avoid visual changes in read mode
        if (nestConfig.isOwnNest) {
          highlightTags();
        }
      });

      // Setup toolbar buttons and image handling
      if (nestConfig.isOwnNest) {
        setupToolbar();
        // Wait for DOM to be ready before setting up image handlers
        setTimeout(() => {
          setupImageDragAndDrop();
          setupImagePaste();
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

    // Helper function to upload image file
    const uploadImageFile = async (file) => {
      if (!file || !file.type.startsWith('image/')) {
        return null;
      }

      try {
        const formData = new FormData();
        formData.append('image', file);

        const response = await fetch(CONFIG.BASE_PATH + '/api/upload_image.php', {
          method: 'POST',
          body: formData
        });

        const result = await response.json();

        if (result.success && result.file && result.file.url) {
          return result.file.url;
        } else {
          console.error('[Nest] Image upload failed:', result.error);
          return null;
        }
      } catch (err) {
        console.error('[Nest] Error uploading image:', err);
        return null;
      }
    };

    // Setup drag and drop for images
    const setupImageDragAndDrop = () => {
      const editorEl = document.querySelector('.ProseMirror');
      if (!editorEl) return;

      // Prevent default drag behavior
      editorEl.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        editorEl.classList.add('drag-over');
      });

      editorEl.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        editorEl.classList.remove('drag-over');
      });

      editorEl.addEventListener('drop', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        editorEl.classList.remove('drag-over');

        const files = e.dataTransfer?.files;
        if (!files || files.length === 0) return;

        // Process all dropped image files
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          if (!file.type.startsWith('image/')) continue;

          console.log('[Nest] Uploading dropped image:', file.name);
          const url = await uploadImageFile(file);

          if (url) {
            // Insert image at cursor position
            editor.chain().focus().setImage({ src: url }).run();
          } else {
            alert('Ошибка загрузки изображения: ' + file.name);
          }
        }
      });
    };

    // Setup paste for images from clipboard
    const setupImagePaste = () => {
      const editorEl = document.querySelector('.ProseMirror');
      if (!editorEl) return;

      editorEl.addEventListener('paste', async (e) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        // Check if clipboard contains image
        let hasImage = false;
        for (let i = 0; i < items.length; i++) {
          const item = items[i];

          if (item.type.startsWith('image/')) {
            hasImage = true;
            e.preventDefault();
            e.stopPropagation();

            const file = item.getAsFile();
            if (!file) continue;

            console.log('[Nest] Uploading pasted image from clipboard');
            const url = await uploadImageFile(file);

            if (url) {
              // Insert image at cursor position
              editor.chain().focus().setImage({ src: url }).run();
            } else {
              alert('Ошибка загрузки изображения из буфера обмена');
            }
          }
        }
      });
    };

    // Load content from server
    const loadContent = async (slug = null) => {
      if (slug !== null) {
        nestConfig.postSlug = slug || undefined;
      }
      try {
        let htmlContent = '';

          // Load all content: nest_content + nest_posts
          // 1. Load legacy content from nest_content
          const contentUrl = nestConfig.urlUsername
            ? CONFIG.BASE_PATH + '/api/nest_content.php?action=get&username=' + encodeURIComponent(nestConfig.urlUsername)
            : CONFIG.BASE_PATH + '/api/nest_content.php?action=get';
          const contentResponse = await fetch(contentUrl);
          const contentResult = await contentResponse.json();

          if (contentResult.success && contentResult.content) {
            if (contentResult.content.blocks) {
              htmlContent = convertEditorJsToHtml(contentResult.content);
            } else if (typeof contentResult.content === 'string') {
              htmlContent = contentResult.content;
            }
          }

        await initEditor(htmlContent);

        // If viewing a specific post, apply filter to show only that post
        if (nestConfig.postSlug && editor) {
          // Map slug to post title
          const slugToTitle = {
            'veter': 'Ветер'
          };
          const postTitle = slugToTitle[nestConfig.postSlug];

          if (postTitle) {
            // Find the post in the rendered content
            const sectionNames = getSections();
            if (!nestConfig.isOwnNest || sectionNames.length === 0) {
              const autoTags = extractTagsFromContent();
              const manualSet = new Set(sectionNames.map(s => s.toLowerCase()));
              autoTags.forEach(tag => {
                if (!manualSet.has(tag.toLowerCase())) {
                  sectionNames.push(tag);
                }
              });
            }

            const { sections } = parseContentStructure(sectionNames);

            // Find the post by title across all sections
            let foundPost = null;
            Object.values(sections).forEach(posts => {
              posts.forEach(post => {
                if (post.title === postTitle) {
                  foundPost = post;
                }
              });
            });

            if (foundPost) {
              currentFilter = {
                type: 'post',
                startIndex: foundPost.startIndex,
                endIndex: foundPost.endIndex
              };
              applyFilter();
            }
          }
        }
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
        // Get full HTML content (CSS visibility doesn't affect HTML output)
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
          logToFile('[Nest] Save error: ' + result.error, 'ERROR');
        }
      } catch (err) {
        logToFile('[Nest] Save error: ' + err.message, 'ERROR');
      } finally {
        isSaving = false;
      }
    };

    // Highlight tags in content
    const highlightTags = () => {
      const editorEl = document.querySelector('.tiptap');
      if (!editorEl) return;

      const paragraphs = editorEl.querySelectorAll('p');
      paragraphs.forEach(p => {
        const html = p.innerHTML;
        // Replace #word with styled span
        const highlightedHtml = html.replace(
          /(#[a-zA-Zа-яА-ЯёЁ0-9_]+)/g,
          '<span class="tiptap-tag">$1</span>'
        );

        // Only update if changed to avoid breaking cursor position
        if (html !== highlightedHtml) {
          p.innerHTML = highlightedHtml;
        }
      });
    };

    // Parse content to build navigation structure
    // Always parse from DOM (filter uses CSS visibility, doesn't remove nodes)
    const parseContentStructure = (sectionNames = []) => {
      if (!editor) return { sections: {}, posts: [] };

      const posts = [];
      const sections = {}; // tag -> [post objects]

      // Initialize sections
      sectionNames.forEach(name => {
        sections[name] = [];
      });

      // Parse from DOM (all nodes always present, just hidden with CSS)
      const editorEl = document.querySelector('.tiptap');
      if (!editorEl) {
        return { sections: {}, posts: [] };
      }

      const allNodes = Array.from(editorEl.children);

      let currentH1 = null;
      let currentH1Index = -1;

      // Walk through content from top to bottom
      allNodes.forEach((node, index) => {
        // Parse from DOM
        if (node.tagName === 'H1') {
          currentH1 = {
            title: node.textContent.trim(),
            element: node,
            index: index
          };
          currentH1Index = index;
        }

        if (node.tagName === 'P') {
          const text = node.textContent;
          const tagMatch = text.match(/#([a-zA-Zа-яА-ЯёЁ0-9_]+)/);

          if (tagMatch && currentH1) {
            const rawTag = tagMatch[1];
            const tagName = rawTag.replace(/_/g, ' ');
            const matchingSection = sectionNames.find(s => s.toLowerCase() === tagName.toLowerCase());

            if (matchingSection) {
              const alreadyAdded = Object.values(sections).some(posts =>
                posts.some(p => p.startIndex === currentH1Index)
              );

              if (!alreadyAdded) {
                sections[matchingSection].push({
                  title: currentH1.title,
                  startIndex: currentH1Index,
                  endIndex: index,
                  element: currentH1.element
                });
                posts.push(currentH1);
              }

              currentH1 = null;
              currentH1Index = -1;
            }
          }
        }
      });

      return { sections, posts };
    };

    // Sections storage (on server)
    let cachedSections = [];
    let sectionsLoaded = false;



    // Load sections from server
    const loadSections = async () => {
      try {
        const username = nestConfig.urlUsername;
        const url = username 
          ? 'api/nest_sections.php?action=get&username=' + encodeURIComponent(username)
          : 'api/nest_sections.php?action=get';
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
          cachedSections = data.sections || [];
          sectionsLoaded = true;
        }
      } catch (error) {
        console.error('Failed to load sections:', error);
        cachedSections = [];
        sectionsLoaded = true;
      }
    };
    const getSections = () => {
      return cachedSections;
    };

    const saveSections = (sections) => {
      cachedSections = sections;
      
      // Save to server asynchronously (only for own nest)
      if (nestConfig.isOwnNest) {
        fetch('api/nest_sections.php?action=save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sections })
        }).catch(error => console.error('Failed to save sections:', error));
      }
    };

    const addSection = (name) => {

      // Capitalize first letter
      const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);

      const sections = getSections();

      // Check if section already exists (case-insensitive)
      const exists = sections.some(s => s.toLowerCase() === capitalizedName.toLowerCase());

      if (!exists) {
        sections.push(capitalizedName);
        saveSections(sections);
      } else {
      }
      renderNavigation();
    };

    // Show custom input modal
    const showInputModal = (title, placeholder, callback) => {
      // Create modal overlay
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 9999; display: flex; align-items: center; justify-content: center;';

      // Create modal
      const modal = document.createElement('div');
      modal.className = 'context-menu active';
      modal.style.cssText = 'position: relative; opacity: 1; pointer-events: auto; transform: scale(1);';

      const titleEl = document.createElement('div');
      titleEl.textContent = title;
      titleEl.style.cssText = 'color: #ffffff; font-size: 16px; font-weight: 600; margin-bottom: 12px;';

      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = placeholder;
      input.style.cssText = 'width: 100%; padding: 12px; border: none; border-radius: 8px; font-size: 15px; font-family: Ubuntu Sans, sans-serif; margin-bottom: 12px; outline: none;';

      const buttonsContainer = document.createElement('div');
      buttonsContainer.style.cssText = 'display: flex; gap: 8px;';

      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Отмена';
      cancelBtn.className = 'context-menu-item';
      cancelBtn.style.cssText = 'flex: 1; margin: 0;';

      const okBtn = document.createElement('button');
      okBtn.textContent = 'Создать';
      okBtn.className = 'context-menu-item';
      okBtn.style.cssText = 'flex: 1; margin: 0; background: rgba(255, 255, 255, 0.2);';

      modal.appendChild(titleEl);
      modal.appendChild(input);
      buttonsContainer.appendChild(cancelBtn);
      buttonsContainer.appendChild(okBtn);
      modal.appendChild(buttonsContainer);
      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      input.focus();

      const close = (value) => {
        document.body.removeChild(overlay);
        if (value !== null) callback(value);
      };

      cancelBtn.onclick = () => close(null);
      okBtn.onclick = () => close(input.value);
      input.onkeydown = (e) => {
        if (e.key === 'Enter') close(input.value);
        if (e.key === 'Escape') close(null);
      };
      overlay.onclick = (e) => {
        if (e.target === overlay) close(null);
      };
    };

    // Show context menu for section
    const showSectionContextMenu = (sectionName, x, y) => {
      // Remove existing context menu
      const existing = document.querySelector('.section-context-menu');
      if (existing) existing.remove();

      const menu = document.createElement('div');
      menu.className = 'context-menu active section-context-menu';
      menu.style.left = x + 'px';
      menu.style.top = y + 'px';

      const deleteItem = document.createElement('div');
      deleteItem.className = 'context-menu-item context-menu-item-danger';
      deleteItem.textContent = 'Удалить';
      deleteItem.onclick = () => {
        removeSection(sectionName);
        menu.remove();
      };

      menu.appendChild(deleteItem);
      document.body.appendChild(menu);

      // Close menu on click outside
      const closeMenu = (e) => {
        if (!menu.contains(e.target)) {
          menu.remove();
          document.removeEventListener('click', closeMenu);
        }
      };
      setTimeout(() => document.addEventListener('click', closeMenu), 0);
    };

    // Remove section
    const removeSection = (name) => {
      const sections = getSections();
      const filtered = sections.filter(s => s !== name);
      saveSections(filtered);
      renderNavigation();
    };

    // Render navigation
    let currentFilter = null; // null = all, { type: 'section', name: 'tag' }, { type: 'post', index: 0 }

    // Capitalize first letter of string
    const capitalize = (str) => {
      if (!str) return str;
      return str.charAt(0).toUpperCase() + str.slice(1);
    };

    // Extract all unique tags from content automatically
    const extractTagsFromContent = () => {
      const editorEl = document.querySelector('.tiptap');
      if (!editorEl) return [];

      const tags = new Set();
      const paragraphs = editorEl.querySelectorAll('p');

      paragraphs.forEach(p => {
        const text = p.textContent;
        const tagMatches = text.matchAll(/#([a-zA-Zа-яА-ЯёЁ0-9_]+)/g);
        for (const match of tagMatches) {
          const tagName = match[1].replace(/_/g, ' ');
          tags.add(tagName);
        }
      });

      return Array.from(tags);
    };

    const renderNavigation = () => {
      const navItem = document.querySelector('.nest-nav-item[href="#navigation"]');
      if (!navItem) return;

      // Get manually created sections (only for own nest)
      let sectionNames = getSections();

      // For visitors or if no manual sections, use tags from content
      if (!nestConfig.isOwnNest || sectionNames.length === 0) {
        const autoTags = extractTagsFromContent();
        // Merge with manual sections (manual takes priority)
        const manualSet = new Set(sectionNames.map(s => s.toLowerCase()));
        autoTags.forEach(tag => {
          if (!manualSet.has(tag.toLowerCase())) {
            sectionNames.push(tag);
          }
        });
      }

      // Parse content to find posts for each section
      const { sections: contentSections } = parseContentStructure(sectionNames);

      // Create tabs content container if it doesn't exist
      let tabsContainer = document.querySelector('.nest-tabs-content');
      if (!tabsContainer) {
        tabsContainer = document.createElement('div');
        tabsContainer.className = 'nest-tabs-content';
        // Insert AFTER nest-nav
        const nestNav = document.querySelector('.nest-nav');
        if (nestNav && nestNav.parentElement) {
          nestNav.parentElement.insertBefore(tabsContainer, nestNav.nextSibling);
        }
      }

      // Create navigation content container
      let navContainer = document.querySelector('.nest-navigation-content');
      if (!navContainer) {
        navContainer = document.createElement('div');
        navContainer.className = 'nest-navigation-content';
      }

      // Clear and rebuild navigation content
      navContainer.innerHTML = '';

      // Show sections
      if (sectionNames.length === 0 && !nestConfig.isOwnNest) {
        navContainer.innerHTML += '<div class="nav-empty">Нет разделов</div>';
        return;
      }

      // Build navigation HTML for each section
      sectionNames.forEach(sectionName => {
        const section = document.createElement('div');
        section.className = 'nav-section';

        const sectionHeader = document.createElement('div');
        sectionHeader.className = 'nav-section-header';
        sectionHeader.textContent = capitalize(sectionName);
        sectionHeader.dataset.section = sectionName;

        // Check if this section is active
        if (currentFilter?.type === 'section' && currentFilter.name === sectionName) {
          sectionHeader.classList.add('active');
        }

        // Add context menu for manual sections (only for own nest)
        if (nestConfig.isOwnNest) {
          const manualSections = getSections();
          if (manualSections.includes(sectionName)) {
            sectionHeader.style.cursor = 'context-menu';
            sectionHeader.addEventListener('contextmenu', (e) => {
              e.preventDefault();
              e.stopPropagation();
              showSectionContextMenu(sectionName, e.clientX, e.clientY);
            });
          }
        }

        section.appendChild(sectionHeader);

        // Add posts for this section
        const posts = contentSections[sectionName] || [];
        const postsList = document.createElement('div');
        postsList.className = 'nav-posts';

        if (posts.length === 0) {
          const emptyMsg = document.createElement('div');
          emptyMsg.className = 'nav-post-empty';
          emptyMsg.textContent = 'Нет статей';
          postsList.appendChild(emptyMsg);
        } else {
          posts.forEach(post => {
            const postItem = document.createElement('div');
            postItem.className = 'nav-post';
            postItem.textContent = post.title;
            postItem.dataset.postStartIndex = post.startIndex;
            postItem.dataset.postEndIndex = post.endIndex;

            // Check if this post is active
            if (currentFilter?.type === 'post' && currentFilter.startIndex === post.startIndex) {
              postItem.classList.add('active');
            }

            postsList.appendChild(postItem);
          });
        }

        section.appendChild(postsList);
        navContainer.appendChild(section);
      });

      // Add "[Добавить раздел]" link at the bottom (only in edit mode)
      if (nestConfig.isOwnNest) {
        const addSectionContainer = document.createElement('div');
        addSectionContainer.className = 'nav-add-section';

        const addSectionLink = document.createElement('a');
        addSectionLink.className = 'nav-add-section-link';
        addSectionLink.textContent = '[добавить раздел]';
        addSectionLink.href = '#';

        addSectionLink.addEventListener('click', (e) => {
          e.preventDefault();
          showInputModal('Новый раздел', 'Название раздела', (value) => {
            if (value && value.trim()) {
              addSection(value.trim());
            }
          });
        });

        addSectionContainer.appendChild(addSectionLink);
        navContainer.appendChild(addSectionContainer);
      }

      // Place navigation content in tabs container (only if not already there)
      if (!navContainer.parentElement || navContainer.parentElement !== tabsContainer) {
        tabsContainer.appendChild(navContainer);
      }

      // Add click handlers
      attachNavigationHandlers();
    };

    // Attach click handlers to navigation
    const attachNavigationHandlers = () => {
      // Section headers
      document.querySelectorAll('.nav-section-header').forEach(header => {
        header.addEventListener('click', (e) => {
          const sectionName = e.target.dataset.section;

          // If postsManager is available (nest_posts mode), use it for filtering
          if (postsManager) {
            // Toggle filter
            if (currentFilter?.type === 'section' && currentFilter.name === sectionName) {
              // Deactivate filter
              currentFilter = null;
              postsManager.setFilter(null, null);

              // Remove section from URL
              const url = new URL(window.location);
              url.searchParams.delete('section');
              window.history.pushState({ section: null }, '', url);
            } else {
              // Activate section filter
              currentFilter = { type: 'section', name: sectionName };
              postsManager.setFilter('section', sectionName);

              // Add section to URL
              const url = new URL(window.location);
              url.searchParams.set('section', sectionName);
              window.history.pushState({ section: sectionName }, '', url);
            }

            // Re-render posts list, navigation, and sidebar
            postsManager.renderPostsList(document.getElementById('nest-editor-container'));
            renderNavigation(); // Re-render navigation to update active states (creates sidebar structure)
            postsManager.renderSidebarNavigation(); // Populate sidebar with all posts
          } else {
            // Legacy mode (old content with TipTap)
            // Toggle filter
            if (currentFilter?.type === 'section' && currentFilter.name === sectionName) {
              // Deactivate filter
              currentFilter = null;
            } else {
              // Activate section filter
              currentFilter = { type: 'section', name: sectionName };
            }

            applyFilter();
            renderNavigation(); // Re-render to update active states
          }
        });
      });

      // Posts
      document.querySelectorAll('.nav-post').forEach(postEl => {
        postEl.addEventListener('click', (e) => {
          const postTitle = e.target.textContent.trim();
          
          // Check if this is a post from nest_posts (has individual page)
          // For now, only "Ветер" - later we'll check via API
          if (postTitle === 'Ветер') {
            // Navigate to post page
            const baseUrl = nestConfig.urlUsername 
              ? CONFIG.BASE_PATH + '/nest/' + nestConfig.urlUsername
              : CONFIG.BASE_PATH + '/nest';
            window.location.href = baseUrl + '/veter';
            return;
          }

          // Legacy posts - use filtering
          const startIndex = parseInt(e.target.dataset.postStartIndex);
          const endIndex = parseInt(e.target.dataset.postEndIndex);

          // Toggle filter
          if (currentFilter?.type === 'post' && currentFilter.startIndex === startIndex) {
            // Deactivate filter
            currentFilter = null;
          } else {
            // Activate post filter
            currentFilter = { type: 'post', startIndex, endIndex };
          }

          applyFilter();
          renderNavigation(); // Re-render to update active states
        });
      });
    };

    // Store original content for restoring after filtering
    let originalContent = null;

    // Log to server file
    const logToFile = async (message, level = 'INFO') => {
      try {
        await fetch('server/api/log.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, level })
        });
      } catch (e) {
        // Silent fail - logging shouldn't break functionality
      }
    };

    // Apply filter to content using CSS visibility (not content replacement)
    const applyFilter = () => {
      if (!editor) return;

      const editorEl = document.querySelector('.tiptap');
      if (!editorEl) return;

      const allNodes = Array.from(editorEl.children);

      if (!currentFilter) {
        // Show all - remove filter
        allNodes.forEach(node => {
          node.style.removeProperty('position');
          node.style.removeProperty('visibility');
          node.style.removeProperty('height');
          node.style.removeProperty('overflow');
          node.style.removeProperty('margin');
          node.style.removeProperty('padding');
        });
        // Re-enable editing
        if (nestConfig.isOwnNest) {
          editor.setEditable(true);
        }
        return;
      }

      // Disable editing during filtering
      if (nestConfig.isOwnNest) {
        editor.setEditable(false);
      }

      // Get filtered node indices (use same logic as renderNavigation)
      let sectionNames = getSections();

      // For visitors or if no manual sections, use tags from content
      if (!nestConfig.isOwnNest || sectionNames.length === 0) {
        const autoTags = extractTagsFromContent();
        const manualSet = new Set(sectionNames.map(s => s.toLowerCase()));
        autoTags.forEach(tag => {
          if (!manualSet.has(tag.toLowerCase())) {
            sectionNames.push(tag);
          }
        });
      }

      const { sections } = parseContentStructure(sectionNames);

      let indicesToShow = new Set();

      if (currentFilter.type === 'section') {
        // Show all posts in this section
        const sectionPosts = sections[currentFilter.name] || [];
        sectionPosts.forEach(post => {
          for (let i = post.startIndex; i <= post.endIndex; i++) {
            indicesToShow.add(i);
          }
        });
      } else if (currentFilter.type === 'post') {
        // Show only this specific post
        for (let i = currentFilter.startIndex; i <= currentFilter.endIndex; i++) {
          indicesToShow.add(i);
        }
      }

      // Hide/show nodes using CSS (not display to keep images loaded)
      allNodes.forEach((node, index) => {
        if (indicesToShow.has(index)) {
          // Show
          node.style.removeProperty('position');
          node.style.removeProperty('visibility');
          node.style.removeProperty('height');
          node.style.removeProperty('overflow');
          node.style.removeProperty('margin');
          node.style.removeProperty('padding');
        } else {
          // Hide completely - remove from document flow
          node.style.position = 'absolute';
          node.style.visibility = 'hidden';
          node.style.height = '0';
          node.style.overflow = 'hidden';
          node.style.margin = '0';
          node.style.padding = '0';
        }
      });

      logToFile(`Filter applied: ${currentFilter.type} with ${indicesToShow.size} nodes visible`);
    };

    // Tab switching logic
    const switchTab = (tabName) => {
      // Update active tab
      const allTabs = document.querySelectorAll('.nest-nav-item');
      allTabs.forEach(tab => {
        if (tab.getAttribute('href') === `#${tabName}`) {
          tab.classList.add('active');
        } else {
          tab.classList.remove('active');
        }
      });

      // Update content - hide all tab contents first
      const navContent = document.querySelector('.nest-navigation-content');
      const metaContent = document.querySelector('.nest-meta-content');
      const discussionsContent = document.querySelector('.nest-discussions-content');

      // Hide all
      if (navContent) navContent.style.display = 'none';
      if (metaContent) metaContent.style.display = 'none';
      if (discussionsContent) discussionsContent.style.display = 'none';

      // Show selected tab content
      if (tabName === 'navigation' && navContent) {
        navContent.style.display = 'block';
      } else if (tabName === 'meta') {
        if (!metaContent) {
          const container = document.querySelector('.nest-tabs-content');
          const meta = document.createElement('div');
          meta.className = 'nest-meta-content';
          meta.innerHTML = '<div class="nav-empty">Пока пусто</div>';
          container.appendChild(meta);
        } else {
          metaContent.style.display = 'block';
        }
      } else if (tabName === 'discussions') {
        if (!discussionsContent) {
          const container = document.querySelector('.nest-tabs-content');
          const discussions = document.createElement('div');
          discussions.className = 'nest-discussions-content';
          discussions.innerHTML = '<div class="nav-empty">Пока пусто</div>';
          container.appendChild(discussions);
        } else {
          discussionsContent.style.display = 'block';
        }
      }
    };

    // Tab click handlers
    const navToggle = document.querySelector('.nest-nav-item[href="#navigation"]');
    if (navToggle) {
      navToggle.addEventListener('click', (e) => {
        e.preventDefault();
        switchTab('navigation');
      });
    }

    const metaToggle = document.querySelector('.nest-nav-item[href="#meta"]');
    if (metaToggle) {
      metaToggle.addEventListener('click', (e) => {
        e.preventDefault();
        switchTab('meta');
      });
    }

    const discussionsToggle = document.querySelector('.nest-nav-item[href="#discussions"]');
    if (discussionsToggle) {
      discussionsToggle.addEventListener('click', (e) => {
        e.preventDefault();
        switchTab('discussions');
        // Show whale on discussions tab
        const whale = document.getElementById('discussion-whale');
        if (whale) whale.style.display = 'block';
      });
    }

    // Hide whale on other tabs
    const navToggleWhale = document.querySelector('.nest-nav-item[href="#navigation"]');
    if (navToggleWhale) {
      navToggleWhale.addEventListener('click', () => {
        const whale = document.getElementById('discussion-whale');
        if (whale) whale.style.display = 'none';
      });
    }

    const metaToggleWhale = document.querySelector('.nest-nav-item[href="#meta"]');
    if (metaToggleWhale) {
      metaToggleWhale.addEventListener('click', () => {
        const whale = document.getElementById('discussion-whale');
        if (whale) whale.style.display = 'none';
      });
    }

    // Initialize editor with content
    // If viewing a nest without a specific post slug, use posts manager for list view
    // This applies to both own nest and viewing others' nests
    if (!nestConfig.postSlug) {
      console.log('[Nest] Initializing list view...');
      postsManager = new NestPostsManager(nestConfig, CONFIG.BASE_PATH);

      // For viewing mode: load metadata first for navigation, then paginated posts
      // For own nest: load all posts
      if (!nestConfig.isOwnNest) {
        console.log('[Nest] Loading metadata...');
        // Load metadata for sidebar navigation (lightweight)
        await postsManager.loadMetadata();
        console.log('[Nest] Metadata loaded:', postsManager.totalPosts, 'total posts');
      }

      console.log('[Nest] Loading posts...');
      // Load posts (paginated for viewing, all for own nest)
      await postsManager.loadPosts();
      console.log('[Nest] Posts loaded:', postsManager.posts.length, 'of', postsManager.totalPosts);

      // Check for section filter in URL
      const urlParams = new URLSearchParams(window.location.search);
      const sectionParam = urlParams.get('section');
      if (sectionParam) {
        currentFilter = { type: 'section', name: sectionParam };
        postsManager.setFilter('section', sectionParam);
      }

      console.log('[Nest] Loading sections...');
      // Load sections and render navigation
      await loadSections();
      renderNavigation();
      console.log('[Nest] Sections loaded');

      // Populate sidebar sections with posts from nest_posts (uses metadata)
      postsManager.renderSidebarNavigation();

      // Render posts list
      postsManager.renderPostsList(document.getElementById('nest-editor-container'));

      // Setup infinite scroll for viewing mode
      if (!nestConfig.isOwnNest) {
        postsManager.setupInfiniteScroll(document.getElementById('nest-editor-container'));
      }

      hideSkeleton();

      // Enable image zoom for viewing (watch for dynamically added images)
      if (!nestConfig.isOwnNest) {
        watchForImages();
      }
    } else {
      // Load single post from nest_posts by slug using API
      postsManager = new NestPostsManager(nestConfig, CONFIG.BASE_PATH);

      // Fetch single post directly by slug (not limited by pagination)
      const response = await fetch(`${CONFIG.BASE_PATH}/api/nest_posts.php?action=get&username=${encodeURIComponent(nestConfig.urlUsername)}&slug=${encodeURIComponent(nestConfig.postSlug)}`);
      const result = await response.json();

      if (result.success && result.post) {
        postsManager.renderSinglePost(document.getElementById('nest-editor-container'), result.post);
      } else {
        // Post not found, show 404 or redirect
        document.getElementById('nest-editor-container').innerHTML = '<p>Пост не найден</p>';
      }

      // Load sections and render sidebar navigation (same as list view)
      await loadSections();
      renderNavigation();
      postsManager.renderSidebarNavigation();

      hideSkeleton();

      // Enable image zoom for viewing (watch for dynamically added images)
      if (!nestConfig.isOwnNest) {
        watchForImages();
      }
    }

    // Handle browser back/forward buttons
    window.addEventListener('popstate', (event) => {
      // If we have postsManager (list view), handle section filtering
      if (postsManager && !nestConfig.postSlug) {
        const sectionParam = event.state?.section || null;

        if (sectionParam) {
          currentFilter = { type: 'section', name: sectionParam };
          postsManager.setFilter('section', sectionParam);
        } else {
          currentFilter = null;
          postsManager.setFilter(null, null);
        }

        postsManager.renderPostsList(document.getElementById('nest-editor-container'));
        renderNavigation();
        postsManager.renderSidebarNavigation();
      } else {
        // Single post view - use slug navigation
        const slug = event.state?.slug || null;
        loadContent(slug);
      }
    });

    // Set initial state
    const urlParams = new URLSearchParams(window.location.search);
    const initialSection = urlParams.get('section');
    window.history.replaceState({
      slug: nestConfig.postSlug || null,
      section: initialSection || null
    }, '', window.location.href);

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
