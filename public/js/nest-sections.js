// nest-sections.js - Module for managing nest sections

/**
 * Create sections manager
 * @param {Object} config - Configuration object
 * @param {Function} onUpdate - Callback when sections are updated
 * @returns {Object} Sections manager with methods
 */
export function createSectionsManager(config, onUpdate) {
  let cachedSections = [];
  let sectionsLoaded = false;

  // Load sections from server
  const loadSections = async () => {
    try {
      const username = config.urlUsername;
      const url = username
        ? 'api/nest_sections.php?action=get&username=' + encodeURIComponent(username)
        : 'api/nest_sections.php?action=get';

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        cachedSections = data.sections || [];
        sectionsLoaded = true;
      }
    } catch (error) {
      console.error('Failed to load sections:', error);
      cachedSections = [];
      sectionsLoaded = true;
    }
  };

  const getSections = () => {
    return cachedSections;
  };

  const saveSections = (sections) => {
    cachedSections = sections;

    // Save to server asynchronously (only for own nest)
    if (config.isOwnNest) {
      fetch('api/nest_sections.php?action=save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections })
      }).catch(error => console.error('Failed to save sections:', error));
    }
  };

  const addSection = (name) => {
    // Capitalize first letter
    const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);
    const sections = getSections();

    // Check if section already exists (case-insensitive)
    const exists = sections.some(s => s.toLowerCase() === capitalizedName.toLowerCase());

    if (!exists) {
      sections.push(capitalizedName);
      saveSections(sections);
      if (onUpdate) onUpdate();
    }
  };

  const removeSection = (name) => {
    const sections = getSections();
    const filtered = sections.filter(s => s !== name);
    saveSections(filtered);
    if (onUpdate) onUpdate();
  };

  return {
    loadSections,
    getSections,
    saveSections,
    addSection,
    removeSection
  };
}

/**
 * Show custom input modal
 */
export function showInputModal(title, placeholder, callback) {
  // Create modal overlay
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 9999; display: flex; align-items: center; justify-content: center;';

  // Create modal
  const modal = document.createElement('div');
  modal.className = 'context-menu active';
  modal.style.cssText = 'position: relative; opacity: 1; pointer-events: auto; transform: scale(1);';

  const titleEl = document.createElement('div');
  titleEl.textContent = title;
  titleEl.style.cssText = 'color: #ffffff; font-size: 16px; font-weight: 600; margin-bottom: 12px;';

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = placeholder;
  input.style.cssText = 'width: 100%; padding: 12px; border: none; border-radius: 8px; font-size: 15px; font-family: Ubuntu Sans, sans-serif; margin-bottom: 12px; outline: none;';

  const buttonsContainer = document.createElement('div');
  buttonsContainer.style.cssText = 'display: flex; gap: 8px;';

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Отмена';
  cancelBtn.className = 'context-menu-item';
  cancelBtn.style.cssText = 'flex: 1; margin: 0;';

  const okBtn = document.createElement('button');
  okBtn.textContent = 'Создать';
  okBtn.className = 'context-menu-item';
  okBtn.style.cssText = 'flex: 1; margin: 0; background: rgba(255, 255, 255, 0.2);';

  modal.appendChild(titleEl);
  modal.appendChild(input);
  buttonsContainer.appendChild(cancelBtn);
  buttonsContainer.appendChild(okBtn);
  modal.appendChild(buttonsContainer);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  input.focus();

  const close = (value) => {
    document.body.removeChild(overlay);
    if (value !== null) callback(value);
  };

  cancelBtn.onclick = () => close(null);
  okBtn.onclick = () => close(input.value);
  input.onkeydown = (e) => {
    if (e.key === 'Enter') close(input.value);
    if (e.key === 'Escape') close(null);
  };
  overlay.onclick = (e) => {
    if (e.target === overlay) close(null);
  };
}

/**
 * Show context menu for section
 */
export function showSectionContextMenu(sectionName, onRemove, x, y) {
  // Remove existing context menu
  const existing = document.querySelector('.section-context-menu');
  if (existing) existing.remove();

  const menu = document.createElement('div');
  menu.className = 'context-menu active section-context-menu';
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';

  const deleteItem = document.createElement('div');
  deleteItem.className = 'context-menu-item context-menu-item-danger';
  deleteItem.textContent = 'Удалить';
  deleteItem.onclick = () => {
    onRemove(sectionName);
    menu.remove();
  };

  menu.appendChild(deleteItem);
  document.body.appendChild(menu);

  // Close menu on click outside
  const closeMenu = (e) => {
    if (!menu.contains(e.target)) {
      menu.remove();
      document.removeEventListener('click', closeMenu);
    }
  };
  setTimeout(() => document.addEventListener('click', closeMenu), 0);
}
