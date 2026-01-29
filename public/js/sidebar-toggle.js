// sidebar-toggle.js - Sidebar collapse/expand functionality

export function initSidebarToggle() {
  const sidebar = document.querySelector('.nest-sidebar');
  const toggleBtn = document.getElementById('sidebar-toggle');
  const collapsedSections = document.getElementById('sidebar-collapsed-sections');
  
  if (!sidebar || !toggleBtn) return;
  
  const STORAGE_KEY = 'nest-sidebar-collapsed';
  
  // Restore state from localStorage
  const isCollapsed = localStorage.getItem(STORAGE_KEY) === 'true';
  if (isCollapsed) {
    sidebar.classList.add('collapsed');
    document.body.classList.add('sidebar-collapsed');
    updateCollapsedSections();
  }
  
  // Toggle click handler
  toggleBtn.addEventListener('click', () => {
    const willCollapse = !sidebar.classList.contains('collapsed');
    
    sidebar.classList.toggle('collapsed');
    document.body.classList.toggle('sidebar-collapsed');
    
    // Save state
    localStorage.setItem(STORAGE_KEY, willCollapse ? 'true' : 'false');
    
    if (willCollapse) {
      updateCollapsedSections();
    }
  });
  
  // Update collapsed sections from full navigation
  function updateCollapsedSections() {
    if (!collapsedSections) return;
    
    // Get all section headers from the full navigation
    const sections = document.querySelectorAll('.nav-section-header');
    
    collapsedSections.innerHTML = '';
    
    sections.forEach(section => {
      const title = section.textContent.trim();
      const isActive = section.classList.contains('active');
      const sectionId = section.dataset.tagId || '';
      
      // Get first letter or emoji for icon
      const firstChar = title.charAt(0);
      const isEmoji = /\p{Emoji}/u.test(firstChar);
      
      const item = document.createElement('div');
      item.className = 'collapsed-section-item' + (isActive ? ' active' : '');
      item.dataset.title = title;
      item.dataset.tagId = sectionId;
      
      // Use first letter as icon
      const icon = document.createElement('span');
      icon.className = 'collapsed-section-icon';
      icon.textContent = isEmoji ? firstChar : firstChar.toUpperCase();
      item.appendChild(icon);
      
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
  
  // Also update when switching tabs
  document.querySelectorAll('.nest-nav-item').forEach(navItem => {
    navItem.addEventListener('click', () => {
      setTimeout(() => {
        if (sidebar.classList.contains('collapsed')) {
          updateCollapsedSections();
        }
      }, 100);
    });
  });
}
