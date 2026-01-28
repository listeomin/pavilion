// nest.js - инициализация страницы Гнездо без чата
import { CONFIG } from './config.js?v=7';
import { getCookie, apiInit, apiChangeName } from './api.js?v=7';
import * as NightShift from './nightshift.js?v=1';
import { AnimalProfile } from './animalProfile.js?v=18';
import { TelegramAuth } from './telegramAuth.js?v=2';
import { renderGitHubPreview } from './github.js?v=5';
import { parseYouTubeUrl } from './youtube.js?v=2';
import { renderMusicPlayer } from './music.js?v=9';
import { initImageZoom, makeImageZoomable, watchForImages } from './image-zoom.js?v=12';
import { NestPostsManager } from './nest-posts-manager.js?v=24';
import { DiscussionsManager } from './discussions.js?v=20';
import { logToServer, alignUserHeader, setupHeaderAlignment, loadTipTap, suppressYouTubeErrors, capitalize } from './nest-utils.js?v=1';
import { createSectionsManager, showInputModal, showSectionContextMenu } from './nest-sections.js?v=1';

// Tiptap modules will be loaded dynamically when needed (only for single post view with TipTap editor)
// This prevents blocking the page load for list view
let Editor, StarterKit, Link, Image, Placeholder;

// Setup error suppression
suppressYouTubeErrors();

// Remove no-js class immediately (JavaScript is available)
console.log('[Nest] JavaScript starting at:', performance.now().toFixed(2), 'ms');
document.body.classList.remove('no-js');

// Hide static content (for SEO/Instant View only)
const staticContent = document.getElementById('nest-static-content');
if (staticContent) {
  staticContent.style.display = 'none';
}

// TipTap loading wrapper that updates local variables
async function loadTipTapModules() {
  const modules = await loadTipTap();
  Editor = modules.Editor;
  StarterKit = modules.StarterKit;
  Link = modules.Link;
  Image = modules.Image;
  Placeholder = modules.Placeholder;
}

