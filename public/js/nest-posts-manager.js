// nest-posts-manager.js
import { Editor } from 'https://esm.sh/@tiptap/core@2.1.13';
import StarterKit from 'https://esm.sh/@tiptap/starter-kit@2.1.13';
import Link from 'https://esm.sh/@tiptap/extension-link@2.1.13';
import Image from 'https://esm.sh/@tiptap/extension-image@2.1.13';
import Placeholder from 'https://esm.sh/@tiptap/extension-placeholder@2.1.13';

export class NestPostsManager {
  constructor(config, apiPath) {
    this.config = config;
    this.apiPath = apiPath;
    this.posts = [];
    this.editors = new Map();
    this.saveTimers = new Map();
  }

  // Update editor-active state based on active editors
  updateEditorActiveState() {
    if (this.editors.size > 0) {
      document.body.classList.add('editor-active');
    } else {
      document.body.classList.remove('editor-active');
    }
  }

  async loadPosts() {
    const url = `${this.apiPath}/api/nest_posts.php?action=list&username=${encodeURIComponent(this.config.urlUsername)}`;
    const response = await fetch(url);
    const result = await response.json();
    if (result.success && result.posts) {
      this.posts = result.posts;
    }
    return this.posts;
  }

  renderPostsList(container) {
    container.innerHTML = '';

    if (this.config.isOwnNest) {
      const beforeFirstZone = this.createInsertZone(0);
      container.appendChild(beforeFirstZone);
    }

    this.posts.forEach((post) => {
      const postEl = this.createPostElement(post);
      container.appendChild(postEl);

      if (this.config.isOwnNest) {
        const insertZone = this.createInsertZone(post.position + 1);
        container.appendChild(insertZone);
      }
    });
  }

  convertJsonToHtml(jsonContent) {
    if (!jsonContent || jsonContent === '{}' || jsonContent.trim() === '') {
      return '<p><br></p>';
    }

    try {
      // Try to parse as JSON
      const parsed = JSON.parse(jsonContent);

      // Create temporary editor to convert JSON to HTML
      const tempDiv = document.createElement('div');
      const tempEditor = new Editor({
        element: tempDiv,
        extensions: [StarterKit, Link, Image],
        content: parsed,
      });
      const html = tempEditor.getHTML();
      tempEditor.destroy();
      return html;
    } catch (e) {
      // If not JSON, treat as HTML
      return jsonContent;
    }
  }

  createPostElement(post) {
    const postEl = document.createElement('article');
    postEl.className = 'nest-post';
    postEl.dataset.postId = post.id;
    postEl.dataset.position = post.position;

    // Title display (read-only)
    if (post.title && post.title.trim() !== '' && post.title !== 'Новая статья') {
      const titleEl = document.createElement('h1');
      titleEl.className = 'nest-post-title-display';
      titleEl.textContent = post.title;
      postEl.appendChild(titleEl);
    }

    // Dates display (read-only)
    const formatDate = (dateStr) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    };

    const datesSection = document.createElement('div');
    datesSection.className = 'nest-post-dates';

    // Created date
    if (post.created_at) {
      const createdDiv = document.createElement('div');
      createdDiv.className = 'nest-post-date';
      createdDiv.innerHTML = `
        <img src="assets/date-create.svg" alt="Создано" class="nest-post-date-icon">
        <span>Создано ${formatDate(post.created_at)}</span>
      `;
      datesSection.appendChild(createdDiv);
    }

    // Published date
    const publishedDiv = document.createElement('div');
    publishedDiv.className = 'nest-post-date';
    publishedDiv.innerHTML = `
      <img src="assets/date-publish.svg" alt="Опубликовано" class="nest-post-date-icon">
      <span>Опубликовано ${formatDate(post.created_at)}</span>
    `;
    datesSection.appendChild(publishedDiv);

    // Updated date
    if (post.updated_at) {
      const updatedDiv = document.createElement('div');
      updatedDiv.className = 'nest-post-date';
      updatedDiv.innerHTML = `
        <img src="assets/date-edit.svg" alt="Изменено" class="nest-post-date-icon">
        <span>Изменено ${formatDate(post.updated_at)}</span>
      `;
      datesSection.appendChild(updatedDiv);
    }

    postEl.appendChild(datesSection);

    const contentEl = document.createElement('div');
    contentEl.className = 'nest-post-content';
    // Convert JSON to HTML for display
    contentEl.innerHTML = this.convertJsonToHtml(post.content);
    postEl.appendChild(contentEl);

