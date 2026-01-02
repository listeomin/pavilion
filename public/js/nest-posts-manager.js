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

  createPostElement(post) {
    const postEl = document.createElement('article');
    postEl.className = 'nest-post';
    postEl.dataset.postId = post.id;
    postEl.dataset.position = post.position;

    const contentEl = document.createElement('div');
    contentEl.className = 'nest-post-content';
    contentEl.innerHTML = post.content || '<p><br></p>';
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

  activateEditor(post, postEl) {
    const contentEl = postEl.querySelector('.nest-post-content');
    const currentHtml = contentEl.innerHTML;
    contentEl.innerHTML = '';

    const editorEl = document.createElement('div');
    editorEl.className = 'nest-post-editor';
    contentEl.appendChild(editorEl);

    const editor = new Editor({
      element: editorEl,
      extensions: [StarterKit, Link, Image, Placeholder.configure({ placeholder: 'Начните писать...' })],
      content: currentHtml,
      editable: true,
      autofocus: true,
      onUpdate: ({ editor }) => this.scheduleAutosave(post.id, editor),
      onBlur: ({ editor }) => {
        this.savePost(post.id, editor);
        setTimeout(() => this.deactivateEditor(post.id, postEl), 200);
      }
    });

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
}
