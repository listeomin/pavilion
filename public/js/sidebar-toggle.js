// sidebar-toggle.js - Sidebar collapse/expand functionality

export function initSidebarToggle() {
  const sidebar = document.querySelector('.nest-sidebar');
  const toggleBtn = document.getElementById('sidebar-toggle');
  const collapsedSections = document.getElementById('sidebar-collapsed-sections');
  const mainColumn = document.querySelector('.main-column');
  
  if (!sidebar || !toggleBtn) return;
  
  const STORAGE_KEY = 'nest-sidebar-collapsed';
  
  function collapse() {
    sidebar.classList.add('collapsed');
    document.body.classList.add('sidebar-collapsed');
    if (mainColumn) {
      mainColumn.style.marginRight = '80px';
    }
    if (sidebar) {
      sidebar.style.width = '80px';
    }
    updateCollapsedSections();
  }
  
  function expand() {
    sidebar.classList.remove('collapsed');
    document.body.classList.remove('sidebar-collapsed');
    if (mainColumn) {
      mainColumn.style.marginRight = '';
    }
    if (sidebar) {
      sidebar.style.width = '';
    }
  }
  
  // Restore state from localStorage
  const isCollapsed = localStorage.getItem(STORAGE_KEY) === 'true';
  if (isCollapsed) {
    collapse();
  }
  
  // Toggle click handler
  toggleBtn.addEventListener('click', () => {
    const willCollapse = !sidebar.classList.contains('collapsed');
    
    if (willCollapse) {
      collapse();
    } else {
      expand();
    }
    
    // Save state
    localStorage.setItem(STORAGE_KEY, willCollapse ? 'true' : 'false');
  });
  
  // Update collapsed sections from full navigation (only Рубрики)
  function updateCollapsedSections() {
    if (!collapsedSections) return;
    
    // Get all section headers from Рубрики tab only
    const navContent = document.getElementById('nest-navigation-content');
    if (!navContent) return;
    
    const sections = navContent.querySelectorAll('.nav-section-header');
    
    collapsedSections.innerHTML = '';
    
    sections.forEach(section => {
      const title = section.textContent.trim();
      const isActive = section.classList.contains('active');
      const sectionId = section.dataset.tagId || section.dataset.section || '';
      
      // Try to get cover image from section
      const coverImg = section.querySelector('img');
      const coverUrl = coverImg ? coverImg.src : null;
      
      const item = document.createElement('div');
      item.className = 'collapsed-section-item' + (isActive ? ' active' : '');
      item.dataset.title = title;
      item.dataset.tagId = sectionId;
      
      if (coverUrl) {
        // Use cover image
        const img = document.createElement('img');
        img.className = 'collapsed-section-img';
        img.src = coverUrl;
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
      
      // Click handler - same as full section
      item.addEventListener('click', () => {
        section.click();
        // Update active state
        collapsedSections.querySelectorAll('.collapsed-section-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
      });
      
      collapsedSections.appendChild(item);
    });
  }
  
  // Watch for section changes (when sections are loaded dynamically)
  const observer = new MutationObserver(() => {
    if (sidebar.classList.contains('collapsed')) {
      updateCollapsedSections();
    }
  });
  
  const navContent = document.getElementById('nest-navigation-content');
  if (navContent) {
    observer.observe(navContent, { childList: true, subtree: true });
  }
  
  // Update when sections might have loaded
  setTimeout(() => {
    if (sidebar.classList.contains('collapsed')) {
      updateCollapsedSections();
    }
  }, 1000);
}
