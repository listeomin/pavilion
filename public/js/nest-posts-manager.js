// nest-posts-manager.js
import { Editor } from 'https://esm.sh/@tiptap/core@2.1.13';
import StarterKit from 'https://esm.sh/@tiptap/starter-kit@2.1.13';
import Link from 'https://esm.sh/@tiptap/extension-link@2.1.13';
import Image from 'https://esm.sh/@tiptap/extension-image@2.1.13';
import Placeholder from 'https://esm.sh/@tiptap/extension-placeholder@2.1.13';

// Create custom Image extension with resize, delete, and caption
function createCustomImage() {
  return Image.extend({
    name: 'customImage',

    addAttributes() {
      return {
        ...this.parent?.(),
        width: {
          default: null,
          parseHTML: element => element.style.width || element.getAttribute('width'),
          renderHTML: attributes => {
            if (!attributes.width) return {};
            return { style: `width: ${attributes.width}${attributes.width.includes('%') || attributes.width.includes('px') ? '' : 'px'}` };
          },
        },
        caption: {
          default: null,
          parseHTML: element => element.getAttribute('data-caption'),
          renderHTML: attributes => {
            if (!attributes.caption) return {};
            return { 'data-caption': attributes.caption };
          },
        },
      };
    },

    addCommands() {
      return {
        ...this.parent?.(),
        setImage: (options) => ({ commands, chain }) => {
          // Insert image and ensure cursor moves below it
          return chain()
            .insertContent({
              type: this.name,
              attrs: options,
            })
            .insertContent({ type: 'paragraph' }) // Add empty paragraph after image
            .run();
        },
        updateImageWidth: (width) => ({ commands }) => {
          return commands.updateAttributes(this.name, { width });
        },
        setImageCaption: (caption) => ({ commands }) => {
          return commands.updateAttributes(this.name, { caption });
        },
      };
    },

    addNodeView() {
      return ({ node, editor, getPos }) => {
        const container = document.createElement('div');
        container.className = 'tiptap-image-container';

        const wrapper = document.createElement('div');
        wrapper.className = 'tiptap-image-wrapper';
        wrapper.style.position = 'relative';
        wrapper.style.display = 'inline-block';
        wrapper.style.maxWidth = '100%';

        const img = document.createElement('img');
        img.src = node.attrs.src;
        img.alt = node.attrs.alt || '';
        img.className = 'tiptap-image';

        if (node.attrs.width) {
          img.style.width = node.attrs.width + (node.attrs.width.includes('%') || node.attrs.width.includes('px') ? '' : 'px');
        }

        // Delete button overlay (only in edit mode)
        if (editor.isEditable) {
          const overlay = document.createElement('div');
          overlay.className = 'tiptap-image-overlay';
          overlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: opacity 0.2s;
            pointer-events: none;
            border-radius: 8px;
          `;

          const deleteBtn = document.createElement('button');
          deleteBtn.innerHTML = '🗑';
          deleteBtn.className = 'tiptap-image-delete-btn';
          deleteBtn.style.cssText = `
            background: rgba(220, 53, 69, 0.9);
            color: white;
            border: none;
            border-radius: 6px;
            padding: 8px 16px;
            cursor: pointer;
            font-size: 18px;
            pointer-events: auto;
            font-family: 'Ubuntu Sans', sans-serif;
          `;
          deleteBtn.title = 'Удалить изображение';

          deleteBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (typeof getPos === 'function') {
              const pos = getPos();
              editor.commands.deleteRange({ from: pos, to: pos + node.nodeSize });
            }
          });

          overlay.appendChild(deleteBtn);

          wrapper.addEventListener('mouseenter', () => {
            overlay.style.opacity = '1';
          });

          wrapper.addEventListener('mouseleave', () => {
            overlay.style.opacity = '0';
          });

          wrapper.appendChild(overlay);

          // Resize handle (only in edit mode)
          const resizeHandle = document.createElement('div');
          resizeHandle.className = 'tiptap-image-resize-handle';
          resizeHandle.style.cssText = `
            position: absolute;
            bottom: 0;
            right: 0;
            width: 20px;
            height: 20px;
            background: var(--color-iris, #7C77EE);
            border-radius: 4px 0 8px 0;
            cursor: nwse-resize;
            opacity: 0;
            transition: opacity 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 12px;
            z-index: 10;
          `;
          resizeHandle.textContent = '⇲';

          let startX, startWidth;

          resizeHandle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            startX = e.clientX;
            startWidth = img.offsetWidth;

            const onMouseMove = (e) => {
              const deltaX = e.clientX - startX;
              const newWidth = Math.max(100, startWidth + deltaX);
              img.style.width = newWidth + 'px';
            };

            const onMouseUp = () => {
              document.removeEventListener('mousemove', onMouseMove);
              document.removeEventListener('mouseup', onMouseUp);

              // Save new width
              if (typeof getPos === 'function') {
                const pos = getPos();
                editor.commands.updateAttributes('customImage', { width: img.style.width });
              }
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
          });

          wrapper.addEventListener('mouseenter', () => {
            resizeHandle.style.opacity = '1';
          });

          wrapper.addEventListener('mouseleave', () => {
            resizeHandle.style.opacity = '0';
          });

          wrapper.appendChild(resizeHandle);
        }

        wrapper.appendChild(img);
        container.appendChild(wrapper);

        // Caption input (only in edit mode)
        if (editor.isEditable) {
          const captionInput = document.createElement('input');
          captionInput.type = 'text';
          captionInput.placeholder = 'Добавить подпись...';
          captionInput.className = 'tiptap-image-caption-input';
          captionInput.value = node.attrs.caption || '';
          captionInput.style.cssText = `
            width: 100%;
            margin-top: 8px;
            padding: 6px 12px;
            border: 1px solid var(--color-nimbus-light, #e0e0e0);
            border-radius: 4px;
            font-size: 14px;
            font-family: 'Ubuntu Sans', sans-serif;
            color: var(--color-nimbus-dark, #666);
            font-style: italic;
          `;

          captionInput.addEventListener('blur', () => {
            if (typeof getPos === 'function') {
              editor.commands.updateAttributes('customImage', { caption: captionInput.value });
            }
          });

          captionInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              captionInput.blur();
            }
          });

          container.appendChild(captionInput);
        } else if (node.attrs.caption) {
          // Show caption in read mode
          const caption = document.createElement('div');
          caption.className = 'tiptap-image-caption';
          caption.textContent = node.attrs.caption;
          caption.style.cssText = `
            text-align: center;
            font-size: 14px;
            color: var(--color-nimbus-dark, #666);
            font-style: italic;
            margin-top: 8px;
          `;
          container.appendChild(caption);
        }

        return {
          dom: container,
          update: (updatedNode) => {
            if (updatedNode.type !== this.type) return false;

            // Update image src if changed
            if (updatedNode.attrs.src !== node.attrs.src) {
              img.src = updatedNode.attrs.src;
            }

            // Update width if changed
            if (updatedNode.attrs.width !== node.attrs.width) {
              img.style.width = updatedNode.attrs.width + (updatedNode.attrs.width?.includes('%') || updatedNode.attrs.width?.includes('px') ? '' : 'px');
            }

            return true;
          },
        };
      };
    },
  });
}

export class NestPostsManager {
  constructor(config, apiPath) {
    this.config = config;
    this.apiPath = apiPath;
    this.posts = [];
    this.editors = new Map();
    this.saveTimers = new Map();
    this.datePickers = new Map();
    this.currentSort = localStorage.getItem('nest-sort-mode') || 'author';
    this.sortMenuInitialized = false;
    this.currentFilter = null; // { type: 'section', name: 'стихи' } or null

    // Pagination for viewing mode
    this.postsPerPage = 20;
    this.currentOffset = 0;
    this.totalPosts = 0;
    this.isLoading = false;
    this.hasMorePosts = true;

    // Initialize Day.js with Russian locale and relativeTime
    if (window.dayjs) {
      dayjs.extend(dayjs_plugin_relativeTime);
      dayjs.locale('ru');
    }
  }

  // Format date using Day.js with live format
  formatLiveDate(dateStr) {
    if (!dateStr || !window.dayjs) return '';

    const date = dayjs(dateStr);
    const now = dayjs();
    const diffHours = now.diff(date, 'hour');
    const diffDays = now.diff(date, 'day');

    // Less than 24 hours ago: "2 часа назад", "30 минут назад"
    if (diffHours < 24) {
      return date.fromNow();
    }

    // Yesterday: "вчера, в 15:30"
    if (diffDays === 1) {
      return `вчера, в ${date.format('HH:mm')}`;
    }

    // Less than 7 days: "2 дня назад"
    if (diffDays < 7) {
      return date.fromNow();
    }

    // This year: "15 января, в 15:30"
    if (date.year() === now.year()) {
      return date.format('D MMMM, [в] HH:mm');
    }

    // Different year: "15 января 2024г., в 15:30"
    return date.format('D MMMM YYYY[г., в] HH:mm');
  }

  // Format static date (for created_date)
  formatStaticDate(dateStr) {
    if (!dateStr || !window.dayjs) return '';
    const date = dayjs(dateStr);
    const now = dayjs();

    // Same year: "15 января"
    if (date.year() === now.year()) {
      return date.format('D MMMM');
    }

    // Different year: "15 января 2020г."
    return date.format('D MMMM YYYY[г.]');
  }

  // Update editor-active state based on active editors
  updateEditorActiveState() {
    if (this.editors.size > 0) {
      document.body.classList.add('editor-active');
    } else {
      document.body.classList.remove('editor-active');
    }
  }

  async loadMetadata() {
    // Load only metadata (no content) for sidebar navigation
    const url = `${this.apiPath}/api/nest_posts.php?action=list_metadata&username=${encodeURIComponent(this.config.urlUsername)}`;
    console.log('[PostsManager] Loading metadata:', url);
    const response = await fetch(url);
    const result = await response.json();
    if (result.success && result.posts) {
      this.allPostsMetadata = result.posts;
      this.totalPosts = result.total || result.posts.length;
      console.log('[PostsManager] Metadata loaded:', this.allPostsMetadata.length, 'posts');
    }
    return this.allPostsMetadata;
  }

  async loadPosts(reset = false) {
    // If own nest, load all posts without pagination
    if (this.config.isOwnNest) {
      const url = `${this.apiPath}/api/nest_posts.php?action=list&username=${encodeURIComponent(this.config.urlUsername)}`;
      console.log('[PostsManager] Loading all posts for editing:', url);
      const response = await fetch(url);
      const result = await response.json();
      if (result.success && result.posts) {
        this.posts = result.posts;
        this.totalPosts = result.total || result.posts.length;
      }
      console.log('[PostsManager] Loaded', this.posts.length, 'posts for editing');
      return this.posts;
    }

    // For viewing mode, use pagination
    if (reset) {
      this.currentOffset = 0;
      this.posts = [];
      this.hasMorePosts = true;
    }

    if (this.isLoading || !this.hasMorePosts) {
      console.log('[PostsManager] Skipping load - isLoading:', this.isLoading, 'hasMorePosts:', this.hasMorePosts);
      return this.posts;
    }

    this.isLoading = true;
    const url = `${this.apiPath}/api/nest_posts.php?action=list&username=${encodeURIComponent(this.config.urlUsername)}&limit=${this.postsPerPage}&offset=${this.currentOffset}`;
    console.log('[PostsManager] Fetching paginated posts:', url);

    try {
      const response = await fetch(url);
      const result = await response.json();

      if (result.success && result.posts) {
        this.posts = [...this.posts, ...result.posts];
        this.totalPosts = result.total || 0;
        this.currentOffset += result.posts.length;
        this.hasMorePosts = this.posts.length < this.totalPosts;
        console.log('[PostsManager] Loaded', result.posts.length, 'posts. Total so far:', this.posts.length, 'of', this.totalPosts);
      }
    } finally {
      this.isLoading = false;
    }

    return this.posts;
  }

  // Get sidebar categories dynamically from DOM
  getSidebarCategories() {
    const categories = [];
    const navSections = document.querySelectorAll('.nav-section-header[data-section]');
    navSections.forEach(header => {
      const sectionName = header.dataset.section;
      if (sectionName) {
        categories.push(sectionName.toLowerCase());
      }
    });
    return categories;
  }

  // Get all unique tags from user's posts
  getAllTags() {
    // Get sidebar categories dynamically from DOM
    const sidebarCategories = this.getSidebarCategories();

    // Get custom tags from posts (excluding system tags and sidebar categories)
    const customTags = new Set();
    this.posts.forEach(post => {
      if (post.tag &&
          post.tag !== 'черновик' &&
          post.tag !== 'лента' &&
          !sidebarCategories.includes(post.tag.toLowerCase())) {
        customTags.add(post.tag);
      }
    });

    // Return: system tags, sidebar categories, custom tags
    return ['черновик', 'лента', ...sidebarCategories, ...Array.from(customTags).sort()];
  }

  // Populate tag dropdown with available tags
  populateTagDropdown(dropdown, postId, button) {
    const availableTags = this.getAllTags();
    const currentTag = button.dataset.currentTag;

    dropdown.innerHTML = '';

    availableTags.forEach(tag => {
      const option = document.createElement('div');
      option.className = 'nest-post-tag-option';
      option.dataset.tag = tag;
      option.textContent = tag;

      if (tag === currentTag) {
        option.classList.add('active');
      }

      option.addEventListener('click', async (e) => {
        e.stopPropagation();
        await this.saveMetadata(postId, { tag });
        button.textContent = `#${tag}`;
        button.dataset.currentTag = tag;
        dropdown.style.display = 'none';

        // Update all options active state
        dropdown.querySelectorAll('.nest-post-tag-option').forEach(opt => {
          opt.classList.remove('active');
        });
        option.classList.add('active');
      });

      dropdown.appendChild(option);
    });
  }

  // Initialize sort context menu
  initSortMenu() {
    const menu = document.getElementById('nest-sort-menu');
    if (!menu) return;

    // Add click handlers to menu items
    menu.querySelectorAll('.context-menu-item').forEach(item => {
      item.addEventListener('click', () => {
        const sortMode = item.dataset.sort;
        this.currentSort = sortMode;
        localStorage.setItem('nest-sort-mode', sortMode);
        menu.classList.remove('active');

        // Re-render posts with new sort
        const container = document.getElementById('nest-editor-container');
        if (container) {
          this.renderPostsList(container);
        }
      });
    });

    // Show menu on right-click in wrap area
    document.addEventListener('contextmenu', (e) => {
      const wrap = e.target.closest('.wrap');
      if (!wrap) return;

      // Only show on empty areas (not on posts or insert zones)
      if (e.target.closest('.nest-post') || e.target.closest('.nest-insert-zone')) {
        return;
      }

      e.preventDefault();
      menu.style.left = `${e.clientX}px`;
      menu.style.top = `${e.clientY}px`;
      menu.classList.add('active');
    });

    // Hide menu on click outside
    document.addEventListener('click', () => {
      menu.classList.remove('active');
    });
  }

  // Sort posts based on current sort mode
  sortPosts() {
    const sorted = [...this.posts];

    switch (this.currentSort) {
      case 'author':
        // Sort by position (as author intended)
        sorted.sort((a, b) => (a.position || 0) - (b.position || 0));
        break;

      case 'created':
        // Sort by created_date (newest first, null at end)
        sorted.sort((a, b) => {
          if (!a.created_date && !b.created_date) return 0;
          if (!a.created_date) return 1;
          if (!b.created_date) return -1;
          return new Date(b.created_date) - new Date(a.created_date);
        });
        break;

      case 'published':
        // Sort by created_date (newest first, null at end)
        sorted.sort((a, b) => {
          if (!a.created_date && !b.created_date) return 0;
          if (!a.created_date) return 1;
          if (!b.created_date) return -1;
          return new Date(b.created_date) - new Date(a.created_date);
        });
        break;

      case 'modified':
        // Sort by updated_at (newest first, null at end, fallback to created_at)
        sorted.sort((a, b) => {
          const aDate = a.updated_at || a.created_at;
          const bDate = b.updated_at || b.created_at;
          if (!aDate && !bDate) return 0;
          if (!aDate) return 1;
          if (!bDate) return -1;
          return new Date(bDate) - new Date(aDate);
        });
        break;
    }

    return sorted;
  }

  // Set filter for posts
  setFilter(filterType, filterValue) {
    if (!filterType) {
      this.currentFilter = null;
    } else {
      this.currentFilter = { type: filterType, name: filterValue };
    }
  }

  // Get filtered and sorted posts
  getFilteredPosts() {
    let posts = this.sortPosts();

    // Apply filter if active
    if (this.currentFilter && this.currentFilter.type === 'section') {
      const sectionName = this.currentFilter.name.toLowerCase();
      posts = posts.filter(post => {
        return post.tag && post.tag.toLowerCase() === sectionName;
      });
    }

    return posts;
  }

  renderPostsList(container, append = false) {
    if (!append) {
      container.innerHTML = '';
    }

    // Initialize sort menu once (only after DOM is ready)
    if (!this.sortMenuInitialized) {
      this.initSortMenu();
      this.sortMenuInitialized = true;
    }

    // Get filtered and sorted posts
    const sortedPosts = this.getFilteredPosts();

    // Remove loading indicator if exists
    const loadingIndicator = container.querySelector('.posts-loading');
    if (loadingIndicator) {
      loadingIndicator.remove();
    }

    if (!append && this.config.isOwnNest) {
      const beforeFirstZone = this.createInsertZone(0);
      container.appendChild(beforeFirstZone);
    }

    const startIndex = append ? container.querySelectorAll('.nest-post').length : 0;
    const postsToRender = append ? sortedPosts.slice(startIndex) : sortedPosts;

    postsToRender.forEach((post) => {
      const postEl = this.createPostElement(post);
      container.appendChild(postEl);

      if (this.config.isOwnNest) {
        const insertZone = this.createInsertZone(post.position + 1);
        container.appendChild(insertZone);
      }
    });

    // Add loading indicator if more posts available
    if (!this.config.isOwnNest && this.hasMorePosts) {
      const loadingEl = document.createElement('div');
      loadingEl.className = 'posts-loading';
      loadingEl.innerHTML = '<div class="posts-loading-text">Загрузка...</div>';
      container.appendChild(loadingEl);
    }
  }

  // Setup infinite scroll for viewing mode
  setupInfiniteScroll(container) {
    if (this.config.isOwnNest) return; // Only for viewing mode

    const observer = new IntersectionObserver(async (entries) => {
      const loadingEl = entries[0];
      if (loadingEl.isIntersecting && !this.isLoading && this.hasMorePosts) {
        await this.loadPosts();
        this.renderPostsList(container, true);
      }
    }, {
      rootMargin: '200px' // Start loading 200px before reaching bottom
    });

    // Observe loading indicator
    const checkAndObserve = () => {
      const loadingIndicator = container.querySelector('.posts-loading');
      if (loadingIndicator) {
        observer.observe(loadingIndicator);
      }
    };

    // Initial observation
    checkAndObserve();

    // Re-observe after each render
    const originalRender = this.renderPostsList.bind(this);
    this.renderPostsList = function(cont, app) {
      originalRender(cont, app);
      checkAndObserve();
    };
  }

  // Render single post view (read-only, no edit mode)
  renderSinglePost(container, post) {
    container.innerHTML = '';
    const postEl = this.createPostElement(post);
    // Remove hover/click handlers for single post view
    postEl.classList.remove('nest-post-hover');
    postEl.style.cursor = 'default';
    container.appendChild(postEl);
  }

  // Get posts grouped by category tags
  getPostsByCategory() {
    const categories = {};
    // Get sidebar categories dynamically from DOM
    const sidebarCategories = this.getSidebarCategories();

    // Initialize sidebar categories
    sidebarCategories.forEach(cat => {
      categories[cat] = [];
    });

    // Use metadata if available (for viewing mode), otherwise use full posts
    const postsSource = this.allPostsMetadata || this.posts;

    // Group posts by tag (case-insensitive)
    postsSource.forEach(post => {
      if (!post.tag) {
        return;
      }

      const tagLower = post.tag.toLowerCase();

      // Only include posts with category tags (not черновик or лента)
      if (sidebarCategories.includes(tagLower)) {
        // Only include posts with titles
        if (post.title && post.title.trim() !== '' && post.title !== 'Новая статья') {
          categories[tagLower].push(post);
        }
      }
    });

    // Remove empty categories
    Object.keys(categories).forEach(cat => {
      if (categories[cat].length === 0) {
        delete categories[cat];
      }
    });

    return categories;
  }

  // Render sidebar navigation - populate existing sections with posts
  renderSidebarNavigation() {
    // Find all existing nav sections
    const navSections = document.querySelectorAll('.nav-section-header');

    if (navSections.length === 0) {
      return;
    }

    const categories = this.getPostsByCategory();

    // Update each section with matching posts
    navSections.forEach(sectionHeader => {
      const sectionName = sectionHeader.dataset.section;

      if (!sectionName) {
        return;
      }

      // Find the nav-posts container for this section
      const section = sectionHeader.parentElement;
      let postsContainer = section.querySelector('.nav-posts');

      // Create nav-posts container if it doesn't exist
      if (!postsContainer) {
        postsContainer = document.createElement('div');
        postsContainer.className = 'nav-posts';
        section.appendChild(postsContainer);
      }

      // Get posts for this section (case-insensitive match)
      const sectionNameLower = sectionName.toLowerCase();
      const posts = categories[sectionNameLower] || [];

      // Sort posts alphabetically by title (Russian locale)
      posts.sort((a, b) => a.title.localeCompare(b.title, 'ru'));

      // Clear and populate
      postsContainer.innerHTML = '';

      if (posts.length === 0) {
        const emptyMsg = document.createElement('div');
        emptyMsg.className = 'nav-post-empty';
        emptyMsg.textContent = 'Нет статей';
        postsContainer.appendChild(emptyMsg);
      } else {
        posts.forEach(post => {
          const postItem = document.createElement('div');
          postItem.className = 'nav-post';
          postItem.textContent = post.title;
          postItem.dataset.postSlug = post.slug;

          // Add click handler to navigate to post page
          postItem.addEventListener('click', () => {
            const baseUrl = this.config.urlUsername
              ? `${this.apiPath}/nest/${this.config.urlUsername}`
              : `${this.apiPath}/nest`;
            window.location.href = `${baseUrl}/${post.slug}`;
          });

          postsContainer.appendChild(postItem);
        });
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

    // Smart dates display (read-only) - hide duplicate dates
    const datesSection = document.createElement('div');
    datesSection.className = 'nest-post-dates';

    // Helper to check if dates are the same (compare to minute precision)
    const isSameDate = (date1, date2) => {
      if (!date1 || !date2 || !window.dayjs) return false;
      try {
        return dayjs(date1).format('YYYY-MM-DD HH:mm') === dayjs(date2).format('YYYY-MM-DD HH:mm');
      } catch (e) {
        return false;
      }
    };

    const hasCreated = post.created_date;
    const hasPublished = post.created_at;
    const hasModified = post.updated_at;

    const createdSameAsPublished = isSameDate(post.created_date, post.created_at);
    const publishedSameAsModified = isSameDate(post.created_at, post.updated_at);
    const allSame = createdSameAsPublished && publishedSameAsModified;

    // Scenario a) All dates same -> show only "Создано"
    if (allSame && hasCreated) {
      const createdDiv = document.createElement('div');
      createdDiv.className = 'nest-post-date';
      createdDiv.innerHTML = `
        <img src="assets/date-create.svg" alt="Создано" class="nest-post-date-icon">
        <span>Создано ${this.formatStaticDate(post.created_date)}</span>
      `;
      datesSection.appendChild(createdDiv);
    }
    // Scenario b) created != published, published == modified -> show created + published
    else if (!createdSameAsPublished && publishedSameAsModified) {
      if (hasCreated) {
        const createdDiv = document.createElement('div');
        createdDiv.className = 'nest-post-date';
        createdDiv.innerHTML = `
          <img src="assets/date-create.svg" alt="Создано" class="nest-post-date-icon">
          <span>Создано ${this.formatStaticDate(post.created_date)}</span>
        `;
        datesSection.appendChild(createdDiv);
      }
      if (hasPublished) {
        const publishedDiv = document.createElement('div');
        publishedDiv.className = 'nest-post-date';
        publishedDiv.innerHTML = `
          <img src="assets/date-publish.svg" alt="Опубликовано" class="nest-post-date-icon">
          <span>Опубликовано ${this.formatLiveDate(post.created_at)}</span>
        `;
        datesSection.appendChild(publishedDiv);
      }
    }
    // Scenario c) All different -> show all three
    else {
      if (hasCreated && !createdSameAsPublished) {
        const createdDiv = document.createElement('div');
        createdDiv.className = 'nest-post-date';
        createdDiv.innerHTML = `
          <img src="assets/date-create.svg" alt="Создано" class="nest-post-date-icon">
          <span>Создано ${this.formatStaticDate(post.created_date)}</span>
        `;
        datesSection.appendChild(createdDiv);
      }
      if (hasPublished) {
        const publishedDiv = document.createElement('div');
        publishedDiv.className = 'nest-post-date';
        publishedDiv.innerHTML = `
          <img src="assets/date-publish.svg" alt="Опубликовано" class="nest-post-date-icon">
          <span>Опубликовано ${this.formatLiveDate(post.created_at)}</span>
        `;
        datesSection.appendChild(publishedDiv);
      }
      if (hasModified && !publishedSameAsModified) {
        const updatedDiv = document.createElement('div');
        updatedDiv.className = 'nest-post-date';
        updatedDiv.innerHTML = `
          <img src="assets/date-edit.svg" alt="Изменено" class="nest-post-date-icon">
          <span>Изменено ${this.formatLiveDate(post.updated_at)}</span>
        `;
        datesSection.appendChild(updatedDiv);
      }
    }

    postEl.appendChild(datesSection);

    const contentEl = document.createElement('div');
    contentEl.className = 'nest-post-content';
    // Convert JSON to HTML for display
    const html = this.convertJsonToHtml(post.content);
    contentEl.innerHTML = html;

    // Add lazy loading to all images in content
    contentEl.querySelectorAll('img').forEach(img => {
      img.loading = 'lazy';
      img.decoding = 'async';
    });

    postEl.appendChild(contentEl);

    if (this.config.isOwnNest) {
      postEl.addEventListener('mouseenter', () => {
        if (!this.editors.has(post.id)) postEl.classList.add('nest-post-hover');
      });
      postEl.addEventListener('mouseleave', () => {
        postEl.classList.remove('nest-post-hover');
      });
      postEl.addEventListener('click', (e) => {
        // Don't activate editor when clicking on links or images
        if (e.target.tagName === 'A' || e.target.tagName === 'IMG') return;
        if (!this.editors.has(post.id)) this.activateEditor(post, postEl);
      });
    }

    return postEl;
  }

  createInsertZone(position) {
    const zone = document.createElement('div');
    zone.className = 'nest-insert-zone';
    zone.textContent = 'Напишите что-нибудь';
    zone.dataset.position = position;
    zone.addEventListener('click', (e) => this.createNewPost(position, e.currentTarget));
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

    // Dates section in edit mode
    const datesSection = document.createElement('div');
    datesSection.className = 'nest-post-dates';

    // Created date - EDITABLE with Flatpickr date picker
    const createdDiv = document.createElement('div');
    createdDiv.className = 'nest-post-date';
    const createdInput = document.createElement('input');
    createdInput.type = 'text';
    createdInput.className = 'nest-post-created-date-input';
    createdInput.placeholder = 'Дата создания (опционально)';
    createdInput.dataset.postId = post.id;
    if (post.created_date) {
      createdInput.value = this.formatStaticDate(post.created_date);
    }
    createdDiv.innerHTML = `
      <img src="assets/date-create.svg" alt="Создано" class="nest-post-date-icon">
    `;
    createdDiv.appendChild(createdInput);
    datesSection.appendChild(createdDiv);

    // Published date - READ-ONLY with live format
    if (post.created_at) {
      const publishedDiv = document.createElement('div');
      publishedDiv.className = 'nest-post-date';
      publishedDiv.innerHTML = `
        <img src="assets/date-publish.svg" alt="Опубликовано" class="nest-post-date-icon">
        <span>Опубликовано ${this.formatLiveDate(post.created_at)}</span>
      `;
      datesSection.appendChild(publishedDiv);
    }

    // Updated date - READ-ONLY with live format
    if (post.updated_at) {
      const updatedDiv = document.createElement('div');
      updatedDiv.className = 'nest-post-date';
      updatedDiv.innerHTML = `
        <img src="assets/date-edit.svg" alt="Изменено" class="nest-post-date-icon">
        <span>Изменено ${this.formatLiveDate(post.updated_at)}</span>
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

    // Create tag selector in footer
    const tagFooter = document.createElement('div');
    tagFooter.className = 'nest-post-tag-footer';

    const tagButton = document.createElement('button');
    tagButton.type = 'button';
    tagButton.className = 'nest-post-tag-button';
    tagButton.dataset.postId = post.id;
    tagButton.dataset.currentTag = post.tag || 'черновик';
    tagButton.textContent = `#${post.tag || 'черновик'}`;

    const tagDropdown = document.createElement('div');
    tagDropdown.className = 'nest-post-tag-dropdown';
    tagDropdown.style.display = 'none';

    tagFooter.appendChild(tagButton);
    tagFooter.appendChild(tagDropdown);
    wrapper.appendChild(tagFooter);

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
        createCustomImage(),
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

    // Initialize Flatpickr date picker for created_date
    if (window.flatpickr && createdInput) {
      const picker = flatpickr(createdInput, {
        dateFormat: 'j F Y',
        locale: 'ru',
        allowInput: true,
        onClose: (selectedDates, dateStr, instance) => {
          // Save as ISO date string to database
          const isoDate = selectedDates.length > 0
            ? selectedDates[0].toISOString()
            : null;
          this.saveMetadata(post.id, { created_date: isoDate });
        }
      });
      this.datePickers.set(post.id, picker);
    }

    // Handle tag button click to show dropdown
    tagButton.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = tagDropdown.style.display !== 'none';

      if (isVisible) {
        tagDropdown.style.display = 'none';
      } else {
        // Populate dropdown with available tags
        this.populateTagDropdown(tagDropdown, post.id, tagButton);
        tagDropdown.style.display = 'block';
      }
    });

    // Handle clicks outside editor to close it
    const handleClickOutside = (e) => {
      const editorWrapper = postEl.querySelector('.tiptap-editor-wrapper');

      // Check if click is inside editor
      if (editorWrapper && editorWrapper.contains(e.target)) {
        // Close tag dropdown if clicking elsewhere in editor
        if (!e.target.closest('.nest-post-tag-footer')) {
          tagDropdown.style.display = 'none';
        }
        return; // Click inside editor - do nothing
      }

      // Check if click is on Flatpickr calendar (it's rendered outside editor in body)
      const flatpickrCalendar = e.target.closest('.flatpickr-calendar');
      if (flatpickrCalendar) {
        return; // Click on date picker - do nothing
      }

      // Close tag dropdown
      tagDropdown.style.display = 'none';

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
    };

    // Add click listener with a delay to avoid immediate trigger
    setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 100);

    this.editors.set(post.id, editor);
    postEl.classList.add('nest-post-editing');
    postEl.classList.remove('nest-post-hover');

    // Setup image drag & drop and paste
    setTimeout(() => {
      this.setupImageDragAndDrop(editorEl, editor);
      this.setupImagePaste(editorEl, editor);
    }, 100);

    // Disable insert zones while editing
    this.updateEditorActiveState();
  }

  async deactivateEditor(postId, postEl) {
    const editor = this.editors.get(postId);
    if (!editor) return;

    editor.destroy();
    this.editors.delete(postId);

    // Cleanup date picker if exists
    const picker = this.datePickers.get(postId);
    if (picker) {
      picker.destroy();
      this.datePickers.delete(postId);
    }

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

    // Auto-switch from черновик to лента if post has title and content
    const post = this.posts.find(p => p.id == postId);
    if (post && post.tag === 'черновик') {
      const titleInput = document.querySelector(`.nest-post-title-input[data-post-id="${postId}"]`);
      const title = titleInput ? titleInput.value.trim() : post.title?.trim() || '';
      const hasContent = !editor.isEmpty && editor.getText().trim() !== '';

      if (title && hasContent) {
        await this.saveMetadata(postId, { tag: 'лента' });
        // Update tag button if exists
        const tagButton = document.querySelector(`.nest-post-tag-button[data-post-id="${postId}"]`);
        if (tagButton) {
          tagButton.textContent = '#лента';
          tagButton.dataset.currentTag = 'лента';
        }
      }
    }
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

  async createNewPost(position, clickedZone) {
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

        // Create new post element
        const postEl = this.createPostElement(post);

        // Create insert zone after new post
        const insertZoneAfter = this.createInsertZone(position + 1);

        // Insert new post and zone EXACTLY after the clicked zone
        if (clickedZone && clickedZone.parentNode) {
          // Insert new post right after the clicked zone
          clickedZone.after(postEl);
          // Insert new zone right after the new post
          postEl.after(insertZoneAfter);
          // The clicked zone stays in place before the new post
        } else {
          // Fallback: append to container (should not happen)
          const container = document.getElementById('nest-editor-container');
          container.append(postEl, insertZoneAfter);
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

  // Helper function to upload image file
  async uploadImageFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      return null;
    }

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch(this.apiPath + '/api/upload_image.php', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success && result.file && result.file.url) {
        return result.file.url;
      } else {
        console.error('[PostsManager] Image upload failed:', result.error);
        return null;
      }
    } catch (err) {
      console.error('[PostsManager] Error uploading image:', err);
      return null;
    }
  }

  // Setup drag and drop for images
  setupImageDragAndDrop(editorEl, editor) {
    const proseMirrorEl = editorEl.querySelector('.ProseMirror') || editorEl;

    // Prevent default drag behavior
    proseMirrorEl.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      proseMirrorEl.classList.add('drag-over');
    });

    proseMirrorEl.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      proseMirrorEl.classList.remove('drag-over');
    });

    proseMirrorEl.addEventListener('drop', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      proseMirrorEl.classList.remove('drag-over');

      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;

      // Process all dropped image files
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;

        console.log('[PostsManager] Uploading dropped image:', file.name);
        const url = await this.uploadImageFile(file);

        if (url) {
          // Insert image at cursor position
          editor.chain().focus().setImage({ src: url }).run();
        } else {
          alert('Ошибка загрузки изображения: ' + file.name);
        }
      }
    });
  }

  // Setup paste for images from clipboard
  setupImagePaste(editorEl, editor) {
    const proseMirrorEl = editorEl.querySelector('.ProseMirror') || editorEl;

    proseMirrorEl.addEventListener('paste', async (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      // Check if clipboard contains image
      for (let i = 0; i < items.length; i++) {
        const item = items[i];

        if (item.type.startsWith('image/')) {
          e.preventDefault();
          e.stopPropagation();

          const file = item.getAsFile();
          if (!file) continue;

          console.log('[PostsManager] Uploading pasted image from clipboard');
          const url = await this.uploadImageFile(file);

          if (url) {
            // Insert image at cursor position
            editor.chain().focus().setImage({ src: url }).run();
          } else {
            alert('Ошибка загрузки изображения из буфера обмена');
          }
        }
      }
    });
  }
}