(async function () {
  const API = CONFIG.API_PATH;
  const COOKIE_NAME = 'chat_session_id';
  let sessionId = getCookie(COOKIE_NAME) || null;
  let postsManager = null;
  let discussionsManager = null; // Global postsManager instance for filtering
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

  // Setup user header alignment with multiple strategies
  setupHeaderAlignment();

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
      await loadTipTapModules();

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
      } catch (err) {
        console.error('[Nest] Error loading content:', err);
        await initEditor('');
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

      // Fixed categories in specified order
      const categories = [
        { name: 'Лента', image: 'лента.png' },
        { name: 'Разработка', image: 'разработка.png' },
        { name: 'Наблюдения', image: 'наблюдения.png' },
        { name: 'Твои сны', image: 'сны.png' },
        { name: 'Психонавтика', image: 'психонавтика.png' },
        { name: 'Краски да холсты', image: 'краски_да_холсты.png' },
        { name: 'Стихи', image: 'стихи.png' },
        { name: 'Рассказы', image: 'рассказы.png' },
        { name: 'Рефлексия', image: 'рефлексия.png' },
        { name: 'Фотокарточки', image: 'фотокарточки.png' },
        { name: 'Воспоминания', image: 'воспоминания.png' },
        { name: 'Письма', image: 'письма.png' },
        { name: 'Музыка', image: 'музыка.png' },
        { name: 'Фильмы', image: 'кинофильмы.png' },
        { name: 'Пейджер', image: 'пейджер.png' },
        { name: 'Черновики', image: 'черновики.png' }
      ];

      // Get counts from cached data (fast, no counting needed)
      const categoryCounts = postsManager?.postCounts || {};

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

      // Reset inline styles to allow CSS to work (grid display with 32px padding)
      navContainer.style.display = '';
      navContainer.style.paddingLeft = ''; // Reset to CSS default (32px from nest-layout.css)

      // Build category tiles
      categories.forEach(category => {
        // Find count (case-insensitive match)
        const countKey = Object.keys(categoryCounts).find(
          key => key.toLowerCase() === category.name.toLowerCase()
        );
        const count = countKey ? categoryCounts[countKey] : 0;

        const tile = document.createElement('div');
        tile.className = 'category-tile';
        tile.dataset.section = category.name;

        // Check if active
        if (currentFilter?.type === 'section' && currentFilter.name === category.name) {
          tile.classList.add('active');
        }

        // Image
        const img = document.createElement('img');
        img.className = 'category-tile-image';
        img.src = `assets/categories/${encodeURIComponent(category.image)}`;
        img.alt = category.name;

        // Name
        const nameEl = document.createElement('div');
        nameEl.className = 'category-tile-name';
        nameEl.textContent = category.name;

        // Count
        const countEl = document.createElement('div');
        countEl.className = 'category-tile-count';
        countEl.textContent = count.toString();

        tile.appendChild(img);
        tile.appendChild(nameEl);
        tile.appendChild(countEl);

        navContainer.appendChild(tile);
      });

      // Place navigation content in tabs container (only if not already there)
      if (!navContainer.parentElement || navContainer.parentElement !== tabsContainer) {
        tabsContainer.appendChild(navContainer);
      }

      // Add click handlers
      attachNavigationHandlers();
    };

    // Show single category in sidebar
    const showSingleCategoryInSidebar = (categoryName) => {
      const navContainer = document.querySelector('.nest-navigation-content');
      if (!navContainer) return;

      // Find the category
      const categories = [
        { name: 'Лента', image: 'лента.png' },
        { name: 'Разработка', image: 'разработка.png' },
        { name: 'Наблюдения', image: 'наблюдения.png' },
        { name: 'Твои сны', image: 'сны.png' },
        { name: 'Психонавтика', image: 'психонавтика.png' },
        { name: 'Краски да холсты', image: 'краски_да_холсты.png' },
        { name: 'Стихи', image: 'стихи.png' },
        { name: 'Рассказы', image: 'рассказы.png' },
        { name: 'Рефлексия', image: 'рефлексия.png' },
        { name: 'Фотокарточки', image: 'фотокарточки.png' },
        { name: 'Воспоминания', image: 'воспоминания.png' },
        { name: 'Письма', image: 'письма.png' },
        { name: 'Музыка', image: 'музыка.png' },
        { name: 'Фильмы', image: 'кинофильмы.png' },
        { name: 'Пейджер', image: 'пейджер.png' },
        { name: 'Черновики', image: 'черновики.png' }
      ];

      const category = categories.find(c => c.name === categoryName);
      if (!category) return;

      // Get counts from cached data (fast, no counting needed)
      const categoryCounts = postsManager?.postCounts || {};

      // Find count (case-insensitive match)
      const countKey = Object.keys(categoryCounts).find(
        key => key.toLowerCase() === category.name.toLowerCase()
      );
      const count = countKey ? categoryCounts[countKey] : 0;

      // Clear and rebuild with single category
      navContainer.innerHTML = '';
      navContainer.style.display = 'block'; // Override grid for single item
      // Keep padding-left: 32px from CSS (376px max-width - 32px padding = 344px, use 320px for shadow space)

      // Create single category header tile
      const tile = document.createElement('div');
      tile.className = 'single-category-header';
      tile.dataset.section = category.name;

      // Header (category name)
      const header = document.createElement('div');
      header.className = 'single-category-header-title';
      header.textContent = category.name;

      // Meta container
      const meta = document.createElement('div');
      meta.className = 'single-category-meta';

      // Posts count
      const postsRow = document.createElement('div');
      postsRow.className = 'single-category-stat-row';
      const postsNumber = document.createElement('span');
      postsNumber.className = 'single-category-stat-number';
      postsNumber.textContent = count;
      const postsLabel = document.createElement('span');
      postsLabel.className = 'single-category-stat-label';
      postsLabel.textContent = 'постов';
      postsRow.appendChild(postsNumber);
      postsRow.appendChild(postsLabel);

      // Comments count (placeholder)
      const commentsRow = document.createElement('div');
      commentsRow.className = 'single-category-stat-row';
      const commentsNumber = document.createElement('span');
      commentsNumber.className = 'single-category-stat-number';
      commentsNumber.textContent = '0';
      const commentsLabel = document.createElement('span');
      commentsLabel.className = 'single-category-stat-label';
      commentsLabel.textContent = 'комментариев';
      commentsRow.appendChild(commentsNumber);
      commentsRow.appendChild(commentsLabel);

      // Likes count (орехи)
      const likesRow = document.createElement('div');
      likesRow.className = 'single-category-stat-row';
      const likesNumber = document.createElement('span');
      likesNumber.className = 'single-category-stat-number';
      likesNumber.textContent = '0';
      const likesLabel = document.createElement('span');
      likesLabel.className = 'single-category-stat-label';
      likesLabel.textContent = 'орехов';
      likesRow.appendChild(likesNumber);
      likesRow.appendChild(likesLabel);

      meta.appendChild(postsRow);
      meta.appendChild(commentsRow);
      meta.appendChild(likesRow);

      // Image cover (absolute positioned on the right)
      const imgCover = document.createElement('div');
      imgCover.className = 'single-category-image-cover';
      const img = document.createElement('img');
      img.className = 'single-category-image';
      img.src = `assets/categories/${encodeURIComponent(category.image)}`;
      img.alt = category.name;
      imgCover.appendChild(img);

      tile.appendChild(header);
      tile.appendChild(meta);
      tile.appendChild(imgCover);

      navContainer.appendChild(tile);

      // Add click handler to header - navigate to category list view
      tile.addEventListener('click', (e) => {
        // Navigate to category list view
        const baseUrl = nestConfig.urlUsername
          ? `${CONFIG.BASE_PATH}/nest/${nestConfig.urlUsername}`
          : `${CONFIG.BASE_PATH}/nest`;
        window.location.href = `${baseUrl}?section=${encodeURIComponent(category.name)}`;
      });

      // Add posts list under the tile
      if (postsManager) {
        const postsData = postsManager.allPostsMetadata || postsManager.posts || [];
        // Filter posts by category (case-insensitive)
        const categoryPosts = postsData.filter(post =>
          post.tag && post.tag.toLowerCase() === category.name.toLowerCase()
        );

        if (categoryPosts.length > 0) {
          // Create posts list container
          const postsListContainer = document.createElement('div');
          postsListContainer.className = 'single-category-posts';

          // Add each post as a link
          categoryPosts.forEach(post => {
            const postLink = document.createElement('a');
            postLink.className = 'nav-post';
            // Include section parameter to preserve sidebar state
            postLink.href = `${CONFIG.BASE_PATH}/nest/${nestConfig.urlUsername}/${post.slug}?section=${encodeURIComponent(category.name)}`;

            // Check if this is the current post
            const isActive = nestConfig.postSlug === post.slug;
            if (isActive) {
              postLink.classList.add('active');
            }

            // Create wrapper for flexbox (icon/placeholder + title)
            const linkContent = document.createElement('div');
            linkContent.className = 'nav-post-content';

            // Add icon for active post OR placeholder for inactive (to align text)
            if (isActive) {
              const icon = document.createElement('img');
              icon.className = 'nav-post-icon';
              icon.src = 'assets/article-leaf.svg';
              linkContent.appendChild(icon);
            } else {
              // Placeholder to maintain text alignment
              const placeholder = document.createElement('div');
              placeholder.className = 'nav-post-icon-placeholder';
              linkContent.appendChild(placeholder);
            }

            const title = document.createElement('span');
            title.textContent = post.title || 'Без названия';
            linkContent.appendChild(title);

            postLink.appendChild(linkContent);

            // Navigate on click
            postLink.addEventListener('click', (e) => {
              e.preventDefault();
              window.location.href = postLink.href;
            });

            postsListContainer.appendChild(postLink);
          });

          navContainer.appendChild(postsListContainer);
        }
      }

      // Attach handlers to the new tile (not the title this time)
      tile.addEventListener('click', async (e) => {
        // Don't handle title clicks in single view
        if (e.target.classList.contains('category-tile-name')) {
          return;
        }

        const sectionName = tile.dataset.section;

        // If postsManager is available (nest_posts mode), use it for filtering
        if (postsManager) {
          // Toggle filter
          if (currentFilter?.type === 'section' && currentFilter.name === sectionName) {
            // Deactivate filter
            currentFilter = null;
            await postsManager.setFilter(null, null);

            // Remove section from URL
            const url = new URL(window.location);
            url.searchParams.delete('section');
            window.history.pushState({ section: null }, '', url);
          } else {
            // Activate section filter
            currentFilter = { type: 'section', name: sectionName };
            await postsManager.setFilter('section', sectionName);

            // Add section to URL
            const url = new URL(window.location);
            url.searchParams.set('section', sectionName);
            window.history.pushState({ section: sectionName }, '', url);
          }

          // Re-render posts list and update tile active state
          postsManager.renderPostsList(document.getElementById('nest-editor-container'));
          if (currentFilter?.type === 'section' && currentFilter.name === sectionName) {
            tile.classList.add('active');
          } else {
            tile.classList.remove('active');
          }
        }
      });
    };

    // Attach click handlers to navigation
    const attachNavigationHandlers = () => {
      // Category tiles - click on tile area (not on title)
      document.querySelectorAll('.category-tile').forEach(tile => {
        tile.addEventListener('click', async (e) => {
          // If clicked on title, don't handle here (separate handler below)
          if (e.target.classList.contains('category-tile-name')) {
            return;
          }

          const sectionName = tile.dataset.section;

          // If postsManager is available (nest_posts mode), use it for filtering
          if (postsManager) {
            // Toggle filter
            if (currentFilter?.type === 'section' && currentFilter.name === sectionName) {
              // Deactivate filter
              currentFilter = null;
              await postsManager.setFilter(null, null);

              // Remove section from URL
              const url = new URL(window.location);
              url.searchParams.delete('section');
              window.history.pushState({ section: null }, '', url);
            } else {
              // Activate section filter
              currentFilter = { type: 'section', name: sectionName };
              await postsManager.setFilter('section', sectionName);

              // Add section to URL
              const url = new URL(window.location);
              url.searchParams.set('section', sectionName);
              window.history.pushState({ section: sectionName }, '', url);
            }

            // Re-render posts list only
            const container = document.getElementById('nest-editor-container');
            postsManager.renderPostsList(container);

            // Update tile active states without full re-render
            document.querySelectorAll('.category-tile').forEach(t => {
              if (t.dataset.section === sectionName && currentFilter?.type === 'section') {
                t.classList.add('active');
              } else {
                t.classList.remove('active');
              }
            });
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

        // Category title click - filter content + show single category in sidebar
        const titleEl = tile.querySelector('.category-tile-name');
        if (titleEl) {
          titleEl.addEventListener('click', async (e) => {
            e.stopPropagation(); // Prevent tile click handler
            const sectionName = tile.dataset.section;

            // Filter content (same as tile click)
            if (postsManager) {
              // Activate section filter
              currentFilter = { type: 'section', name: sectionName };
              await postsManager.setFilter('section', sectionName);

              // Add section to URL
              const url = new URL(window.location);
              url.searchParams.set('section', sectionName);
              window.history.pushState({ section: sectionName }, '', url);

              // Re-render posts list
              postsManager.renderPostsList(document.getElementById('nest-editor-container'));
            }

            // Show single category in sidebar
            showSingleCategoryInSidebar(sectionName);
          });
        }
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
        navContent.style.display = 'grid';
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
          container.appendChild(discussions);
        }
        const discContainer = document.querySelector('.nest-discussions-content');
        if (discContainer) {
          discContainer.style.display = 'block';
          if (discussionsManager) {
            discussionsManager.renderDiscussionsList(discContainer);
          } else {
            discContainer.innerHTML = '<div class="nav-empty">Выберите пост для просмотра обсуждений</div>';
          }
        }
      }
    };

    // Tab click handlers
    const navToggle = document.querySelector('.nest-nav-item[href="#navigation"]');
    if (navToggle) {
      navToggle.addEventListener('click', (e) => {
        e.preventDefault();

        // Reset filter when clicking Рубрики
        if (currentFilter) {
          currentFilter = null;
          if (postsManager) {
            postsManager.setFilter(null, null);

            // Remove section from URL
            const url = new URL(window.location);
            url.searchParams.delete('section');
            window.history.pushState({ section: null }, '', url);

            // Re-render posts and navigation
            postsManager.renderPostsList(document.getElementById('nest-editor-container'));
            renderNavigation(); // Re-render navigation to remove active states
            postsManager.renderSidebarNavigation();
          }
        }

        // For single post view: remove section parameter and restore grid view
        if (nestConfig.postSlug) {
          const url = new URL(window.location);
          if (url.searchParams.has('section')) {
            url.searchParams.delete('section');
            window.history.pushState({ section: null }, '', url);
            // Re-render navigation to show all categories in grid
            renderNavigation();
            if (postsManager) {
              postsManager.renderSidebarNavigation();
            }
          }
        }

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
        if (whale) whale.style.display = 'none';
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
      postsManager = new NestPostsManager(nestConfig, CONFIG.BASE_PATH);

      // Check for section filter in URL BEFORE loading posts
      const urlParams = new URLSearchParams(window.location.search);
      const sectionParam = urlParams.get('section');
      if (sectionParam) {
        currentFilter = { type: 'section', name: sectionParam };
        // Set filter without reload, we'll load posts manually below
        await postsManager.setFilter('section', sectionParam, false);
      }

      // For viewing mode: prioritize showing posts quickly, load metadata in background
      // For own nest: load all posts
      if (!nestConfig.isOwnNest) {
        // Start loading metadata in background for sidebar (don't wait for it)
        const metadataPromise = postsManager.loadMetadata();

        // Load posts, sections, and counts in parallel (fast)
        await Promise.all([
          postsManager.loadPosts(),
          loadSections(),
          postsManager.loadCounts()
        ]);

        // Render navigation with counts and posts immediately
        renderNavigation();
        postsManager.renderPostsList(document.getElementById('nest-editor-container'));

        // Load metadata in background and populate sidebar when ready
        metadataPromise.then(() => {
          postsManager.renderSidebarNavigation();
        });
      } else {
        // For own nest: load all posts
        await Promise.all([
          postsManager.loadPosts(),
          loadSections(),
          postsManager.loadCounts()
        ]);
        renderNavigation();
        postsManager.renderPostsList(document.getElementById('nest-editor-container'));
      }

      // Setup infinite scroll for viewing mode
      if (!nestConfig.isOwnNest) {
        postsManager.setupInfiniteScroll(document.getElementById('nest-editor-container'));
      }

      // Enable image zoom for viewing (watch for dynamically added images)
      if (!nestConfig.isOwnNest) {
        watchForImages();
      }

      // Initialize discussions for posts list (for everyone)
      setTimeout(() => {
        const initDiscussionsForList = () => {
          const container = document.getElementById('nest-editor-container');
          if (!container) return;

          // Find all posts with content
          const posts = container.querySelectorAll('.nest-post');

          posts.forEach(postEl => {
            const contentEl = postEl.querySelector('.nest-post-content');
            const postId = postEl.dataset.postId;
            if (contentEl && postId && !contentEl._discussionsInitialized) {
              contentEl._discussionsInitialized = true;
              if (!discussionsManager) {
                discussionsManager = new DiscussionsManager(nestConfig, CONFIG.BASE_PATH);
              }
              discussionsManager.initializeTextSelection(parseInt(postId), contentEl);
            }
          });
        };
        initDiscussionsForList();

        // Re-init on infinite scroll (new posts loaded)
        const observer = new MutationObserver(() => {
          setTimeout(initDiscussionsForList, 100);
        });
        const container = document.getElementById('nest-editor-container');
        if (container) {
          observer.observe(container, { childList: true, subtree: true });
        }
      }, 300);
    } else {
      // Load single post from nest_posts by slug using API
      postsManager = new NestPostsManager(nestConfig, CONFIG.BASE_PATH);

      // Load metadata in background, but load sections, counts and post first (fast)
      const metadataPromise = postsManager.loadMetadata();

      const [, , singlePostResponse] = await Promise.all([
        loadSections(),
        postsManager.loadCounts(),
        fetch(`${CONFIG.BASE_PATH}/api/nest_posts.php?action=get&username=${encodeURIComponent(nestConfig.urlUsername)}&slug=${encodeURIComponent(nestConfig.postSlug)}`)
      ]);

      const result = await singlePostResponse.json();

      if (result.success && result.post) {
        postsManager.renderSinglePost(document.getElementById('nest-editor-container'), result.post);

        // Initialize discussions for text quotation (for everyone)
        // Wait for DOM to be ready with retry
        const initDiscussions = (attempt = 1) => {
          const contentElement = document.querySelector('.nest-post-content');
          if (contentElement) {
            discussionsManager = new DiscussionsManager(nestConfig, CONFIG.BASE_PATH);
            discussionsManager.initializeTextSelection(result.post.id, contentElement);
            discussionsManager.onDiscussionsUpdate = (discussions) => {
              const container = document.querySelector('.nest-discussions-content');
              if (container) discussionsManager.renderDiscussionsList(container);
            };
            console.log('[Nest] Discussions initialized successfully');
          } else if (attempt < 5) {
            console.log('[Nest] Content element not found, retrying...', attempt);
            setTimeout(() => initDiscussions(attempt + 1), 200);
          } else {
            console.error('[Nest] Content element not found after 5 attempts');
          }
        };
        setTimeout(initDiscussions, 100);
      } else {
        // Post not found, show 404 or redirect
        document.getElementById('nest-editor-container').innerHTML = '<p>Пост не найден</p>';
      }

      // Render basic navigation structure first
      renderNavigation();

      // Check if we need to restore sidebar state from URL parameter
      const urlParams = new URLSearchParams(window.location.search);
      const sectionParam = urlParams.get('section');

      // Load metadata in background and populate sidebar when ready
      metadataPromise.then(() => {
        if (sectionParam) {
          // Restore sidebar state - show single category with posts list
          showSingleCategoryInSidebar(sectionParam);
        } else {
          // Default sidebar navigation - populate all sections
          postsManager.renderSidebarNavigation();
        }
      });

      // Enable image zoom for viewing (watch for dynamically added images)
      if (!nestConfig.isOwnNest) {
        watchForImages();
      }
    }

    // Handle browser back/forward buttons
    window.addEventListener('popstate', async (event) => {
      // If we have postsManager (list view), handle section filtering
      if (postsManager && !nestConfig.postSlug) {
        const sectionParam = event.state?.section || null;

        if (sectionParam) {
          currentFilter = { type: 'section', name: sectionParam };
          await postsManager.setFilter('section', sectionParam);
        } else {
          currentFilter = null;
          await postsManager.setFilter(null, null);
        }

        postsManager.renderPostsList(document.getElementById('nest-editor-container'));
      } else if (nestConfig.postSlug) {
        // Single post view - handle section parameter changes
        const urlParams = new URLSearchParams(window.location.search);
        const sectionParam = urlParams.get('section');

        if (sectionParam) {
          // Show single category sidebar
          renderNavigation();
          showSingleCategoryInSidebar(sectionParam);
        } else {
          // Show all categories grid
          renderNavigation();
          if (postsManager) {
            postsManager.renderSidebarNavigation();
          }
        }
      } else {
        // Legacy TipTap mode - use slug navigation
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