    if (this.config.isOwnNest) {
      postEl.addEventListener('mouseenter', () => {
        if (!this.editors.has(post.id)) postEl.classList.add('nest-post-hover');
      });
      postEl.addEventListener('mouseleave', () => {
        postEl.classList.remove('nest-post-hover');
      });
      postEl.addEventListener('click', (e) => {
        if (e.target.tagName === 'A') return;
        if (!this.editors.has(post.id)) this.activateEditor(post, postEl);
      });
    }

    return postEl;
  }

  createInsertZone(position) {
    const zone = document.createElement('div');
    zone.className = 'nest-insert-zone';
    zone.textContent = 'Напишите что-нибудь';
    zone.addEventListener('click', () => this.createNewPost(position));
    return zone;
  }

  createToolbar(postId) {
    const toolbar = document.createElement('div');
    toolbar.className = 'tiptap-toolbar';
    toolbar.innerHTML = `
      <div class="tiptap-toolbar-group">
        <button type="button" class="tiptap-toolbar-button" data-action="bold" title="Bold (Ctrl+B)">
          <img src="assets/tiptap/bold.svg" alt="Bold" width="24" height="24">
        </button>
        <button type="button" class="tiptap-toolbar-button" data-action="italic" title="Italic (Ctrl+I)">
          <img src="assets/tiptap/Italic.svg" alt="Italic" width="24" height="24">
        </button>
        <button type="button" class="tiptap-toolbar-button" data-action="code" title="Code (Ctrl+E)">
          <img src="assets/tiptap/code.svg" alt="Code" width="24" height="24">
        </button>
      </div>
      <div class="tiptap-toolbar-separator"></div>
      <div class="tiptap-toolbar-group">
        <button type="button" class="tiptap-toolbar-button" data-action="h1" title="Heading 1">
          <img src="assets/tiptap/h1.svg" alt="H1" width="24" height="24">
        </button>
        <button type="button" class="tiptap-toolbar-button" data-action="h2" title="Heading 2">
          <img src="assets/tiptap/h2.svg" alt="H2" width="24" height="24">
        </button>
        <button type="button" class="tiptap-toolbar-button" data-action="h3" title="Heading 3">
          <img src="assets/tiptap/h3.svg" alt="H3" width="24" height="24">
        </button>
      </div>
      <div class="tiptap-toolbar-separator"></div>
      <div class="tiptap-toolbar-group">
        <button type="button" class="tiptap-toolbar-button" data-action="bulletList" title="Bullet List">
          <img src="assets/tiptap/list-dashes.svg" alt="Bullet List" width="24" height="24">
        </button>
        <button type="button" class="tiptap-toolbar-button" data-action="orderedList" title="Ordered List">
          <img src="assets/tiptap/list-numbers.svg" alt="Ordered List" width="24" height="24">
        </button>
      </div>
      <div class="tiptap-toolbar-separator"></div>
      <div class="tiptap-toolbar-group">
        <button type="button" class="tiptap-toolbar-button" data-action="codeBlock" title="Code Block">
          <img src="assets/tiptap/code-block.svg" alt="Code Block" width="24" height="24">
        </button>
        <button type="button" class="tiptap-toolbar-button" data-action="link" title="Link">
          <img src="assets/tiptap/link.svg" alt="Link" width="24" height="24">
        </button>
        <button type="button" class="tiptap-toolbar-button" data-action="image" title="Image">
          <img src="assets/tiptap/image.svg" alt="Image" width="24" height="24">
        </button>
      </div>
      <div class="tiptap-toolbar-separator"></div>
      <div class="tiptap-toolbar-group">
        <button type="button" class="tiptap-toolbar-button tiptap-toolbar-delete" data-action="delete" data-post-id="${postId}" title="Удалить статью">
          <img src="assets/tiptap/del.svg" alt="Delete" width="24" height="24">
        </button>
      </div>
    `;
    return toolbar;
  }

  setupToolbar(editor, toolbar) {
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

                const response = await fetch(this.apiPath + '/api/upload_image.php', {
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
                console.error('[NestPostsManager] Error uploading image:', err);
                alert('Ошибка: ' + err.message);
              }
            };
            input.click();
            break;
          case 'delete':
            const postId = btn.dataset.postId;
            if (postId) {
              this.deletePost(postId);
            }
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
  }

  activateEditor(post, postEl) {
    const contentEl = postEl.querySelector('.nest-post-content');
    let currentHtml = contentEl.innerHTML;

    // Don't use '{}' or empty JSON as content - leave editor empty to show placeholder
    if (currentHtml === '{}' || currentHtml.trim() === '' || currentHtml === '<p><br></p>') {
      currentHtml = '';
    }

    contentEl.innerHTML = '';

    // Hide view-mode elements (title, dates)
    const titleDisplay = postEl.querySelector('.nest-post-title-display');
    const viewDates = postEl.querySelector('.nest-post-dates');

    if (titleDisplay) titleDisplay.style.display = 'none';
    if (viewDates) viewDates.style.display = 'none';

    // Create wrapper for editor + toolbar
    const wrapper = document.createElement('div');
    wrapper.className = 'tiptap-editor-wrapper';

    // Create metadata section
    const metaSection = document.createElement('div');
    metaSection.className = 'nest-post-meta';

    // Title input
    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.className = 'nest-post-title-input';
    titleInput.placeholder = 'Название статьи';
    titleInput.value = post.title || '';
    titleInput.dataset.postId = post.id;
    metaSection.appendChild(titleInput);

    // Dates section
    const datesSection = document.createElement('div');
    datesSection.className = 'nest-post-dates';

    const formatDate = (dateStr) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    };

    // Created date
    if (post.created_at) {
      const createdDiv = document.createElement('div');
      createdDiv.className = 'nest-post-date';
      createdDiv.innerHTML = `
        <img src="assets/date-create.svg" alt="Создано" class="nest-post-date-icon">
        <span>Создано ${formatDate(post.created_at)}</span>
      `;
      datesSection.appendChild(createdDiv);
    }

    // Published date (if different from created)
    const publishedDiv = document.createElement('div');
    publishedDiv.className = 'nest-post-date';
    publishedDiv.innerHTML = `
      <img src="assets/date-publish.svg" alt="Опубликовано" class="nest-post-date-icon">
      <span>Опубликовано ${formatDate(post.created_at)}</span>
    `;
    datesSection.appendChild(publishedDiv);

    // Updated date
    if (post.updated_at) {
      const updatedDiv = document.createElement('div');
      updatedDiv.className = 'nest-post-date';
      updatedDiv.innerHTML = `
        <img src="assets/date-edit.svg" alt="Изменено" class="nest-post-date-icon">
        <span>Изменено ${formatDate(post.updated_at)}</span>
      `;
      datesSection.appendChild(updatedDiv);
    }

    metaSection.appendChild(datesSection);
    wrapper.appendChild(metaSection);

    // Create and add toolbar
    const toolbar = this.createToolbar(post.id);
    wrapper.appendChild(toolbar);

    // Create editor element
    const editorEl = document.createElement('div');
    editorEl.className = 'nest-post-editor';
    wrapper.appendChild(editorEl);

    contentEl.appendChild(wrapper);

    const editor = new Editor({
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
          placeholder: 'Начните писать...',
        }),
      ],
      content: currentHtml,
      editable: true,
      autofocus: true,
      onUpdate: ({ editor }) => this.scheduleAutosave(post.id, editor),
    });

    // Setup toolbar functionality
    this.setupToolbar(editor, toolbar);

    // Handle title changes
    titleInput.addEventListener('input', () => {
      clearTimeout(titleInput.saveTimer);
      titleInput.saveTimer = setTimeout(() => {
        this.saveMetadata(post.id, { title: titleInput.value });
      }, 1000);
    });

    // Handle clicks outside editor to close it
    const handleClickOutside = (e) => {
      const editorWrapper = postEl.querySelector('.tiptap-editor-wrapper');
      if (!editorWrapper || !editorWrapper.contains(e.target)) {
        // Clicked outside - check if empty and delete or save
        const titleInput = postEl.querySelector('.nest-post-title-input');
        const title = titleInput ? titleInput.value.trim() : '';
        const contentEmpty = editor.isEmpty || editor.getText().trim() === '';
        const isEmpty = contentEmpty && title === '';

        document.removeEventListener('click', handleClickOutside);

        if (isEmpty) {
          // Delete empty post automatically without confirmation
          this.deletePost(post.id, true);
        } else {
          // Save non-empty post
          this.savePost(post.id, editor);
          this.deactivateEditor(post.id, postEl);
        }
      }
    };

    // Add click listener with a delay to avoid immediate trigger
    setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 100);

    this.editors.set(post.id, editor);
    postEl.classList.add('nest-post-editing');
    postEl.classList.remove('nest-post-hover');

    // Disable insert zones while editing
    this.updateEditorActiveState();
  }

  async deactivateEditor(postId, postEl) {
    const editor = this.editors.get(postId);
    if (!editor) return;

    editor.destroy();
    this.editors.delete(postId);

    // Reload post data
    await this.loadPosts();
    const post = this.posts.find(p => p.id == postId);

    if (post) {
      // Replace only this post element, don't re-render entire list
      const newPostEl = this.createPostElement(post);
      postEl.replaceWith(newPostEl);
    } else {
      // Post was deleted, remove element
      postEl.remove();
    }

    // Re-enable insert zones if no editors are active
    this.updateEditorActiveState();
  }

  scheduleAutosave(postId, editor) {
    if (this.saveTimers.has(postId)) clearTimeout(this.saveTimers.get(postId));
    const timer = setTimeout(() => this.savePost(postId, editor), 2000);
    this.saveTimers.set(postId, timer);
  }

  async savePost(postId, editor) {
    const content = editor.getJSON();
    await fetch(`${this.apiPath}/api/nest_posts.php?action=update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: postId, content: JSON.stringify(content) })
    });
  }

  async saveMetadata(postId, metadata) {
    await fetch(`${this.apiPath}/api/nest_posts.php?action=update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: postId, ...metadata })
    });

    // Update post object in memory
    const post = this.posts.find(p => p.id == postId);
    if (post) {
      Object.assign(post, metadata);
    }

    // Update display elements
    const postEl = document.querySelector(`[data-post-id="${postId}"]`);
    if (postEl && metadata.title !== undefined) {
      const titleDisplay = postEl.querySelector('.nest-post-title-display');
      if (titleDisplay) {
        titleDisplay.textContent = metadata.title;
      }
    }
  }

  async createNewPost(position) {
    const response = await fetch(`${this.apiPath}/api/nest_posts.php?action=create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: '{}', position, title: '' })
    });

    const result = await response.json();
    if (result.success) {
      // Force clear title if server set it to something
      if (result.post && result.post.title && result.post.title.trim() !== '') {
        await this.saveMetadata(result.post.id, { title: '' });
      }

      await this.loadPosts();
      const post = this.posts.find(p => p.id == result.post.id);

      if (post) {
        // Ensure title is empty in memory
        post.title = '';

        const container = document.getElementById('nest-editor-container');

        // Create new post element
        const postEl = this.createPostElement(post);

        // Create insert zone after new post
        const insertZone = this.createInsertZone(position + 1);

        // Find where to insert based on position
        if (position === 0) {
          // Insert at the beginning (after first insert zone)
          const firstZone = container.querySelector('.nest-insert-zone');
          if (firstZone) {
            firstZone.after(postEl, insertZone);
          } else {
            container.prepend(postEl, insertZone);
          }
        } else {
          // Find the post or zone before this position and insert after it
          const allPosts = Array.from(container.querySelectorAll('.nest-post'));
          const prevPost = allPosts[position - 1];
          if (prevPost) {
            const prevZone = prevPost.nextElementSibling;
            if (prevZone && prevZone.classList.contains('nest-insert-zone')) {
              prevZone.after(postEl, insertZone);
            } else {
              prevPost.after(postEl, insertZone);
            }
          } else {
            container.append(postEl, insertZone);
          }
        }

        // Activate editor for new post
        this.activateEditor(post, postEl);
      }
    }
  }

  async deletePost(postId, skipConfirm = false) {
    // Show confirmation only if not auto-deleting empty post
    if (!skipConfirm && !confirm('Удалить статью?')) {
      return;
    }

    const response = await fetch(`${this.apiPath}/api/nest_posts.php?action=delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: postId })
    });

    const result = await response.json();
    if (result.success) {
      // Close editor if it's open
      const editor = this.editors.get(postId);
      if (editor) {
        editor.destroy();
        this.editors.delete(postId);
      }

      // Reload and re-render posts list
      await this.loadPosts();
      const container = document.getElementById('nest-editor-container');
      this.renderPostsList(container);

      // Re-enable insert zones if no editors are active
      this.updateEditorActiveState();
    }
  }
}
