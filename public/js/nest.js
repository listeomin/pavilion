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

  // Editor.js for Nest content
  const editorContainer = document.getElementById('nest-editor');
  if (editorContainer && nestConfig.urlUsername) {
    console.log('[Nest] Initializing Editor.js...');

    let editor;
    let saveTimeout = null;
    let isSaving = false;

    // Configure Editor.js
    const initEditor = async (initialData = null) => {
      editor = new EditorJS({
        holder: 'nest-editor',
        readOnly: !nestConfig.isOwnNest,
        placeholder: nestConfig.isOwnNest ? 'Начните печатать или нажмите Tab для команд...' : '',
        data: initialData || {
          blocks: []
        },
        tools: {
          header: {
            class: Header,
            config: {
              placeholder: 'Заголовок',
              levels: [1, 2, 3],
              defaultLevel: 2
            },
            inlineToolbar: true
          },
          list: {
            class: List,
            inlineToolbar: true,
            config: {
              defaultStyle: 'unordered'
            }
          },
          quote: {
            class: Quote,
            inlineToolbar: true,
            config: {
              quotePlaceholder: 'Введите цитату',
              captionPlaceholder: 'Автор цитаты'
            }
          },
          delimiter: Delimiter,
          inlineCode: {
            class: InlineCode
          }
        },
        onChange: async () => {
          if (!nestConfig.isOwnNest) return;

          // Debounced autosave
          if (saveTimeout) {
            clearTimeout(saveTimeout);
          }

          saveTimeout = setTimeout(async () => {
            await saveContent();
          }, 2000);
        }
      });

      await editor.isReady;
      console.log('[Nest] Editor.js ready!');
    };

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

          // Convert Quill Delta to Editor.js format if needed
          let editorData = result.content;
          if (result.content.ops) {
            // This is Quill Delta format - convert it
            editorData = convertQuillToEditorJS(result.content);
            console.log('[Nest] Converted Quill → Editor.js:', editorData);
          }

          await initEditor(editorData);
        } else {
          console.log('[Nest] No content found, starting with empty editor');
          await initEditor();
        }
      } catch (err) {
        console.error('[Nest] Error loading content:', err);
        await initEditor();
      }
    };

    // Save content to server
    const saveContent = async () => {
      if (isSaving || !editor) return;

      isSaving = true;
      console.log('[Nest] Saving content...');

      try {
        const savedData = await editor.save();
        const response = await fetch(CONFIG.BASE_PATH + '/api/nest_content.php?action=save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: savedData })
        });

        const result = await response.json();

        if (result.success) {
          console.log('[Nest] Content saved successfully');
        } else {
          console.error('[Nest] Save error:', result.error);
        }
      } catch (err) {
        console.error('[Nest] Save error:', err);
      } finally {
        isSaving = false;
      }
    };

    // Convert Quill Delta to Editor.js blocks
    const convertQuillToEditorJS = (quillData) => {
      const blocks = [];
      let currentText = '';
      let currentType = 'paragraph';
      let currentLevel = 2;

      if (!quillData.ops) {
        return { blocks: [] };
      }

      for (const op of quillData.ops) {
        const text = op.insert || '';
        const attrs = op.attributes || {};

        if (text === '\n') {
          // New block
          if (currentText.trim()) {
            if (attrs.header) {
              blocks.push({
                type: 'header',
                data: {
                  text: currentText.trim(),
                  level: attrs.header
                }
              });
            } else if (attrs.blockquote) {
              blocks.push({
                type: 'quote',
                data: {
                  text: currentText.trim()
                }
              });
            } else {
              blocks.push({
                type: 'paragraph',
                data: {
                  text: currentText.trim()
                }
              });
            }
          }
          currentText = '';
        } else {
          currentText += text;
        }
      }

      // Add remaining text
      if (currentText.trim()) {
        blocks.push({
          type: 'paragraph',
          data: {
            text: currentText.trim()
          }
        });
      }

      return { blocks: blocks };
    };

    // Initialize editor with content
    loadContent();

    // Make editor globally accessible
    window.nestEditor = () => editor;

    // Markdown shortcuts for headings
    if (nestConfig.isOwnNest && editor) {
      document.addEventListener('keydown', async (e) => {
        if (e.key !== ' ') return;

        // Get current block
        const currentBlockIndex = editor.blocks.getCurrentBlockIndex();
        const currentBlock = editor.blocks.getBlockByIndex(currentBlockIndex);

        if (!currentBlock || currentBlock.name !== 'paragraph') return;

        // Get block text
        const blockData = await editor.save();
        const block = blockData.blocks[currentBlockIndex];
        if (!block || !block.data || !block.data.text) return;

        const text = block.data.text.trim();

        // Check for markdown heading syntax (without trailing space)
        let level = 0;
        let cleanText = text;

        if (text === '###' || text.startsWith('### ')) {
          level = 3;
          cleanText = text === '###' ? '' : text.substring(4);
        } else if (text === '##' || text.startsWith('## ')) {
          level = 2;
          cleanText = text === '##' ? '' : text.substring(3);
        } else if (text === '#' || text.startsWith('# ')) {
          level = 1;
          cleanText = text === '#' ? '' : text.substring(2);
        }

        if (level > 0) {
          e.preventDefault();

          // Convert to header
          setTimeout(async () => {
            try {
              await editor.blocks.delete(currentBlockIndex);
              await editor.blocks.insert('header', {
                text: cleanText,
                level: level
              }, {}, currentBlockIndex);

              // Move cursor to end of the new block
              editor.caret.setToBlock(currentBlockIndex, 'end');
            } catch (err) {
              console.error('[Nest] Error converting to header:', err);
            }
          }, 0);
        }
      });

      console.log('[Nest] Markdown shortcuts enabled (# ## ###)');
    }

    // Terminal readline shortcuts
    let killRing = ''; // Store killed text for yank (Ctrl+Y)
    console.log('[Readline] Shortcuts initialized');

    document.addEventListener('keydown', (e) => {
      // Debug: log all Ctrl key presses
      if (e.ctrlKey && ['a', 'e', 'u', 'k', 'w', 'd', 'f', 'b', 't', 'h', 'y'].includes(e.key)) {
        console.log('[Readline] Hotkey detected:', e.ctrlKey, e.altKey, e.key, 'target:', e.target);
      }

      // Only apply shortcuts when editing in Editor.js
      const target = e.target;

      // Check if we're in an editable element
      const isEditable = target.isContentEditable ||
                        target.getAttribute('contenteditable') === 'true' ||
                        target.closest('[contenteditable="true"]');

      if (!isEditable) {
        console.log('[Readline] Not in editable element');
        return;
      }

      // Skip if we're in the h1 title editor
      if (target.tagName === 'H1' || target.closest('h1')) {
        console.log('[Readline] Skipping h1 editor');
        return;
      }

      const selection = window.getSelection();
      if (!selection.rangeCount) return;

      const range = selection.getRangeAt(0);

      // Helper functions
      const getEditableElement = () => {
        // Find the contentEditable container
        let el = target;
        while (el && el.getAttribute('contenteditable') !== 'true') {
          el = el.parentElement;
        }
        return el || target;
      };

      const getTextNode = () => {
        const editable = getEditableElement();
        // Get the first text node or create one
        let textNode = editable.firstChild;
        if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
          textNode = document.createTextNode(editable.textContent || '');
          editable.textContent = '';
          editable.appendChild(textNode);
        }
        return textNode;
      };

      const getLineText = () => {
        const editable = getEditableElement();
        return editable.textContent || '';
      };

      const getCursorPos = () => {
        const editable = getEditableElement();
        let pos = 0;
        const walker = document.createTreeWalker(
          editable,
          NodeFilter.SHOW_TEXT,
          null,
          false
        );

        let node;
        while ((node = walker.nextNode())) {
          if (node === range.startContainer) {
            return pos + range.startOffset;
          }
          pos += node.textContent.length;
        }
        return pos;
      };

      const setCursorPos = (pos) => {
        const textNode = getTextNode();
        const safePos = Math.min(Math.max(0, pos), textNode.textContent.length);

        try {
          const newRange = document.createRange();
          newRange.setStart(textNode, safePos);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
        } catch (err) {
          console.error('[Readline] Error setting cursor:', err);
        }
      };

      const deleteText = (start, end) => {
        const editable = getEditableElement();
        const text = getLineText();
        const before = text.substring(0, start);
        const after = text.substring(end);
        editable.textContent = before + after;

        // Trigger Editor.js change event
        editable.dispatchEvent(new Event('input', { bubbles: true }));

        setTimeout(() => setCursorPos(start), 0);
      };

      const insertText = (text) => {
        const pos = getCursorPos();
        const editable = getEditableElement();
        const lineText = getLineText();
        const before = lineText.substring(0, pos);
        const after = lineText.substring(pos);
        editable.textContent = before + text + after;

        // Trigger Editor.js change event
        editable.dispatchEvent(new Event('input', { bubbles: true }));

        setTimeout(() => setCursorPos(pos + text.length), 0);
      };

      // Navigation shortcuts
      if (e.ctrlKey && e.key === 'a') {
        e.preventDefault();
        setCursorPos(0); // Beginning of line
        return;
      }

      if (e.ctrlKey && e.key === 'e') {
        e.preventDefault();
        setCursorPos(getLineText().length); // End of line
        return;
      }

      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        const pos = getCursorPos();
        setCursorPos(Math.min(pos + 1, getLineText().length)); // Forward one char
        return;
      }

      if (e.ctrlKey && e.key === 'b') {
        e.preventDefault();
        const pos = getCursorPos();
        setCursorPos(Math.max(0, pos - 1)); // Back one char
        return;
      }

      if (e.altKey && e.key === 'f') {
        e.preventDefault();
        const text = getLineText();
        const pos = getCursorPos();
        const match = text.substring(pos).match(/\w+/);
        if (match) {
          setCursorPos(pos + match.index + match[0].length); // Forward one word
        }
        return;
      }

      if (e.altKey && e.key === 'b') {
        e.preventDefault();
        const text = getLineText();
        const beforeCursor = text.substring(0, getCursorPos());
        const match = beforeCursor.match(/\w+(?=\W*$)/);
        if (match) {
          setCursorPos(match.index); // Back one word
        }
        return;
      }

      // Deletion shortcuts
      if (e.ctrlKey && e.key === 'u') {
        e.preventDefault();
        const pos = getCursorPos();
        const text = getLineText();
        killRing = text.substring(0, pos);
        deleteText(0, pos); // Kill to beginning of line
        return;
      }

      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        const pos = getCursorPos();
        const text = getLineText();
        killRing = text.substring(pos);
        deleteText(pos, text.length); // Kill to end of line
        return;
      }

      if (e.ctrlKey && e.key === 'w') {
        e.preventDefault();
        const text = getLineText();
        const pos = getCursorPos();
        const beforeCursor = text.substring(0, pos);
        const match = beforeCursor.match(/\w+(?=\W*$)/);
        if (match) {
          killRing = beforeCursor.substring(match.index);
          deleteText(match.index, pos); // Kill word before cursor
        }
        return;
      }

      if (e.altKey && e.key === 'd') {
        e.preventDefault();
        const text = getLineText();
        const pos = getCursorPos();
        const afterCursor = text.substring(pos);
        const match = afterCursor.match(/\w+/);
        if (match) {
          killRing = match[0];
          deleteText(pos, pos + match.index + match[0].length); // Kill word after cursor
        }
        return;
      }

      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        const pos = getCursorPos();
        deleteText(pos, pos + 1); // Delete char under cursor
        return;
      }

      if (e.ctrlKey && e.key === 'h') {
        e.preventDefault();
        const pos = getCursorPos();
        if (pos > 0) {
          deleteText(pos - 1, pos); // Delete char before cursor (backspace)
        }
        return;
      }

      // Yank (paste killed text)
      if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        if (killRing) {
          insertText(killRing);
        }
        return;
      }

      // Transpose characters
      if (e.ctrlKey && e.key === 't') {
        e.preventDefault();
        const text = getLineText();
        const pos = getCursorPos();
        if (pos > 0 && pos < text.length) {
          const before = text.substring(0, pos - 1);
          const char1 = text[pos - 1];
          const char2 = text[pos];
          const after = text.substring(pos + 1);
          target.textContent = before + char2 + char1 + after;
          setCursorPos(pos + 1);
        }
        return;
      }

      // Transpose words
      if (e.altKey && e.key === 't') {
        e.preventDefault();
        const text = getLineText();
        const pos = getCursorPos();
        const beforeCursor = text.substring(0, pos);
        const afterCursor = text.substring(pos);

        const word1Match = beforeCursor.match(/(\w+)(\W*)$/);
        const word2Match = afterCursor.match(/^(\W*)(\w+)/);

        if (word1Match && word2Match) {
          const word1 = word1Match[1];
          const space1 = word1Match[2];
          const space2 = word2Match[1];
          const word2 = word2Match[2];

          const before = beforeCursor.substring(0, beforeCursor.length - word1.length - space1.length);
          const after = afterCursor.substring(space2.length + word2.length);

          target.textContent = before + word2 + space1 + space2 + word1 + after;
          setCursorPos(before.length + word2.length + space1.length + space2.length + word1.length);
        }
        return;
      }

      // Case manipulation
      if (e.altKey && e.key === 'u') {
        e.preventDefault();
        const text = getLineText();
        const pos = getCursorPos();
        const afterCursor = text.substring(pos);
        const match = afterCursor.match(/\w+/);
        if (match) {
          const before = text.substring(0, pos + match.index);
          const word = match[0].toUpperCase();
          const after = text.substring(pos + match.index + match[0].length);
          target.textContent = before + word + after;
          setCursorPos(pos + match.index + word.length);
        }
        return;
      }

      if (e.altKey && e.key === 'l') {
        e.preventDefault();
        const text = getLineText();
        const pos = getCursorPos();
        const afterCursor = text.substring(pos);
        const match = afterCursor.match(/\w+/);
        if (match) {
          const before = text.substring(0, pos + match.index);
          const word = match[0].toLowerCase();
          const after = text.substring(pos + match.index + match[0].length);
          target.textContent = before + word + after;
          setCursorPos(pos + match.index + word.length);
        }
        return;
      }

      if (e.altKey && e.key === 'c') {
        e.preventDefault();
        const text = getLineText();
        const pos = getCursorPos();
        const afterCursor = text.substring(pos);
        const match = afterCursor.match(/\w+/);
        if (match) {
          const before = text.substring(0, pos + match.index);
          const word = match[0].charAt(0).toUpperCase() + match[0].slice(1).toLowerCase();
          const after = text.substring(pos + match.index + match[0].length);
          target.textContent = before + word + after;
          setCursorPos(pos + match.index + word.length);
        }
        return;
      }
    });
  }
})();
