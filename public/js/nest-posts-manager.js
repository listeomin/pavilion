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
      const createBtn = document.createElement('button');
      createBtn.className = 'nest-create-post-btn';
      createBtn.textContent = '+ Создать статью';
      createBtn.addEventListener('click', () => this.createNewPost(0));
      container.appendChild(createBtn);

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

    // Slug display (read-only)
    if (post.slug && post.slug.trim() !== '' && !post.slug.startsWith('post-')) {
      const slugEl = document.createElement('div');
      slugEl.className = 'nest-post-slug-display';
      slugEl.textContent = post.slug;
      postEl.appendChild(slugEl);
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
    const hint = document.createElement('div');
    hint.className = 'nest-insert-hint';
    hint.textContent = 'Нажмите чтобы создать статью';
    zone.appendChild(hint);
    zone.addEventListener('click', () => this.createNewPost(position));
    return zone;
  }

  createToolbar(postId) {
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
      <div class="tiptap-toolbar-separator"></div>
      <div class="tiptap-toolbar-group">
        <button type="button" class="tiptap-toolbar-button tiptap-toolbar-delete" data-action="delete" data-post-id="${postId}" title="Удалить статью">🗑</button>
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

    // Slug input
    const slugInput = document.createElement('input');
    slugInput.type = 'text';
    slugInput.className = 'nest-post-slug-input';
    slugInput.placeholder = 'slug';
    slugInput.value = post.slug || '';
    slugInput.dataset.postId = post.id;
    metaSection.appendChild(slugInput);

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

    // Handle title and slug changes
    titleInput.addEventListener('input', () => {
      clearTimeout(titleInput.saveTimer);
      titleInput.saveTimer = setTimeout(() => {
        this.saveMetadata(post.id, { title: titleInput.value });
      }, 1000);
    });

    slugInput.addEventListener('input', () => {
      clearTimeout(slugInput.saveTimer);
      slugInput.saveTimer = setTimeout(() => {
        this.saveMetadata(post.id, { slug: slugInput.value });
      }, 1000);
    });

    // Handle clicks outside editor to close it
    const handleClickOutside = (e) => {
      const editorWrapper = postEl.querySelector('.tiptap-editor-wrapper');
      if (!editorWrapper || !editorWrapper.contains(e.target)) {
        // Clicked outside - check if empty and delete or save
        const isEmpty = editor.isEmpty || editor.getText().trim() === '';

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
  }

  deactivateEditor(postId, postEl) {
    const editor = this.editors.get(postId);
    if (!editor) return;

    const contentEl = postEl.querySelector('.nest-post-content');
    const html = editor.getHTML();
    editor.destroy();
    this.editors.delete(postId);
    contentEl.innerHTML = html;
    postEl.classList.remove('nest-post-editing');
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
  }

  async createNewPost(position) {
    const response = await fetch(`${this.apiPath}/api/nest_posts.php?action=create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: '{}', position })
    });

    const result = await response.json();
    if (result.success) {
      await this.loadPosts();
      const container = document.getElementById('nest-editor-container');
      this.renderPostsList(container);

      const postEl = container.querySelector(`[data-post-id="${result.post.id}"]`);
      if (postEl) {
        const post = this.posts.find(p => p.id == result.post.id);
        if (post) this.activateEditor(post, postEl);
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
    }
  }
}
