// nest-posts-manager.js
import { initAudioPlayer } from './audio-player.js?v=2';

// TipTap modules will be loaded dynamically to avoid blocking page load
let Editor, StarterKit, Link, Image, Placeholder, AudioPlayer;
let tiptapModulesLoaded = false;

// Load TipTap modules dynamically (only when needed for editing)
async function loadTipTapModules() {
  if (tiptapModulesLoaded) return;

  const [editorModule, starterKitModule, linkModule, imageModule, placeholderModule, audioModule] = await Promise.all([
    import('https://esm.sh/@tiptap/core@2.1.13'),
    import('https://esm.sh/@tiptap/starter-kit@2.1.13'),
    import('https://esm.sh/@tiptap/extension-link@2.1.13'),
    import('https://esm.sh/@tiptap/extension-image@2.1.13'),
    import('https://esm.sh/@tiptap/extension-placeholder@2.1.13'),
    import('./tiptap-audio-extension.js?v=2')
  ]);

  Editor = editorModule.Editor;
  StarterKit = starterKitModule.default;
  Link = linkModule.default;
  Image = imageModule.default;
  Placeholder = placeholderModule.default;
  AudioPlayer = audioModule.AudioPlayer;
  tiptapModulesLoaded = true;
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
    this.postsPerPage = 10; // Reduced from 20 for faster initial load
    this.currentOffset = 0;
    this.totalPosts = 0;
    this.isLoading = false;
    this.hasMorePosts = true;

    // Initialize Day.js with Russian locale and relativeTime
    if (window.dayjs) {
      dayjs.extend(dayjs_plugin_relativeTime);
      dayjs.locale('ru');
    }

    // Preload TipTap modules in background if this is own nest
    if (this.config.isOwnNest) {
      loadTipTapModules().catch(err => {
        console.error('[PostsManager] Failed to preload TipTap modules:', err);
      });
    }

    // Category descriptions for header blocks
    this.categoryDescriptions = {
      'лента': 'Вероятно не самый любимый формат размышлений – мысли без Рубрики, проходные, мимолётные, те что интересны в моменте, привязаны ко времени, но ничего серьезного, простите в этой рубрике нет.',
      'разработка': 'Айтишные дела живут тут! Не Хабр, не UX-hub, ценность в контексте наблюдения за развитием автора, как разработчика, дизайнера и вообщем человека интересующегося миром технологий, кода и AI.',
      'наблюдения': 'Без преувеличения наиболее ценный для автора раздел. Тут много философии, глубоких (иногда бредовых и смешных) размышлений об устройстве мира, в частности людей, но далеко не только их, далеко не только…',
      'психонавтика': 'У автора не плохой опыт космических путешествий без ракеты и скафандра. Тут нет места морали, местами безумно глупо и смешно, где-то есть над чем задуматься. Возможно мой опыт в теме убедит вас не начинать свой.',
      'воспоминания': 'Пишу то, что чувствую. Хочется больше эмоций, меньше критики и анализа. Личные чувства, немношко рефлексии, часто фотографии и музыка. Добро пожаловать!'
    };

    // Category images mapping
    this.categoryImages = {
      'лента': 'лента.png',
      'разработка': 'разработка.png',
      'наблюдения': 'наблюдения.png',
      'твои сны': 'сны.png',
      'психонавтика': 'психонавтика.png',
      'краски да холсты': 'краски_да_холсты.png',
      'стихи': 'стихи.png',
      'рассказы': 'рассказы.png',
      'рефлексия': 'рефлексия.png',
      'фотокарточки': 'фотокарточки.png',
      'воспоминания': 'воспоминания.png',
      'письма': 'письма.png',
      'музыка': 'музыка.png',
      'фильмы': 'кинофильмы.png',
      'пейджер': 'пейджер.png',
      'черновики': 'черновики.png'
    };
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
    const response = await fetch(url);
    const result = await response.json();
    if (result.success && result.posts) {
      this.allPostsMetadata = result.posts;
      this.totalPosts = result.total || result.posts.length;
    }
    return this.allPostsMetadata;
  }

  async loadCounts() {
    // Load post counts per tag/category (fast, no posts loading)
    const url = `${this.apiPath}/api/nest_posts.php?action=get_counts&username=${encodeURIComponent(this.config.urlUsername)}`;
    const response = await fetch(url);
    const result = await response.json();
    if (result.success && result.counts) {
      this.postCounts = result.counts;
    }
    return this.postCounts;
  }

  async loadPosts(reset = false) {

    // If own nest, load all posts with content (needed for display)
    if (this.config.isOwnNest) {
      const url = `${this.apiPath}/api/nest_posts.php?action=list&username=${encodeURIComponent(this.config.urlUsername)}`;
      const response = await fetch(url);
      const result = await response.json();
      if (result.success && result.posts) {
        this.posts = result.posts;
        this.totalPosts = result.total || result.posts.length;
      }
      return this.posts;
    }

    // For viewing mode, use pagination
    if (reset) {
      this.currentOffset = 0;
      this.posts = [];
      this.hasMorePosts = true;
    }

    if (this.isLoading || !this.hasMorePosts) {
      return this.posts;
    }

    this.isLoading = true;

    // Build URL with optional tag filter
    let url = `${this.apiPath}/api/nest_posts.php?action=list&username=${encodeURIComponent(this.config.urlUsername)}&limit=${this.postsPerPage}&offset=${this.currentOffset}`;
    if (this.currentFilter && this.currentFilter.type === 'section' && this.currentFilter.name) {
      url += `&tag=${encodeURIComponent(this.currentFilter.name)}`;
    }


    try {
      const response = await fetch(url);
      const result = await response.json();


      if (result.success && result.posts) {
        this.posts = [...this.posts, ...result.posts];
        this.totalPosts = result.total || 0;
        this.currentOffset += result.posts.length;
        this.hasMorePosts = this.posts.length < this.totalPosts;
      } else {
      }
    } catch (err) {
    } finally {
      this.isLoading = false;
    }

    return this.posts;
  }

  // Load a single post by ID (for updating after edit)
  async loadSinglePost(postId) {
    const post = this.posts.find(p => p.id == postId);
    if (!post || !post.slug) return null;

    try {
      const response = await fetch(`${this.apiPath}/api/nest_posts.php?action=get&username=${encodeURIComponent(this.config.urlUsername)}&slug=${encodeURIComponent(post.slug)}`);
      const result = await response.json();

      if (result.success && result.post) {
        // Update post in local array
        const index = this.posts.findIndex(p => p.id == postId);
        if (index !== -1) {
          this.posts[index] = result.post;
        }
        return result.post;
      }
    } catch (err) {
      console.error('[PostsManager] Failed to load single post:', err);
    }
    return null;
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

  // Set filter for posts and reload if needed
  async setFilter(filterType, filterValue, reload = true) {
    const previousFilter = this.currentFilter;

    if (!filterType) {
      this.currentFilter = null;
    } else {
      this.currentFilter = { type: filterType, name: filterValue };
    }

    // If filter changed and we're in viewing mode, reload posts from backend
    const filterChanged = JSON.stringify(previousFilter) !== JSON.stringify(this.currentFilter);
    if (reload && !this.config.isOwnNest && filterChanged) {
      await this.loadPosts(true); // Reset and reload with new filter
    }
  }

  // Get filtered and sorted posts
  getFilteredPosts() {
    let posts = this.sortPosts();

    // Apply client-side filter only if in own nest mode (all posts loaded)
    // In viewing mode, backend already filters posts, so no need to filter again
    if (this.config.isOwnNest && this.currentFilter && this.currentFilter.type === 'section') {
      const sectionName = this.currentFilter.name.toLowerCase();
      posts = posts.filter(post => {
        return post.tag && post.tag.toLowerCase() === sectionName;
      });
    }

    return posts;
  }

  // Create category header block element
  createCategoryHeader(categoryName) {
    const nameLower = categoryName.toLowerCase();
    const description = this.categoryDescriptions[nameLower] || 'Описание';
    const image = this.categoryImages[nameLower];

    // Only show header if we have an image (category exists)
    if (!image) return null;

    const block = document.createElement('div');
    block.className = 'category-header-block';

    // Title
    const title = document.createElement('h2');
    title.className = 'category-header-title';
    title.textContent = categoryName;
    block.appendChild(title);

    // Card with image + description (always show)
    const card = document.createElement('div');
    card.className = 'category-header-card';

    // Image section
    const imageSection = document.createElement('div');
    imageSection.className = 'category-header-image';
    const img = document.createElement('img');
    img.src = `assets/categories/${encodeURIComponent(image)}`;
    img.alt = categoryName;
    imageSection.appendChild(img);
    card.appendChild(imageSection);

    // Description section
    const descSection = document.createElement('div');
    descSection.className = 'category-header-description';
    const descP = document.createElement('p');
    descP.textContent = description;
    descSection.appendChild(descP);
    card.appendChild(descSection);

    block.appendChild(card);

    return block;
  }

  renderPostsList(container, append = false) {

    if (!append) {
      container.innerHTML = '';
    }

    // Remove initial loader if it exists (on first render)
    const initialLoader = document.getElementById('initial-loader');
    if (initialLoader) {
      initialLoader.remove();
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

    // Add category header when filtered by section (not in append mode)
    if (!append && this.currentFilter && this.currentFilter.type === 'section') {
      const categoryHeader = this.createCategoryHeader(this.currentFilter.name);
      if (categoryHeader) {
        container.appendChild(categoryHeader);
      }
    }

    if (!append && this.config.isOwnNest) {
      const beforeFirstZone = this.createInsertZone(0);
      container.appendChild(beforeFirstZone);
    }

    let postsToRender;

    if (append) {
      // When appending, only render posts that aren't already in the DOM
      // to avoid duplicates when sorting changes post order
      const renderedIds = new Set(
        Array.from(container.querySelectorAll('.nest-post[data-post-id]'))
          .map(el => el.dataset.postId)
      );
      postsToRender = sortedPosts.filter(post => !renderedIds.has(String(post.id)));
    } else {
      postsToRender = sortedPosts;
    }

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
      loadingEl.innerHTML = `
        <div class="skeleton-loader">
          <div class="skeleton-spinner"></div>
          <div class="skeleton-text">Загрузка...</div>
        </div>
      `;
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
            // Include section parameter to preserve sidebar state
            window.location.href = `${baseUrl}/${post.slug}?section=${encodeURIComponent(sectionName)}`;
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

      // Simple JSON to HTML converter (without loading TipTap)
      if (parsed.type === 'doc' && parsed.content) {
        return this.tiptapJsonToHtml(parsed.content);
      }

      return '<p><br></p>';
    } catch (e) {
      // If not JSON, treat as HTML
      return jsonContent;
    }
  }

  // Simple TipTap JSON to HTML converter (without loading full TipTap)
  tiptapJsonToHtml(nodes) {
    return nodes.map(node => {
      switch (node.type) {
        case 'paragraph':
          if (!node.content || node.content.length === 0) {
            return '<p><br></p>';
          }
          const pContent = node.content.map(c => this.nodeToHtml(c)).join('');
          return `<p>${pContent}</p>`;

        case 'heading':
          const level = node.attrs?.level || 2;
          const hContent = node.content?.map(c => this.nodeToHtml(c)).join('') || '';
          return `<h${level}>${hContent}</h${level}>`;

        case 'bulletList':
          const ulItems = node.content?.map(li => this.tiptapJsonToHtml([li])).join('') || '';
          return `<ul>${ulItems}</ul>`;

        case 'orderedList':
          const olItems = node.content?.map(li => this.tiptapJsonToHtml([li])).join('') || '';
          return `<ol>${olItems}</ol>`;

        case 'listItem':
          const liContent = node.content?.map(c => this.tiptapJsonToHtml([c])).join('') || '';
          return `<li>${liContent}</li>`;

        case 'codeBlock':
          const codeContent = node.content?.map(c => this.nodeToHtml(c)).join('') || '';
          return `<pre><code>${codeContent}</code></pre>`;

        case 'blockquote':
          const bqContent = node.content?.map(c => this.tiptapJsonToHtml([c])).join('') || '';
          return `<blockquote>${bqContent}</blockquote>`;

        case 'image':
          const src = node.attrs?.src || '';
          const alt = node.attrs?.alt || '';
          return `<img src="${src}" alt="${alt}" class="tiptap-image" loading="lazy" decoding="async">`;

        case 'audioPlayer':
          const audioSrc = node.attrs?.src || '';
          const artist = node.attrs?.artist || '';
          const track = node.attrs?.track || 'Аудио файл';
          return `
            <div class="audio-player" data-audio-player data-audio-url="${audioSrc}">
              <button class="audio-play-btn" title="Воспроизвести">
                <svg viewBox="0 0 10 12" fill="none" class="play-icon">
                  <path d="M0.5 0.492737V11.5077C0.501568 11.5956 0.526397 11.6815 0.571779 11.7567C0.617162 11.832 0.681744 11.894 0.758733 11.9364C0.835721 11.9788 0.922609 12.0001 1.01049 11.9983C1.09838 11.9964 1.18423 11.9714 1.25938 11.9258L10.2644 6.41826C10.3363 6.37479 10.3958 6.31343 10.4371 6.24017C10.4784 6.16692 10.5 6.08415 10.5 6.00015C10.5 5.91616 10.4784 5.83339 10.4371 5.76014C10.3958 5.68688 10.3363 5.62552 10.2644 5.58205L1.25938 0.0745248C1.18423 0.0289309 1.09838 0.00393112 1.01049 0.00208127C0.922609 0.000231421 0.835721 0.0215731 0.758733 0.0639786C0.681744 0.106384 0.617162 0.168341 0.571779 0.243595C0.526397 0.318849 0.501568 0.404787 0.5 0.492737Z" fill="#FAF9F5"/>
                </svg>
                <svg viewBox="0 0 8 12" fill="none" class="pause-icon" style="display: none;">
                  <path d="M0.5 1C0.5 0.723858 0.723858 0.5 1 0.5H2.5C2.77614 0.5 3 0.723858 3 1V11C3 11.2761 2.77614 11.5 2.5 11.5H1C0.723858 11.5 0.5 11.2761 0.5 11V1Z M5 1C5 0.723858 5.22386 0.5 5.5 0.5H7C7.27614 0.5 7.5 0.723858 7.5 1V11C7.5 11.2761 7.27614 11.5 7 11.5H5.5C5.22386 11.5 5 11.2761 5 11V1Z" fill="#FAF9F5"/>
                </svg>
                <div class="audio-equalizer">
                  <div class="audio-equalizer-bar"></div>
                  <div class="audio-equalizer-bar"></div>
                  <div class="audio-equalizer-bar"></div>
                </div>
              </button>
              <div class="audio-info">
                <div class="audio-artist">${artist}</div>
                <div class="audio-track">${track}</div>
              </div>
              <div class="audio-time">00:00</div>
              <div class="audio-progress-container">
                <div class="audio-progress-bar"></div>
              </div>
            </div>
          `;

        case 'horizontalRule':
          return '<hr>';

        default:
          return '';
      }
    }).join('');
  }

  // Convert text node with marks to HTML
  nodeToHtml(node) {
    if (node.type === 'text') {
      let html = node.text || '';

      // Escape HTML
      html = html.replace(/&/g, '&amp;')
                 .replace(/</g, '&lt;')
                 .replace(/>/g, '&gt;')
                 .replace(/"/g, '&quot;');

      // Apply marks
      if (node.marks) {
        node.marks.forEach(mark => {
          switch (mark.type) {
            case 'bold':
              html = `<strong>${html}</strong>`;
              break;
            case 'italic':
              html = `<em>${html}</em>`;
              break;
            case 'code':
              html = `<code>${html}</code>`;
              break;
            case 'link':
              const href = mark.attrs?.href || '';
              html = `<a href="${href}" class="tiptap-link">${html}</a>`;
              break;
            case 'strike':
              html = `<s>${html}</s>`;
              break;
          }
        });
      }

      return html;
    } else if (node.type === 'hardBreak') {
      return '<br>';
    }

    return '';
  }

  createPostElement(post) {
    const postEl = document.createElement('article');
    postEl.className = 'nest-post';
    postEl.dataset.postId = post.id;
    postEl.dataset.position = post.position;

    // Title display (read-only) - make it a link to the post
    if (post.title && post.title.trim() !== '' && post.title !== 'Новая статья') {
      const titleEl = document.createElement('h1');
      titleEl.className = 'nest-post-title-display';

      // Make title a clickable link (for all users viewing posts list)
      if (post.slug && this.config.urlUsername) {
        const titleLink = document.createElement('a');
        titleLink.href = this.apiPath + '/nest/' + this.config.urlUsername + '/' + post.slug;
        titleLink.textContent = post.title;
        titleLink.style.cssText = 'color:inherit;text-decoration:none;transition:color 0.2s;';
        titleLink.addEventListener('mouseenter', () => { titleLink.style.color = '#788C5D'; titleLink.style.textDecoration = 'underline'; });
        titleLink.addEventListener('mouseleave', () => { titleLink.style.color = 'inherit'; titleLink.style.textDecoration = 'none'; });
        titleEl.appendChild(titleLink);
      } else {
        titleEl.textContent = post.title;
      }

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

    // Initialize audio players
    contentEl.querySelectorAll('.audio-player[data-audio-player]').forEach(playerEl => {
      const audioUrl = playerEl.dataset.audioUrl;
      const artist = playerEl.querySelector('.audio-artist')?.textContent || '';
      const track = playerEl.querySelector('.audio-track')?.textContent || '';
      if (audioUrl) {
        initAudioPlayer(playerEl, audioUrl, { type: 'music', artist, track });
      }
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
        // Don't activate editor when clicking on links (but allow images)
        if (e.target.tagName === 'A') return;
        if (!this.editors.has(post.id)) {
          // Save click coordinates for cursor positioning
          const clickX = e.clientX;
          const clickY = e.clientY;
          this.activateEditor(post, postEl, { clickX, clickY });
        }
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
    // Make toolbar non-editable and non-selectable to prevent content leakage
    toolbar.contentEditable = 'false';
    toolbar.setAttribute('data-tiptap-toolbar', 'true');
    toolbar.innerHTML = `
      <div class="tiptap-toolbar-group">
        <button type="button" class="tiptap-toolbar-button" data-action="bold" title="Bold (Ctrl+B)">
          <img src="assets/tiptap/bold.svg" alt="Bold" width="24" height="24" draggable="false">
        </button>
        <button type="button" class="tiptap-toolbar-button" data-action="italic" title="Italic (Ctrl+I)">
          <img src="assets/tiptap/Italic.svg" alt="Italic" width="24" height="24" draggable="false">
        </button>
        <button type="button" class="tiptap-toolbar-button" data-action="code" title="Code (Ctrl+E)">
          <img src="assets/tiptap/code.svg" alt="Code" width="24" height="24" draggable="false">
        </button>
      </div>
      <div class="tiptap-toolbar-separator"></div>
      <div class="tiptap-toolbar-group">
        <button type="button" class="tiptap-toolbar-button" data-action="h1" title="Heading 1">
          <img src="assets/tiptap/h1.svg" alt="H1" width="24" height="24" draggable="false">
        </button>
        <button type="button" class="tiptap-toolbar-button" data-action="h2" title="Heading 2">
          <img src="assets/tiptap/h2.svg" alt="H2" width="24" height="24" draggable="false">
        </button>
        <button type="button" class="tiptap-toolbar-button" data-action="h3" title="Heading 3">
          <img src="assets/tiptap/h3.svg" alt="H3" width="24" height="24" draggable="false">
        </button>
      </div>
      <div class="tiptap-toolbar-separator"></div>
      <div class="tiptap-toolbar-group">
        <button type="button" class="tiptap-toolbar-button" data-action="bulletList" title="Bullet List">
          <img src="assets/tiptap/list-dashes.svg" alt="Bullet List" width="24" height="24" draggable="false">
        </button>
        <button type="button" class="tiptap-toolbar-button" data-action="orderedList" title="Ordered List">
          <img src="assets/tiptap/list-numbers.svg" alt="Ordered List" width="24" height="24" draggable="false">
        </button>
      </div>
      <div class="tiptap-toolbar-separator"></div>
      <div class="tiptap-toolbar-group">
        <button type="button" class="tiptap-toolbar-button" data-action="codeBlock" title="Code Block">
          <img src="assets/tiptap/code-block.svg" alt="Code Block" width="24" height="24" draggable="false">
        </button>
        <button type="button" class="tiptap-toolbar-button" data-action="link" title="Link">
          <img src="assets/tiptap/link.svg" alt="Link" width="24" height="24" draggable="false">
        </button>
        <button type="button" class="tiptap-toolbar-button" data-action="image" title="Image">
          <img src="assets/tiptap/image.svg" alt="Image" width="24" height="24" draggable="false">
        </button>
        <button type="button" class="tiptap-toolbar-button" data-action="audio" title="Audio">
          <img src="assets/tiptap/music.svg" alt="Audio" width="24" height="24" draggable="false">
        </button>
      </div>
      <div class="tiptap-toolbar-separator"></div>
      <div class="tiptap-toolbar-group">
        <button type="button" class="tiptap-toolbar-button tiptap-toolbar-delete" data-action="delete" data-post-id="${postId}" title="Удалить статью">
          <img src="assets/tiptap/del.svg" alt="Delete" width="24" height="24" draggable="false">
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
          case 'audio':
            const audioInput = document.createElement('input');
            audioInput.type = 'file';
            audioInput.accept = 'audio/*';
            audioInput.onchange = async (e) => {
              const file = e.target.files[0];
              if (!file) return;

              try {
                const formData = new FormData();
                formData.append('audio', file);

                const response = await fetch(this.apiPath + '/api/upload_audio.php', {
                  method: 'POST',
                  body: formData
                });

                const result = await response.json();

                if (result.success && result.file) {
                  editor.chain().focus().setAudioPlayer({
                    src: result.file.url,
                    artist: result.file.artist || '',
                    track: result.file.track || file.name
                  }).run();
                } else {
                  alert('Ошибка загрузки аудио: ' + (result.error || 'Неизвестная ошибка'));
                }
              } catch (err) {
                console.error('[NestPostsManager] Error uploading audio:', err);
                alert('Ошибка: ' + err.message);
              }
            };
            audioInput.click();
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

  async activateEditor(post, postEl, clickCoords = null) {
    // Load TipTap modules if not already loaded
    await loadTipTapModules();

    const contentEl = postEl.querySelector('.nest-post-content');

    // Parse JSON content for TipTap (it can accept JSON object directly)
    let editorContent = '';
    const rawContent = post.content || '';

    if (rawContent && rawContent !== '{}' && rawContent.trim() !== '') {
      try {
        // Try to parse as TipTap JSON
        const parsed = JSON.parse(rawContent);
        if (parsed.type === 'doc') {
          editorContent = parsed; // Pass JSON object directly to TipTap
        } else {
          editorContent = rawContent; // Fallback to raw (might be HTML)
        }
      } catch (e) {
        // If not valid JSON, treat as HTML
        editorContent = rawContent;
      }
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

    // Created date - EDITABLE with HeroUI DatePicker
    const createdDiv = document.createElement('div');
    createdDiv.className = 'nest-post-date nest-post-date-editable';

    // Container for HeroUI DatePicker
    const datePickerContainer = document.createElement('div');
    datePickerContainer.className = 'heroui-datepicker-container';
    datePickerContainer.dataset.postId = post.id;

    createdDiv.innerHTML = `
      <img src="assets/date-create.svg" alt="Создано" class="nest-post-date-icon">
    `;
    createdDiv.appendChild(datePickerContainer);
    datesSection.appendChild(createdDiv);

    // Initialize HeroUI DatePicker after element is in DOM
    setTimeout(() => {
      if (window.HeroUI && window.HeroUI.renderDatePicker) {
        const cleanup = window.HeroUI.renderDatePicker(datePickerContainer, {
          value: post.created_date || null,
          label: '',
          onChange: (isoDate) => {
            this.saveMetadata(post.id, { created_date: isoDate });
          }
        });
        // Store cleanup function
        this.datePickers.set(post.id, { destroy: cleanup });
      }
    }, 0);

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
        Image.configure({
          inline: false,
          allowBase64: true,
          HTMLAttributes: {
            class: 'tiptap-image',
          },
        }),
        AudioPlayer,
        Placeholder.configure({
          placeholder: 'Начните писать...',
        }),
      ],
      content: editorContent,
      editable: true,
      autofocus: !clickCoords, // Only autofocus if no click coords (new post)
      onUpdate: ({ editor }) => this.scheduleAutosave(post.id, editor),
    });

    // If we have click coordinates, position cursor at that location
    if (clickCoords) {
      // Wait for editor to be ready and DOM to settle
      setTimeout(() => {
        try {
          const { clickX, clickY } = clickCoords;
          // Use TipTap's posAtCoords to find position at click coordinates
          const pos = editor.view.posAtCoords({ left: clickX, top: clickY });
          if (pos) {
            // Set cursor at clicked position
            editor.chain().focus().setTextSelection(pos.pos).run();
          } else {
            // Fallback: focus at the end
            editor.commands.focus('end');
          }
        } catch (err) {
          console.error('[PostsManager] Error positioning cursor:', err);
          // Fallback: focus at the end
          editor.commands.focus('end');
        }
      }, 50);
    }

    // Setup toolbar functionality
    this.setupToolbar(editor, toolbar);

    // Handle title changes
    titleInput.addEventListener('input', () => {
      clearTimeout(titleInput.saveTimer);
      titleInput.saveTimer = setTimeout(() => {
        this.saveMetadata(post.id, { title: titleInput.value });
      }, 1000);
    });

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

      // Check if click is on HeroUI popover (DatePicker calendar, rendered in portal)
      const heroUIPopover = e.target.closest('[data-slot="popover"]') || e.target.closest('[data-slot="calendar"]');
      if (heroUIPopover) {
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

    // Save current scroll position
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;

    // Get current content before destroying editor
    const currentContent = editor.getJSON();
    const titleInput = postEl.querySelector('.nest-post-title-input');
    const currentTitle = titleInput ? titleInput.value : '';

    editor.destroy();
    this.editors.delete(postId);

    // Cleanup HeroUI date picker if exists
    const picker = this.datePickers.get(postId);
    if (picker) {
      if (typeof picker.destroy === 'function') {
        picker.destroy();
      } else if (typeof picker === 'function') {
        picker(); // HeroUI returns cleanup function directly
      }
      this.datePickers.delete(postId);
    }

    // Load only this single post instead of all posts (performance optimization)
    const post = await this.loadSinglePost(postId);

    if (post) {
      // Replace only this post element
      const newPostEl = this.createPostElement(post);
      postEl.replaceWith(newPostEl);
    } else {
      // Post was deleted or not found, remove element
      postEl.remove();
    }

    // Restore scroll position after DOM updates
    requestAnimationFrame(() => {
      window.scrollTo(scrollX, scrollY);
    });

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
