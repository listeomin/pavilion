// sidebar-toggle.js - Sidebar collapse/expand functionality

export function initSidebarToggle() {
  const sidebar = document.querySelector('.nest-sidebar');
  const toggleBtn = document.getElementById('sidebar-toggle');
  const collapsedSections = document.getElementById('sidebar-collapsed-sections');
  const mainColumn = document.querySelector('.main-column');
  const wrap = document.querySelector('.wrap');

  if (!sidebar || !toggleBtn) return;

  const STORAGE_KEY = 'nest-sidebar-collapsed';
  const AUTO_COLLAPSED_KEY = 'nest-sidebar-auto-collapsed';

  // Breakpoint: wrap margin-left (80) + wrap max-width (720) + sidebar expanded (420) = 1220px
  const COLLAPSE_BREAKPOINT = 1220;
  // Add some buffer before auto-expanding (e.g. 50px extra space)
  const EXPAND_BREAKPOINT = COLLAPSE_BREAKPOINT + 50;

  function collapse() {
    // Update collapsed sections BEFORE hiding navigation content
    updateCollapsedSections();

    sidebar.classList.add('collapsed');
    document.body.classList.add('sidebar-collapsed');

    // Direct style changes
    if (mainColumn) {
      mainColumn.style.marginRight = '80px';
    }
    if (sidebar) {
      sidebar.style.width = '80px';
    }
    if (wrap) {
      wrap.style.maxWidth = 'calc(100vw - 80px - 80px - 32px)';
    }
  }

  function expand() {
    sidebar.classList.remove('collapsed');
    document.body.classList.remove('sidebar-collapsed');

    // Reset styles
    if (mainColumn) {
      mainColumn.style.marginRight = '';
    }
    if (sidebar) {
      sidebar.style.width = '';
    }
    if (wrap) {
      wrap.style.maxWidth = '';
    }
  }

  // Check viewport and auto-collapse/expand
  function checkViewportWidth() {
    const viewportWidth = window.innerWidth;
    const isCollapsed = sidebar.classList.contains('collapsed');
    const userManuallyCollapsed = localStorage.getItem(STORAGE_KEY) === 'true';
    const wasAutoCollapsed = sessionStorage.getItem(AUTO_COLLAPSED_KEY) === 'true';

    if (viewportWidth < COLLAPSE_BREAKPOINT && !isCollapsed) {
      // Viewport too narrow - auto-collapse
      collapse();
      sessionStorage.setItem(AUTO_COLLAPSED_KEY, 'true');
    } else if (viewportWidth >= EXPAND_BREAKPOINT && isCollapsed) {
      // Viewport wide enough - auto-expand only if it was auto-collapsed
      // Don't expand if user manually collapsed it
      if (wasAutoCollapsed && !userManuallyCollapsed) {
        expand();
        sessionStorage.removeItem(AUTO_COLLAPSED_KEY);
      }
    }
  }

  // Restore state from localStorage (user preference)
  const isCollapsed = localStorage.getItem(STORAGE_KEY) === 'true';
  if (isCollapsed) {
    collapse();
  } else {
    // Check if we need to auto-collapse on load
    checkViewportWidth();
  }

  // Toggle click handler
  toggleBtn.addEventListener('click', () => {
    const willCollapse = !sidebar.classList.contains('collapsed');

    if (willCollapse) {
      collapse();
    } else {
      expand();
    }

    // Save state as user preference (manual action)
    localStorage.setItem(STORAGE_KEY, willCollapse ? 'true' : 'false');
    // Clear auto-collapsed flag since this is a manual action
    sessionStorage.removeItem(AUTO_COLLAPSED_KEY);
  });

  // Listen for viewport resize
  let resizeTimeout;
  window.addEventListener('resize', () => {
    // Debounce resize handler
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(checkViewportWidth, 100);
  });
  
  // Update collapsed sections from category tiles (Рубрики)
  function updateCollapsedSections() {
    if (!collapsedSections) return;

    // Get all category tiles from navigation content
    const navContent = document.getElementById('nest-navigation-content');
    if (!navContent) return;

    const tiles = navContent.querySelectorAll('.category-tile');

    collapsedSections.innerHTML = '';

    tiles.forEach(tile => {
      const nameEl = tile.querySelector('.category-tile-name');
      const imgEl = tile.querySelector('.category-tile-image');
      const title = nameEl ? nameEl.textContent.trim() : '';
      const isActive = tile.classList.contains('active');
      const sectionName = tile.dataset.section || '';

      const item = document.createElement('div');
      item.className = 'collapsed-section-item' + (isActive ? ' active' : '');
      item.dataset.title = title;
      item.dataset.section = sectionName;

      if (imgEl && imgEl.src) {
        // Use category image
        const img = document.createElement('img');
        img.className = 'collapsed-section-img';
        img.src = imgEl.src;
        img.alt = title;
        item.appendChild(img);
      } else {
        // Use first letter as icon
        const firstChar = title.charAt(0);
        const icon = document.createElement('span');
        icon.className = 'collapsed-section-icon';
        icon.textContent = firstChar.toUpperCase();
        item.appendChild(icon);
      }

      // Click handler - trigger the original tile click
      item.addEventListener('click', () => {
        tile.click();
        // Update active state
        collapsedSections.querySelectorAll('.collapsed-section-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
      });

      collapsedSections.appendChild(item);
    });
  }
  
  // Sync active state from category-tile to collapsed-section-item
  function syncActiveState() {
    const tiles = document.querySelectorAll('.category-tile');
    const items = collapsedSections?.querySelectorAll('.collapsed-section-item');
    if (!items) return;

    tiles.forEach(tile => {
      const sectionName = tile.dataset.section;
      const isActive = tile.classList.contains('active');
      const item = Array.from(items).find(i => i.dataset.section === sectionName);
      if (item) {
        item.classList.toggle('active', isActive);
      }
    });
  }

  // Watch for section changes (when sections are loaded dynamically)
  const observer = new MutationObserver((mutations) => {
    let needsUpdate = false;
    let needsSync = false;

    mutations.forEach(mutation => {
      if (mutation.type === 'childList') {
        needsUpdate = true;
      }
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        needsSync = true;
      }
    });

    if (needsUpdate && sidebar.classList.contains('collapsed')) {
      updateCollapsedSections();
    } else if (needsSync) {
      syncActiveState();
    }
  });

  const navContent = document.getElementById('nest-navigation-content');
  if (navContent) {
    observer.observe(navContent, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  }

  // Update when sections might have loaded
  setTimeout(() => {
    if (sidebar.classList.contains('collapsed')) {
      updateCollapsedSections();
    }
  }, 1000);

  // Also update collapsed sections when sidebar is collapsed
  const collapseObserver = new MutationObserver(() => {
    if (sidebar.classList.contains('collapsed')) {
      updateCollapsedSections();
    }
  });
  collapseObserver.observe(sidebar, { attributes: true, attributeFilter: ['class'] });
}
