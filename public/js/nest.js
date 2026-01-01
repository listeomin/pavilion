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
        <div class="tiptap-toolbar-group">
          <button type="button" class="tiptap-toolbar-button" data-action="bold" title="Bold (Ctrl+B)">B</button>
          <button type="button" class="tiptap-toolbar-button" data-action="italic" title="Italic (Ctrl+I)">I</button>
          <button type="button" class="tiptap-toolbar-button" data-action="code" title="Code (Ctrl+E)">Code</button>
        </div>
        <div class="tiptap-toolbar-separator"></div>
        <div class="tiptap-toolbar-group">
          <button type="button" class="tiptap-toolbar-button" data-action="h1" title="Heading 1">H1</button>
          <button type="button" class="tiptap-toolbar-button" data-action="h2" title="Heading 2">H2</button>
          <button type="button" class="tiptap-toolbar-button" data-action="h3" title="Heading 3">H3</button>
        </div>
        <div class="tiptap-toolbar-separator"></div>
        <div class="tiptap-toolbar-group">
          <button type="button" class="tiptap-toolbar-button" data-action="bulletList" title="Bullet List">• List</button>
          <button type="button" class="tiptap-toolbar-button" data-action="orderedList" title="Ordered List">1. List</button>
        </div>
        <div class="tiptap-toolbar-separator"></div>
        <div class="tiptap-toolbar-group">
          <button type="button" class="tiptap-toolbar-button" data-action="codeBlock" title="Code Block">{ }</button>
          <button type="button" class="tiptap-toolbar-button" data-action="link" title="Link">Link</button>
          <button type="button" class="tiptap-toolbar-button" data-action="image" title="Image">Image</button>
        </div>
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
      requestAnimationFrame(() => {
        renderNavigation();
        // Only highlight tags in edit mode to avoid visual changes in read mode
        if (nestConfig.isOwnNest) {
          highlightTags();
        }
      });

      // Setup toolbar buttons
      if (nestConfig.isOwnNest) {
        setupToolbar();
      }

      // Enable image zoom in read-only mode
      if (!nestConfig.isOwnNest) {
        // Wait for DOM to be ready before initializing zoom
        requestAnimationFrame(() => {
          initImageZoom();
        });
        requestAnimationFrame(() => {
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

    // Sections storage (in localStorage for now)
    const SECTIONS_KEY = `nest-sections-${nestConfig.urlUsername || 'default'}`;

    const getSections = () => {
      try {
        return JSON.parse(localStorage.getItem(SECTIONS_KEY) || '[]');
      } catch {
        return [];
      }
    };

    const saveSections = (sections) => {
      localStorage.setItem(SECTIONS_KEY, JSON.stringify(sections));
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

      // Create navigation container if it doesn't exist
      let navContainer = document.querySelector('.nest-navigation-content');
      if (!navContainer) {
        navContainer = document.createElement('div');
        navContainer.className = 'nest-navigation-content';
        // Insert AFTER nest-nav, not at the end of sidebar
        const nestNav = document.querySelector('.nest-nav');
        if (nestNav && nestNav.parentElement) {
          nestNav.parentElement.insertBefore(navContainer, nestNav.nextSibling);
        }
      }

      // Clear and rebuild
      navContainer.innerHTML = '';

      // Always show navigation (even if empty)
      navContainer.style.display = 'block';

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
        addSectionLink.textContent = '[Добавить раздел]';
        addSectionLink.href = '#';

        addSectionLink.addEventListener('click', (e) => {
          e.preventDefault();
          const sectionName = prompt('Название раздела:');
          if (sectionName && sectionName.trim()) {
            addSection(sectionName.trim());
          }
        });

        addSectionContainer.appendChild(addSectionLink);
        navContainer.appendChild(addSectionContainer);
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
        });
      });

      // Posts
      document.querySelectorAll('.nav-post').forEach(postEl => {
        postEl.addEventListener('click', (e) => {
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

    // Toggle navigation panel
    const navToggle = document.querySelector('.nest-nav-item[href="#navigation"]');
    if (navToggle) {
      navToggle.addEventListener('click', (e) => {
        e.preventDefault();
        const navContent = document.querySelector('.nest-navigation-content');
        if (navContent) {
          navContent.style.display = navContent.style.display === 'none' ? 'block' : 'none';
        }
      });
    }

    // Meta panel
    const metaToggle = document.querySelector('.nest-nav-item[href="#meta"]');
    if (metaToggle) {
      metaToggle.addEventListener('click', (e) => {
        e.preventDefault();
        let metaContent = document.querySelector('.nest-meta-content');
        if (!metaContent) {
          metaContent = document.createElement('div');
          metaContent.className = 'nest-navigation-content nest-meta-content';
          metaContent.innerHTML = '<div class="nav-empty">Пока пусто</div>';
          const nestNav = document.querySelector('.nest-nav');
          if (nestNav && nestNav.parentElement) {
            nestNav.parentElement.insertBefore(metaContent, nestNav.nextSibling.nextSibling || nestNav.nextSibling);
          }
        }
        metaContent.style.display = metaContent.style.display === 'none' ? 'block' : 'none';
      });
    }

    // Discussions panel
    const discussionsToggle = document.querySelector('.nest-nav-item[href="#discussions"]');
    if (discussionsToggle) {
      discussionsToggle.addEventListener('click', (e) => {
        e.preventDefault();
        let discussionsContent = document.querySelector('.nest-discussions-content');
        if (!discussionsContent) {
          discussionsContent = document.createElement('div');
          discussionsContent.className = 'nest-navigation-content nest-discussions-content';
          discussionsContent.innerHTML = '<div class="nav-empty">Пока пусто</div>';
          const nestNav = document.querySelector('.nest-nav');
          if (nestNav && nestNav.parentElement) {
            nestNav.parentElement.appendChild(discussionsContent);
          }
        }
        discussionsContent.style.display = discussionsContent.style.display === 'none' ? 'block' : 'none';
      });
    }

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
