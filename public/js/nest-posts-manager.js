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
      createBtn.textContent = 'Напишите что-нибудь';
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
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path opacity="0.2" d="M18.75 15C18.75 15.9946 18.3549 16.9484 17.6517 17.6517C16.9484 18.3549 15.9946 18.75 15 18.75H7.5V4.5H13.875C14.7701 4.5 15.6285 4.85558 16.2615 5.48851C16.8944 6.12145 17.25 6.97989 17.25 7.875C17.25 8.77011 16.8944 9.62855 16.2615 10.2615C15.6285 10.8944 14.7701 11.25 13.875 11.25H15C15.9946 11.25 16.9484 11.6451 17.6517 12.3483C18.3549 13.0516 18.75 14.0054 18.75 15Z" fill="currentColor"/>
            <path d="M16.7325 10.8469C17.3249 10.2766 17.7334 9.54234 17.9055 8.73828C18.0775 7.93421 18.0054 7.09707 17.6983 6.3343C17.3912 5.57154 16.8631 4.91797 16.1818 4.45749C15.5006 3.99701 14.6973 3.75064 13.875 3.75H7.5C7.30109 3.75 7.11032 3.82902 6.96967 3.96967C6.82902 4.11032 6.75 4.30109 6.75 4.5V18.75C6.75 18.9489 6.82902 19.1397 6.96967 19.2803C7.11032 19.421 7.30109 19.5 7.5 19.5H15C16.0401 19.5 17.0481 19.1397 17.8526 18.4803C18.657 17.821 19.2082 16.9033 19.4124 15.8834C19.6166 14.8636 19.4612 13.8044 18.9726 12.8862C18.484 11.968 17.6925 11.2473 16.7325 10.8469ZM8.25 5.25H13.875C14.5712 5.25 15.2389 5.52656 15.7312 6.01884C16.2234 6.51113 16.5 7.17881 16.5 7.875C16.5 8.57119 16.2234 9.23887 15.7312 9.73116C15.2389 10.2234 14.5712 10.5 13.875 10.5H8.25V5.25ZM15 18H8.25V12H15C15.7956 12 16.5587 12.3161 17.1213 12.8787C17.6839 13.4413 18 14.2044 18 15C18 15.7956 17.6839 16.5587 17.1213 17.1213C16.5587 17.6839 15.7956 18 15 18Z" fill="currentColor"/>
          </svg>
        </button>
        <button type="button" class="tiptap-toolbar-button" data-action="italic" title="Italic (Ctrl+I)">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path opacity="0.2" d="M18 5.25L13.5 18.75H6L10.5 5.25H18Z" fill="currentColor"/>
            <path d="M18.75 5.25C18.75 5.44891 18.671 5.63968 18.5303 5.78033C18.3897 5.92098 18.1989 6 18 6H14.7909L10.7906 18H13.5C13.6989 18 13.8897 18.079 14.0303 18.2197C14.171 18.3603 14.25 18.5511 14.25 18.75C14.25 18.9489 14.171 19.1397 14.0303 19.2803C13.8897 19.421 13.6989 19.5 13.5 19.5H6C5.80109 19.5 5.61032 19.421 5.46967 19.2803C5.32902 19.1397 5.25 18.9489 5.25 18.75C5.25 18.5511 5.32902 18.3603 5.46967 18.2197C5.61032 18.079 5.80109 18 6 18H9.20906L13.2094 6H10.5C10.3011 6 10.1103 5.92098 9.96967 5.78033C9.82902 5.63968 9.75 5.44891 9.75 5.25C9.75 5.05109 9.82902 4.86032 9.96967 4.71967C10.1103 4.57902 10.3011 4.5 10.5 4.5H18C18.1989 4.5 18.3897 4.57902 18.5303 4.71967C18.671 4.86032 18.75 5.05109 18.75 5.25Z" fill="currentColor"/>
          </svg>
        </button>
        <button type="button" class="tiptap-toolbar-button" data-action="code" title="Code (Ctrl+E)">
          <img src="assets/tiptap/code.svg" alt="Code" width="24" height="24">
        </button>
      </div>
      <div class="tiptap-toolbar-separator"></div>
      <div class="tiptap-toolbar-group">
        <button type="button" class="tiptap-toolbar-button" data-action="h1" title="Heading 1">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6.75 4.5C6.75 4.30109 6.82902 4.11032 6.96967 3.96967C7.11032 3.82902 7.30109 3.75 7.5 3.75C7.69891 3.75 7.88968 3.82902 8.03033 3.96967C8.17098 4.11032 8.25 4.30109 8.25 4.5V11.25H15.75V4.5C15.75 4.30109 15.829 4.11032 15.9697 3.96967C16.1103 3.82902 16.3011 3.75 16.5 3.75C16.6989 3.75 16.8897 3.82902 17.0303 3.96967C17.171 4.11032 17.25 4.30109 17.25 4.5V19.5C17.25 19.6989 17.171 19.8897 17.0303 20.0303C16.8897 20.171 16.6989 20.25 16.5 20.25C16.3011 20.25 16.1103 20.171 15.9697 20.0303C15.829 19.8897 15.75 19.6989 15.75 19.5V12.75H8.25V19.5C8.25 19.6989 8.17098 19.8897 8.03033 20.0303C7.88968 20.171 7.69891 20.25 7.5 20.25C7.30109 20.25 7.11032 20.171 6.96967 20.0303C6.82902 19.8897 6.75 19.6989 6.75 19.5V4.5Z" fill="currentColor"/>
          </svg>
        </button>
        <button type="button" class="tiptap-toolbar-button" data-action="h2" title="Heading 2">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path opacity="0.2" d="M21 16.5V19.5H15V16.5C15 16.1022 15.158 15.7206 15.4393 15.4393C15.7206 15.158 16.1022 15 16.5 15H18C18.3978 15 18.7794 15.158 19.0607 15.4393C19.342 15.7206 19.5 16.1022 19.5 16.5Z" fill="currentColor"/>
            <path d="M7.5 3.75C7.69891 3.75 7.88968 3.82902 8.03033 3.96967C8.17098 4.11032 8.25 4.30109 8.25 4.5V11.25H15.75V4.5C15.75 4.30109 15.829 4.11032 15.9697 3.96967C16.1103 3.82902 16.3011 3.75 16.5 3.75C16.6989 3.75 16.8897 3.82902 17.0303 3.96967C17.171 4.11032 17.25 4.30109 17.25 4.5V12C17.25 12.1989 17.171 12.3897 17.0303 12.5303C16.8897 12.671 16.6989 12.75 16.5 12.75C16.3011 12.75 16.1103 12.671 15.9697 12.5303C15.829 12.3897 15.75 12.1989 15.75 12V11.25H8.25V12C8.25 12.1989 8.17098 12.3897 8.03033 12.5303C7.88968 12.671 7.69891 12.75 7.5 12.75C7.30109 12.75 7.11032 12.671 6.96967 12.5303C6.82902 12.3897 6.75 12.1989 6.75 12V4.5C6.75 4.30109 6.82902 4.11032 6.96967 3.96967C7.11032 3.82902 7.30109 3.75 7.5 3.75ZM18 14.25H16.5C15.9033 14.25 15.331 14.4871 14.909 14.909C14.4871 15.331 14.25 15.9033 14.25 16.5V19.5C14.25 19.6989 14.329 19.8897 14.4697 20.0303C14.6103 20.171 14.8011 20.25 15 20.25H21C21.1989 20.25 21.3897 20.171 21.5303 20.0303C21.671 19.8897 21.75 19.6989 21.75 19.5C21.75 19.3011 21.671 19.1103 21.5303 18.9697C21.3897 18.829 21.1989 18.75 21 18.75H15.75V16.5C15.75 16.3011 15.829 16.1103 15.9697 15.9697C16.1103 15.829 16.3011 15.75 16.5 15.75H18C18.5967 15.75 19.169 15.9871 19.591 16.409C20.0129 16.831 20.25 17.4033 20.25 18V18.75C20.25 18.9489 20.171 19.1397 20.0303 19.2803C19.8897 19.421 19.6989 19.5 19.5 19.5C19.3011 19.5 19.1103 19.421 18.9697 19.2803C18.829 19.1397 18.75 18.9489 18.75 18.75V18C18.75 17.8011 18.671 17.6103 18.5303 17.4697C18.3897 17.329 18.1989 17.25 18 17.25H16.5C16.3011 17.25 16.1103 17.329 15.9697 17.4697C15.829 17.6103 15.75 17.8011 15.75 18V18.75H21C21.1989 18.75 21.3897 18.829 21.5303 18.9697C21.671 19.1103 21.75 19.3011 21.75 19.5C21.75 19.6989 21.671 19.8897 21.5303 20.0303C21.3897 20.171 21.1989 20.25 21 20.25H15C14.8011 20.25 14.6103 20.171 14.4697 20.0303C14.329 19.8897 14.25 19.6989 14.25 19.5V16.5C14.25 15.9033 14.4871 15.331 14.909 14.909C15.331 14.4871 15.9033 14.25 16.5 14.25H18C18.5967 14.25 19.169 14.4871 19.591 14.909C20.0129 15.331 20.25 15.9033 20.25 16.5V18.75C20.25 18.9489 20.171 19.1397 20.0303 19.2803C19.8897 19.421 19.6989 19.5 19.5 19.5C19.3011 19.5 19.1103 19.421 18.9697 19.2803C18.829 19.1397 18.75 18.9489 18.75 18.75V16.5C18.75 16.1022 18.592 15.7206 18.3107 15.4393C18.0294 15.158 17.6478 15 17.25 15H18Z" fill="currentColor"/>
          </svg>
        </button>
        <button type="button" class="tiptap-toolbar-button" data-action="h3" title="Heading 3">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path opacity="0.2" d="M21 16.5C21 16.8978 20.842 17.2794 20.5607 17.5607C20.2794 17.842 19.8978 18 19.5 18H16.5C16.1022 18 15.7206 17.842 15.4393 17.5607C15.158 17.2794 15 16.8978 15 16.5C15 16.1022 15.158 15.7206 15.4393 15.4393C15.7206 15.158 16.1022 15 16.5 15H19.5C19.8978 15 20.2794 15.158 20.5607 15.4393C20.842 15.7206 21 16.1022 21 16.5Z" fill="currentColor"/>
            <path d="M7.5 3.75C7.69891 3.75 7.88968 3.82902 8.03033 3.96967C8.17098 4.11032 8.25 4.30109 8.25 4.5V11.25H15.75V4.5C15.75 4.30109 15.829 4.11032 15.9697 3.96967C16.1103 3.82902 16.3011 3.75 16.5 3.75C16.6989 3.75 16.8897 3.82902 17.0303 3.96967C17.171 4.11032 17.25 4.30109 17.25 4.5V12C17.25 12.1989 17.171 12.3897 17.0303 12.5303C16.8897 12.671 16.6989 12.75 16.5 12.75C16.3011 12.75 16.1103 12.671 15.9697 12.5303C15.829 12.3897 15.75 12.1989 15.75 12V11.25H8.25V12C8.25 12.1989 8.17098 12.3897 8.03033 12.5303C7.88968 12.671 7.69891 12.75 7.5 12.75C7.30109 12.75 7.11032 12.671 6.96967 12.5303C6.82902 12.3897 6.75 12.1989 6.75 12V4.5C6.75 4.30109 6.82902 4.11032 6.96967 3.96967C7.11032 3.82902 7.30109 3.75 7.5 3.75ZM19.5 14.25H16.5C15.9033 14.25 15.331 14.4871 14.909 14.909C14.4871 15.331 14.25 15.9033 14.25 16.5C14.25 17.0967 14.4871 17.669 14.909 18.091C15.331 18.5129 15.9033 18.75 16.5 18.75H19.5C19.6989 18.75 19.8897 18.829 20.0303 18.9697C20.171 19.1103 20.25 19.3011 20.25 19.5C20.25 19.6989 20.171 19.8897 20.0303 20.0303C19.8897 20.171 19.6989 20.25 19.5 20.25H15C14.8011 20.25 14.6103 20.171 14.4697 20.0303C14.329 19.8897 14.25 19.6989 14.25 19.5C14.25 19.3011 14.329 19.1103 14.4697 18.9697C14.6103 18.829 14.8011 18.75 15 18.75H15.75C15.75 18.1533 15.5129 17.581 15.091 17.159C14.669 16.7371 14.0967 16.5 13.5 16.5C13.3011 16.5 13.1103 16.421 12.9697 16.2803C12.829 16.1397 12.75 15.9489 12.75 15.75C12.75 15.5511 12.829 15.3603 12.9697 15.2197C13.1103 15.079 13.3011 15 13.5 15H19.5C20.0967 15 20.669 15.2371 21.091 15.659C21.5129 16.081 21.75 16.6533 21.75 17.25V19.5C21.75 20.0967 21.5129 20.669 21.091 21.091C20.669 21.5129 20.0967 21.75 19.5 21.75H15C14.8011 21.75 14.6103 21.671 14.4697 21.5303C14.329 21.3897 14.25 21.1989 14.25 21C14.25 20.8011 14.329 20.6103 14.4697 20.4697C14.6103 20.329 14.8011 20.25 15 20.25H19.5C19.6989 20.25 19.8897 20.171 20.0303 20.0303C20.171 19.8897 20.25 19.6989 20.25 19.5V17.25C20.25 17.0511 20.171 16.8603 20.0303 16.7197C19.8897 16.579 19.6989 16.5 19.5 16.5H16.5C16.3011 16.5 16.1103 16.421 15.9697 16.2803C15.829 16.1397 15.75 15.9489 15.75 15.75C15.75 15.5511 15.829 15.3603 15.9697 15.2197C16.1103 15.079 16.3011 15 16.5 15H19.5Z" fill="currentColor"/>
          </svg>
        </button>
      </div>
      <div class="tiptap-toolbar-separator"></div>
      <div class="tiptap-toolbar-group">
        <button type="button" class="tiptap-toolbar-button" data-action="bulletList" title="Bullet List">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path opacity="0.2" d="M9.75 6.75H20.25V8.25H9.75V6.75ZM9.75 11.25H20.25V12.75H9.75V11.25ZM9.75 15.75H20.25V17.25H9.75V15.75Z" fill="currentColor"/>
            <path d="M5.625 9C6.24632 9 6.75 8.49632 6.75 7.875C6.75 7.25368 6.24632 6.75 5.625 6.75C5.00368 6.75 4.5 7.25368 4.5 7.875C4.5 8.49632 5.00368 9 5.625 9Z" fill="currentColor"/>
            <path d="M5.625 13.5C6.24632 13.5 6.75 12.9963 6.75 12.375C6.75 11.7537 6.24632 11.25 5.625 11.25C5.00368 11.25 4.5 11.7537 4.5 12.375C4.5 12.9963 5.00368 13.5 5.625 13.5Z" fill="currentColor"/>
            <path d="M5.625 18C6.24632 18 6.75 17.4963 6.75 16.875C6.75 16.2537 6.24632 15.75 5.625 15.75C5.00368 15.75 4.5 16.2537 4.5 16.875C4.5 17.4963 5.00368 18 5.625 18Z" fill="currentColor"/>
            <path d="M20.25 6H9.75C9.55109 6 9.36032 6.07902 9.21967 6.21967C9.07902 6.36032 9 6.55109 9 6.75V8.25C9 8.44891 9.07902 8.63968 9.21967 8.78033C9.36032 8.92098 9.55109 9 9.75 9H20.25C20.4489 9 20.6397 8.92098 20.7803 8.78033C20.921 8.63968 21 8.44891 21 8.25V6.75C21 6.55109 20.921 6.36032 20.7803 6.21967C20.6397 6.07902 20.4489 6 20.25 6ZM19.5 7.5H10.5V7.5H19.5V7.5Z" fill="currentColor"/>
            <path d="M20.25 10.5H9.75C9.55109 10.5 9.36032 10.579 9.21967 10.7197C9.07902 10.8603 9 11.0511 9 11.25V12.75C9 12.9489 9.07902 13.1397 9.21967 13.2803C9.36032 13.421 9.55109 13.5 9.75 13.5H20.25C20.4489 13.5 20.6397 13.421 20.7803 13.2803C20.921 13.1397 21 12.9489 21 12.75V11.25C21 11.0511 20.921 10.8603 20.7803 10.7197C20.6397 10.579 20.4489 10.5 20.25 10.5ZM19.5 12H10.5V12H19.5V12Z" fill="currentColor"/>
            <path d="M20.25 15H9.75C9.55109 15 9.36032 15.079 9.21967 15.2197C9.07902 15.3603 9 15.5511 9 15.75V17.25C9 17.4489 9.07902 17.6397 9.21967 17.7803C9.36032 17.921 9.55109 18 9.75 18H20.25C20.4489 18 20.6397 17.921 20.7803 17.7803C20.921 17.6397 21 17.4489 21 17.25V15.75C21 15.5511 20.921 15.3603 20.7803 15.2197C20.6397 15.079 20.4489 15 20.25 15ZM19.5 16.5H10.5V16.5H19.5V16.5Z" fill="currentColor"/>
          </svg>
        </button>
        <button type="button" class="tiptap-toolbar-button" data-action="orderedList" title="Ordered List">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path opacity="0.2" d="M10.5 6.75H21V8.25H10.5V6.75ZM10.5 11.25H21V12.75H10.5V11.25ZM10.5 15.75H21V17.25H10.5V15.75Z" fill="currentColor"/>
            <path d="M5.25 5.25H6C6.19891 5.25 6.38968 5.32902 6.53033 5.46967C6.67098 5.61032 6.75 5.80109 6.75 6V9C6.75 9.19891 6.67098 9.38968 6.53033 9.53033C6.38968 9.67098 6.19891 9.75 6 9.75H3.75C3.55109 9.75 3.36032 9.67098 3.21967 9.53033C3.07902 9.38968 3 9.19891 3 9C3 8.80109 3.07902 8.61032 3.21967 8.46967C3.36032 8.32902 3.55109 8.25 3.75 8.25H5.25V6.75H4.5C4.30109 6.75 4.11032 6.67098 3.96967 6.53033C3.82902 6.38968 3.75 6.19891 3.75 6C3.75 5.80109 3.82902 5.61032 3.96967 5.46967C4.11032 5.32902 4.30109 5.25 4.5 5.25H5.25Z" fill="currentColor"/>
            <path d="M4.5 10.5H6C6.19891 10.5 6.38968 10.579 6.53033 10.7197C6.67098 10.8603 6.75 11.0511 6.75 11.25V11.625C6.75 11.8239 6.67098 12.0147 6.53033 12.1553C6.38968 12.296 6.19891 12.375 6 12.375H5.25V12.75H6C6.19891 12.75 6.38968 12.829 6.53033 12.9697C6.67098 13.1103 6.75 13.3011 6.75 13.5V13.875C6.75 14.0739 6.67098 14.2647 6.53033 14.4053C6.38968 14.546 6.19891 14.625 6 14.625H3.75C3.55109 14.625 3.36032 14.546 3.21967 14.4053C3.07902 14.2647 3 14.0739 3 13.875C3 13.6761 3.07902 13.4853 3.21967 13.3447C3.36032 13.204 3.55109 13.125 3.75 13.125H4.5V12.75H3.75C3.55109 12.75 3.36032 12.671 3.21967 12.5303C3.07902 12.3897 3 12.1989 3 12C3 11.8011 3.07902 11.6103 3.21967 11.4697C3.36032 11.329 3.55109 11.25 3.75 11.25H4.5V10.875H3.75C3.55109 10.875 3.36032 10.796 3.21967 10.6553C3.07902 10.5147 3 10.3239 3 10.125C3 9.92609 3.07902 9.73532 3.21967 9.59467C3.36032 9.45402 3.55109 9.375 3.75 9.375H4.5V10.5Z" fill="currentColor"/>
            <path d="M6.75 16.125C6.75 15.9261 6.67098 15.7353 6.53033 15.5947C6.38968 15.454 6.19891 15.375 6 15.375H4.5V15H6C6.19891 15 6.38968 14.921 6.53033 14.7803C6.67098 14.6397 6.75 14.4489 6.75 14.25C6.75 14.0511 6.67098 13.8603 6.53033 13.7197C6.38968 13.579 6.19891 13.5 6 13.5H3.75C3.55109 13.5 3.36032 13.579 3.21967 13.7197C3.07902 13.8603 3 14.0511 3 14.25V16.125C3 16.3239 3.07902 16.5147 3.21967 16.6553C3.36032 16.796 3.55109 16.875 3.75 16.875H5.25V17.25H3.75C3.55109 17.25 3.36032 17.329 3.21967 17.4697C3.07902 17.6103 3 17.8011 3 18C3 18.1989 3.07902 18.3897 3.21967 18.5303C3.36032 18.671 3.55109 18.75 3.75 18.75H6C6.19891 18.75 6.38968 18.671 6.53033 18.5303C6.67098 18.3897 6.75 18.1989 6.75 18V16.125Z" fill="currentColor"/>
            <path d="M21 6H10.5C10.3011 6 10.1103 6.07902 9.96967 6.21967C9.82902 6.36032 9.75 6.55109 9.75 6.75V8.25C9.75 8.44891 9.82902 8.63968 9.96967 8.78033C10.1103 8.92098 10.3011 9 10.5 9H21C21.1989 9 21.3897 8.92098 21.5303 8.78033C21.671 8.63968 21.75 8.44891 21.75 8.25V6.75C21.75 6.55109 21.671 6.36032 21.5303 6.21967C21.3897 6.07902 21.1989 6 21 6ZM20.25 7.5H11.25V7.5H20.25V7.5Z" fill="currentColor"/>
            <path d="M21 10.5H10.5C10.3011 10.5 10.1103 10.579 9.96967 10.7197C9.82902 10.8603 9.75 11.0511 9.75 11.25V12.75C9.75 12.9489 9.82902 13.1397 9.96967 13.2803C10.1103 13.421 10.3011 13.5 10.5 13.5H21C21.1989 13.5 21.3897 13.421 21.5303 13.2803C21.671 13.1397 21.75 12.9489 21.75 12.75V11.25C21.75 11.0511 21.671 10.8603 21.5303 10.7197C21.3897 10.579 21.1989 10.5 21 10.5ZM20.25 12H11.25V12H20.25V12Z" fill="currentColor"/>
            <path d="M21 15H10.5C10.3011 15 10.1103 15.079 9.96967 15.2197C9.82902 15.3603 9.75 15.5511 9.75 15.75V17.25C9.75 17.4489 9.82902 17.6397 9.96967 17.7803C10.1103 17.921 10.3011 18 10.5 18H21C21.1989 18 21.3897 17.921 21.5303 17.7803C21.671 17.6397 21.75 17.4489 21.75 17.25V15.75C21.75 15.5511 21.671 15.3603 21.5303 15.2197C21.3897 15.079 21.1989 15 21 15ZM20.25 16.5H11.25V16.5H20.25V16.5Z" fill="currentColor"/>
          </svg>
        </button>
      </div>
      <div class="tiptap-toolbar-separator"></div>
      <div class="tiptap-toolbar-group">
        <button type="button" class="tiptap-toolbar-button" data-action="codeBlock" title="Code Block">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path opacity="0.2" d="M3.75 6.75C3.75 6.35218 3.90804 5.97064 4.18934 5.68934C4.47064 5.40804 4.85218 5.25 5.25 5.25H18.75C19.1478 5.25 19.5294 5.40804 19.8107 5.68934C20.092 5.97064 20.25 6.35218 20.25 6.75V17.25C20.25 17.6478 20.092 18.0294 19.8107 18.3107C19.5294 18.592 19.1478 18.75 18.75 18.75H5.25C4.85218 18.75 4.47064 18.592 4.18934 18.3107C3.90804 18.0294 3.75 17.6478 3.75 17.25V6.75Z" fill="currentColor"/>
            <path d="M18.75 4.5H5.25C4.65326 4.5 4.08097 4.73705 3.65901 5.15901C3.23705 5.58097 3 6.15326 3 6.75V17.25C3 17.8467 3.23705 18.419 3.65901 18.841C4.08097 19.2629 4.65326 19.5 5.25 19.5H18.75C19.3467 19.5 19.919 19.2629 20.341 18.841C20.7629 18.419 21 17.8467 21 17.25V6.75C21 6.15326 20.7629 5.58097 20.341 5.15901C19.919 4.73705 19.3467 4.5 18.75 4.5ZM5.25 6H18.75C18.9489 6 19.1397 6.07902 19.2803 6.21967C19.421 6.36032 19.5 6.55109 19.5 6.75V17.25C19.5 17.4489 19.421 17.6397 19.2803 17.7803C19.1397 17.921 18.9489 18 18.75 18H5.25C5.05109 18 4.86032 17.921 4.71967 17.7803C4.57902 17.6397 4.5 17.4489 4.5 17.25V6.75C4.5 6.55109 4.57902 6.36032 4.71967 6.21967C4.86032 6.07902 5.05109 6 5.25 6Z" fill="currentColor"/>
            <path d="M7.28063 9.21938C7.14068 9.07865 7.06225 8.88778 7.06225 8.68875C7.06225 8.48972 7.14068 8.29885 7.28063 8.15813C7.42057 8.0174 7.61082 7.93848 7.80938 7.93848C8.00793 7.93848 8.19818 8.0174 8.33813 8.15813L11.5881 11.4081C11.7281 11.5489 11.8065 11.7397 11.8065 11.9388C11.8065 12.1378 11.7281 12.3287 11.5881 12.4694L8.33813 15.7194C8.19818 15.8601 8.00793 15.939 7.80938 15.939C7.61082 15.939 7.42057 15.8601 7.28063 15.7194C7.14068 15.5787 7.06225 15.3878 7.06225 15.1888C7.06225 14.9897 7.14068 14.7989 7.28063 14.6581L10.0003 11.9388L7.28063 9.21938ZM13.5 15.1875C13.5 14.9886 13.579 14.7978 13.7197 14.6572C13.8603 14.5165 14.0511 14.4375 14.25 14.4375H16.5C16.6989 14.4375 16.8897 14.5165 17.0303 14.6572C17.171 14.7978 17.25 14.9886 17.25 15.1875C17.25 15.3864 17.171 15.5772 17.0303 15.7178C16.8897 15.8585 16.6989 15.9375 16.5 15.9375H14.25C14.0511 15.9375 13.8603 15.8585 13.7197 15.7178C13.579 15.5772 13.5 15.3864 13.5 15.1875Z" fill="currentColor"/>
          </svg>
        </button>
        <button type="button" class="tiptap-toolbar-button" data-action="link" title="Link">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path opacity="0.2" d="M9 6.75H6.75C5.95435 6.75 5.19129 7.06607 4.62868 7.62868C4.06607 8.19129 3.75 8.95435 3.75 9.75V14.25C3.75 15.0456 4.06607 15.8087 4.62868 16.3713C5.19129 16.9339 5.95435 17.25 6.75 17.25H9V6.75ZM15 6.75V17.25H17.25C18.0456 17.25 18.8087 16.9339 19.3713 16.3713C19.9339 15.8087 20.25 15.0456 20.25 14.25V9.75C20.25 8.95435 19.9339 8.19129 19.3713 7.62868C18.8087 7.06607 18.0456 6.75 17.25 6.75H15Z" fill="currentColor"/>
            <path d="M9 6H6.75C5.75544 6 4.80161 6.39509 4.09835 7.09835C3.39509 7.80161 3 8.75544 3 9.75V14.25C3 15.2446 3.39509 16.1984 4.09835 16.9017C4.80161 17.6049 5.75544 18 6.75 18H9C9.19891 18 9.38968 17.921 9.53033 17.7803C9.67098 17.6397 9.75 17.4489 9.75 17.25V6.75C9.75 6.55109 9.67098 6.36032 9.53033 6.21967C9.38968 6.07902 9.19891 6 9 6ZM8.25 16.5H6.75C6.15326 16.5 5.58097 16.2629 5.15901 15.841C4.73705 15.419 4.5 14.8467 4.5 14.25V9.75C4.5 9.15326 4.73705 8.58097 5.15901 8.15901C5.58097 7.73705 6.15326 7.5 6.75 7.5H8.25V16.5ZM17.25 6H15C14.8011 6 14.6103 6.07902 14.4697 6.21967C14.329 6.36032 14.25 6.55109 14.25 6.75V17.25C14.25 17.4489 14.329 17.6397 14.4697 17.7803C14.6103 17.921 14.8011 18 15 18H17.25C18.2446 18 19.1984 17.6049 19.9017 16.9017C20.6049 16.1984 21 15.2446 21 14.25V9.75C21 8.75544 20.6049 7.80161 19.9017 7.09835C19.1984 6.39509 18.2446 6 17.25 6ZM19.5 14.25C19.5 14.8467 19.2629 15.419 18.841 15.841C18.419 16.2629 17.8467 16.5 17.25 16.5H15.75V7.5H17.25C17.8467 7.5 18.419 7.73705 18.841 8.15901C19.2629 8.58097 19.5 9.15326 19.5 9.75V14.25ZM12.75 11.25H11.25C11.0511 11.25 10.8603 11.329 10.7197 11.4697C10.579 11.6103 10.5 11.8011 10.5 12C10.5 12.1989 10.579 12.3897 10.7197 12.5303C10.8603 12.671 11.0511 12.75 11.25 12.75H12.75C12.9489 12.75 13.1397 12.671 13.2803 12.5303C13.421 12.3897 13.5 12.1989 13.5 12C13.5 11.8011 13.421 11.6103 13.2803 11.4697C13.1397 11.329 12.9489 11.25 12.75 11.25Z" fill="currentColor"/>
          </svg>
        </button>
        <button type="button" class="tiptap-toolbar-button" data-action="image" title="Image">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path opacity="0.2" d="M20.25 18.75H3.75L9.79219 12.7078C9.93259 12.5674 10.1231 12.4886 10.3219 12.4886C10.5206 12.4886 10.7111 12.5674 10.8516 12.7078L13.1484 15.0047C13.2888 15.1451 13.4794 15.2239 13.6781 15.2239C13.8769 15.2239 14.0674 15.1451 14.2078 15.0047L17.0391 12.1734C17.1795 12.033 17.37 11.9542 17.5688 11.9542C17.7675 11.9542 17.9581 12.033 18.0984 12.1734L20.25 14.325V18.75Z" fill="currentColor"/>
            <path d="M18.75 3.75H5.25C4.65326 3.75 4.08097 3.98705 3.65901 4.40901C3.23705 4.83097 3 5.40326 3 6V18C3 18.5967 3.23705 19.169 3.65901 19.591C4.08097 20.0129 4.65326 20.25 5.25 20.25H18.75C19.3467 20.25 19.919 20.0129 20.341 19.591C20.7629 19.169 21 18.5967 21 18V6C21 5.40326 20.7629 4.83097 20.341 4.40901C19.919 3.98705 19.3467 3.75 18.75 3.75ZM5.25 5.25H18.75C18.9489 5.25 19.1397 5.32902 19.2803 5.46967C19.421 5.61032 19.5 5.80109 19.5 6V13.2656L17.5688 11.3344C17.1467 10.9128 16.5746 10.6758 15.9781 10.6758C15.3817 10.6758 14.8095 10.9128 14.3875 11.3344L13.6781 12.0422L11.3813 9.74531C10.9592 9.32368 10.3871 9.08667 9.79063 9.08667C9.19415 9.08667 8.62201 9.32368 8.2 9.74531L4.5 13.4453V6C4.5 5.80109 4.57902 5.61032 4.71967 5.46967C4.86032 5.32902 5.05109 5.25 5.25 5.25ZM18.75 18.75H5.25C5.05109 18.75 4.86032 18.671 4.71967 18.5303C4.57902 18.3897 4.5 18.1989 4.5 18V15.5062L9.26156 10.7437C9.40196 10.6033 9.5925 10.5245 9.79125 10.5245C9.99 10.5245 10.1805 10.6033 10.3209 10.7437L13.1484 13.5703C13.2888 13.7107 13.4794 13.7895 13.6781 13.7895C13.8769 13.7895 14.0674 13.7107 14.2078 13.5703L15.9469 11.8313C16.0873 11.6909 16.2778 11.6121 16.4766 11.6121C16.6753 11.6121 16.8658 11.6909 17.0063 11.8313L19.5 14.325V18C19.5 18.1989 19.421 18.3897 19.2803 18.5303C19.1397 18.671 18.9489 18.75 18.75 18.75Z" fill="currentColor"/>
            <path d="M9 9C9.59674 9 10.169 8.76295 10.591 8.34099C11.0129 7.91903 11.25 7.34674 11.25 6.75C11.25 6.15326 11.0129 5.58097 10.591 5.15901C10.169 4.73705 9.59674 4.5 9 4.5C8.40326 4.5 7.83097 4.73705 7.40901 5.15901C6.98705 5.58097 6.75 6.15326 6.75 6.75C6.75 7.34674 6.98705 7.91903 7.40901 8.34099C7.83097 8.76295 8.40326 9 9 9ZM9 6C9.19891 6 9.38968 6.07902 9.53033 6.21967C9.67098 6.36032 9.75 6.55109 9.75 6.75C9.75 6.94891 9.67098 7.13968 9.53033 7.28033C9.38968 7.42098 9.19891 7.5 9 7.5C8.80109 7.5 8.61032 7.42098 8.46967 7.28033C8.32902 7.13968 8.25 6.94891 8.25 6.75C8.25 6.55109 8.32902 6.36032 8.46967 6.21967C8.61032 6.07902 8.80109 6 9 6Z" fill="currentColor"/>
          </svg>
        </button>
      </div>
      <div class="tiptap-toolbar-separator"></div>
      <div class="tiptap-toolbar-group">
        <button type="button" class="tiptap-toolbar-button tiptap-toolbar-delete" data-action="delete" data-post-id="${postId}" title="Удалить статью">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path opacity="0.2" d="M18.75 8.25H5.25L6 18.75C6 19.1478 6.15804 19.5294 6.43934 19.8107C6.72064 20.092 7.10218 20.25 7.5 20.25H16.5C16.8978 20.25 17.2794 20.092 17.5607 19.8107C17.842 19.5294 18 19.1478 18 18.75L18.75 8.25Z" fill="currentColor"/>
            <path d="M20.25 5.25H15.75V4.5C15.75 4.10218 15.592 3.72064 15.3107 3.43934C15.0294 3.15804 14.6478 3 14.25 3H9.75C9.35218 3 8.97064 3.15804 8.68934 3.43934C8.40804 3.72064 8.25 4.10218 8.25 4.5V5.25H3.75C3.55109 5.25 3.36032 5.32902 3.21967 5.46967C3.07902 5.61032 3 5.80109 3 6C3 6.19891 3.07902 6.38968 3.21967 6.53033C3.36032 6.67098 3.55109 6.75 3.75 6.75H4.5L5.25469 18.8034C5.27895 19.3919 5.52762 19.9498 5.94783 20.3597C6.36804 20.7696 6.92939 20.9997 7.51875 21H16.4812C17.0706 20.9997 17.632 20.7696 18.0522 20.3597C18.4724 19.9498 18.7211 19.3919 18.7453 18.8034L19.5 6.75H20.25C20.4489 6.75 20.6397 6.67098 20.7803 6.53033C20.921 6.38968 21 6.19891 21 6C21 5.80109 20.921 5.61032 20.7803 5.46967C20.6397 5.32902 20.4489 5.25 20.25 5.25ZM9.75 4.5H14.25V5.25H9.75V4.5ZM17.25 18.75C17.25 18.9489 17.171 19.1397 17.0303 19.2803C16.8897 19.421 16.6989 19.5 16.5 19.5H7.5C7.30109 19.5 7.11032 19.421 6.96967 19.2803C6.82902 19.1397 6.75 18.9489 6.75 18.75L6 6.75H18L17.25 18.75Z" fill="currentColor"/>
          </svg>
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

    // Show view-mode elements again
    const titleDisplay = postEl.querySelector('.nest-post-title-display');
    const viewDates = postEl.querySelector('.nest-post-dates');

    if (titleDisplay) titleDisplay.style.display = '';
    if (viewDates) viewDates.style.display = '';
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
