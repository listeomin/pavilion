// nest.js - инициализация страницы Гнездо без чата
import { CONFIG } from './config.js?v=5';
import { getCookie, apiInit, apiChangeName } from './api.js?v=7';
import * as NightShift from './nightshift.js?v=1';
import { AnimalProfile } from './animalProfile.js?v=18';
import { TelegramAuth } from './telegramAuth.js?v=2';

// Function to align user header to the right edge of the title
function alignUserHeader() {
  const h1 = document.querySelector('h1');
  const userHeader = document.getElementById('user-header');

  if (h1 && userHeader) {
    const h1Rect = h1.getBoundingClientRect();
    const containerRect = h1.parentElement.getBoundingClientRect();
    const rightOffset = h1Rect.right - containerRect.left;

    userHeader.style.marginLeft = rightOffset - userHeader.offsetWidth + 'px';
  }
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
  setTimeout(alignUserHeader, 0);
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
  console.log('[Nest] Config:', nestConfig);

  // Инициализация Telegram Auth
  const telegramAuth = new TelegramAuth();

  console.log('[Nest] Checking Telegram auth...');
  const authData = await telegramAuth.checkAuth();
  console.log('[Nest] Auth data:', authData);

  // Show Telegram auth button ONLY on /nest (not on personal pages /nest/{username})
  if (!nestConfig.urlUsername) {
    // We're on /nest page (not personal page)
    if (authData && authData.telegram_id) {
      console.log('[Nest] User already authorized');
      const savedProfile = await animalProfile.loadAndApplyUserProfile();

      if (savedProfile) {
        console.log('[Nest] Using saved profile:', savedProfile);
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
      console.log('[Nest] Not authorized, showing login widget');
      telegramAuth.init('telegram-auth-container', 'hhrrrp_bot', async (newAuthData) => {
        console.log('[Nest] New Telegram authorization:', newAuthData);
        // Reload page - PHP will redirect to /nest/{user_id}
        location.reload();
      });
    }
  } else {
    // We're on /nest/{user_id} page
    console.log('[Nest] On personal page:', nestConfig.urlUserId);
    console.log('[Nest] Is own nest:', nestConfig.isOwnNest);

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
        console.log('[Nest] Saving name:', newName);
        const response = await fetch(CONFIG.BASE_PATH + '/api/update_nest_name.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newName })
        });

        console.log('[Nest] Response status:', response.status);
        const text = await response.text();
        console.log('[Nest] Response text:', text);

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

  // Global hotkey: "/" to go to Беседка page
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

  // Quill Editor for Nest content
  const editorContainer = document.getElementById('nest-editor');
  if (editorContainer && nestConfig.urlUsername) {
    console.log('[Nest] Initializing Quill editor...');

    // Configure Quill
    const quill = new Quill('#nest-editor', {
      theme: 'snow',
      modules: {
        toolbar: nestConfig.isOwnNest ? [
          [{ 'header': [1, 2, 3, false] }],
          ['bold', 'italic', 'link'],
          [{ 'list': 'ordered'}, { 'list': 'bullet' }],
          ['blockquote'],
          ['clean']
        ] : false
      },
      placeholder: nestConfig.isOwnNest ? 'Напишите что-нибудь...' : '',
      readOnly: !nestConfig.isOwnNest
    });

    // Load content from server
    const loadContent = async () => {
      try {
        const url = nestConfig.urlUsername
          ? CONFIG.BASE_PATH + '/api/nest_content.php?action=get&username=' + encodeURIComponent(nestConfig.urlUsername)
          : CONFIG.BASE_PATH + '/api/nest_content.php?action=get';
        const response = await fetch(url);
        const result = await response.json();

        if (result.success && result.content) {
          console.log('[Nest] Loading content:', result.content);
          quill.setContents(result.content);
        } else {
          console.log('[Nest] No content found or error:', result.error);
        }
      } catch (err) {
        console.error('[Nest] Error loading content:', err);
      }
    };

    // Load content on init
    loadContent();

    // Autosave functionality (only for own nest)
    if (nestConfig.isOwnNest) {
      let saveTimeout = null;
      let isSaving = false;

      const saveContent = async () => {
        if (isSaving) return;

        isSaving = true;
        console.log('[Nest] Saving content...');

        try {
          const content = quill.getContents();
          const response = await fetch(CONFIG.BASE_PATH + '/api/nest_content.php?action=save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: content })
          });

          const result = await response.json();

          if (result.success) {
            console.log('[Nest] Content saved successfully');
          } else {
            console.error('[Nest] Save error:', result.error);
          }
        } catch (err) {
          console.error('[Nest] Save network error:', err);
        } finally {
          isSaving = false;
        }
      };

      // Debounced autosave on text change
      quill.on('text-change', () => {
        if (saveTimeout) {
          clearTimeout(saveTimeout);
        }

        saveTimeout = setTimeout(() => {
          saveContent();
        }, 2000); // Save 2 seconds after user stops typing
      });

      console.log('[Nest] Autosave enabled (2s delay)');
    }

    // Make editor globally accessible
    window.nestQuill = quill;
  }
})();
