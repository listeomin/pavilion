// public/js/animalProfile.js
import { AnimalData } from './animalData.js?v=6';

export class AnimalProfile {
  constructor(sessionId, currentEmoji, onSave) {
    this.sessionId = sessionId;
    this.currentEmoji = currentEmoji;
    this.onSave = onSave;
    this.data = new AnimalData();
    this.profiles = {}; // Store profiles for each emoji
    this.selectedEmoji = currentEmoji;
    this.currentPage = 0;
    this.itemsPerPage = 20;
    
    this.overlay = null;
    this.modal = null;
  }

  async init() {
    await this.data.loadAll();
    this.createModal();
    this.attachEventListeners();
  }

  createModal() {
    // Overlay
    this.overlay = document.createElement('div');
    this.overlay.id = 'animal-profile-overlay';
    this.overlay.innerHTML = `
      <div id="animal-profile-modal">
        <div class="animal-profile-left">
          <div class="animal-profile-info-icon">
            <img src="./assets/Info.svg" alt="Info">
          </div>
          <div class="animal-profile-large-emoji" id="large-emoji">🐳</div>
          <div class="animal-profile-grid" id="animal-grid"></div>
          <div class="animal-profile-pagination" id="pagination"></div>
        </div>
        <div class="animal-profile-right">
          <div class="animal-profile-title">Звериный профиль</div>
          
          <div class="animal-profile-field">
            <div class="animal-profile-label">Вид</div>
            <div class="animal-profile-input-wrapper" id="kind-wrapper">
              <span class="animal-profile-emoji-icon" id="kind-emoji">🐳</span>
              <input 
                type="text" 
                class="animal-profile-input" 
                id="kind-input"
                placeholder="52-герцовый великан"
                minlength="2"
              >
              <div class="animal-profile-icon-btn" id="refresh-kind">
                <img src="./assets/refresh.svg" alt="Refresh">
              </div>
            </div>
            <div class="animal-profile-tooltip" id="kind-tooltip">Имя вашего зверя</div>
          </div>

          <div class="animal-profile-field">
            <div class="animal-profile-label">Ареал обитания</div>
            <div class="animal-profile-input-wrapper">
              <select class="animal-profile-select" id="arial-select"></select>
              <div class="animal-profile-icon-btn">
                <img src="./assets/chevrone.svg" alt="Dropdown">
              </div>
            </div>
            <div class="animal-profile-tooltip">Где обитает зверь</div>
          </div>

          <div class="animal-profile-field">
            <div class="animal-profile-label">Роль в стае</div>
            <div class="animal-profile-input-wrapper">
              <select class="animal-profile-select" id="role-select"></select>
              <div class="animal-profile-icon-btn">
                <img src="./assets/chevrone.svg" alt="Dropdown">
              </div>
            </div>
            <div class="animal-profile-tooltip">Роль в сообществе</div>
          </div>

          <div class="animal-profile-field">
            <div class="animal-profile-label">Жизненный цикл</div>
            <div class="animal-profile-input-wrapper">
              <select class="animal-profile-select" id="lifecycle-select"></select>
              <div class="animal-profile-icon-btn">
                <img src="./assets/chevrone.svg" alt="Dropdown">
              </div>
            </div>
            <div class="animal-profile-tooltip">Стадия жизни</div>
          </div>

          <button class="animal-profile-submit" id="submit-profile">Сохранить</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(this.overlay);
    this.modal = document.getElementById('animal-profile-modal');
  }

  attachEventListeners() {
    console.log('[AnimalProfile] attachEventListeners() called');
    
    // Close on overlay click
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.close();
      }
    });

    // Refresh kind button
    const refreshBtn = document.getElementById('refresh-kind');
    console.log('[AnimalProfile] refreshBtn:', refreshBtn);
    refreshBtn.addEventListener('click', () => {
      refreshBtn.classList.add('spinning');
      
      const randomName = this.data.getRandomName(this.selectedEmoji);
      if (randomName) {
        document.getElementById('kind-input').value = randomName;
        this.validateKind();
      }
      
      setTimeout(() => {
        refreshBtn.classList.remove('spinning');
      }, 600);
    });

    // Kind input validation
    const kindInput = document.getElementById('kind-input');
    console.log('[AnimalProfile] kindInput:', kindInput);
    kindInput.addEventListener('input', () => this.validateKind());

    // Submit button
    const submitBtn = document.getElementById('submit-profile');
    console.log('[AnimalProfile] submitBtn:', submitBtn);
    if (submitBtn) {
      submitBtn.addEventListener('click', () => {
        console.log('[AnimalProfile] Submit button clicked!');
        this.save();
      });
    } else {
      console.error('[AnimalProfile] Submit button not found!');
    }

    // Animal grid pagination will be attached in renderAnimalGrid
  }

  validateKind() {
    const input = document.getElementById('kind-input');
    const wrapper = document.getElementById('kind-wrapper');
    
    const value = input.value.trim();
    const isValid = value.length >= 2;
    
    if (isValid) {
      wrapper.classList.remove('error');
    } else {
      wrapper.classList.add('error');
    }
    
    return isValid;
  }

  renderAnimalGrid() {
    const grid = document.getElementById('animal-grid');
    const pagination = document.getElementById('pagination');
    const animals = this.data.getAllAnimals();
    
    const totalPages = Math.ceil(animals.length / this.itemsPerPage);
    const start = this.currentPage * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    const pageAnimals = animals.slice(start, end);
    
    // Render grid
    grid.innerHTML = pageAnimals.map(animal => 
      `<div class="animal-profile-grid-item ${animal.emoji === this.selectedEmoji ? 'active' : ''}" data-emoji="${animal.emoji}">
        ${animal.emoji}
      </div>`
    ).join('');
    
    // Attach click handlers
    grid.querySelectorAll('.animal-profile-grid-item').forEach(item => {
      item.addEventListener('click', () => {
        const emoji = item.dataset.emoji;
        this.selectAnimal(emoji);
      });
    });
    
    // Render pagination with wrappers
    pagination.innerHTML = Array.from({ length: totalPages }, (_, i) => 
      `<div class="animal-profile-page-dot-wrapper ${i === this.currentPage ? 'active' : ''}" data-page="${i}">
        <div class="animal-profile-page-dot"></div>
      </div>`
    ).join('');
    
    // Attach pagination handlers
    pagination.querySelectorAll('.animal-profile-page-dot-wrapper').forEach(wrapper => {
      wrapper.addEventListener('click', () => {
        this.currentPage = parseInt(wrapper.dataset.page);
        this.renderAnimalGrid();
      });
    });
  }

  selectAnimal(emoji) {
    // Save current profile
    this.saveCurrentProfile();
    
    // Switch to new emoji
    this.selectedEmoji = emoji;
    
    // Update large emoji and kind emoji
    document.getElementById('large-emoji').textContent = emoji;
    document.getElementById('kind-emoji').textContent = emoji;
    
    // Update grid selection
    this.renderAnimalGrid();
    
    // Load profile for new emoji or set defaults
    this.loadProfile(emoji);
  }

  saveCurrentProfile() {
    const profile = {
      emoji: this.selectedEmoji,
      kind: document.getElementById('kind-input').value,
      arial: document.getElementById('arial-select').value,
      role: document.getElementById('role-select').value,
      lifecycle: document.getElementById('lifecycle-select').value
    };
    
    this.profiles[this.selectedEmoji] = profile;
  }

  async loadProfile(emoji) {
    const kindInput = document.getElementById('kind-input');
    
    // Update placeholder with random name for this emoji
    const randomPlaceholder = this.data.getRandomName(emoji);
    if (randomPlaceholder) {
      kindInput.placeholder = randomPlaceholder;
    }
    
    // Populate dropdowns
    this.populateSelect('arial-select', this.data.getArials(emoji));
    this.populateSelect('role-select', this.data.getRoles(emoji));
    this.populateSelect('lifecycle-select', this.data.getLifecycles(emoji));
    
    // Check if we have saved profile in memory
    if (this.profiles[emoji]) {
      const profile = this.profiles[emoji];
      kindInput.value = profile.kind || '';
      document.getElementById('arial-select').value = profile.arial || 'not_specified';
      document.getElementById('role-select').value = profile.role || 'not_specified';
      document.getElementById('lifecycle-select').value = profile.lifecycle || 'not_specified';
    } else {
      // Try to load from server
      const serverProfile = await this.fetchProfile(emoji);
      
      if (serverProfile && serverProfile.kind) {
        // Load from server and save to memory
        kindInput.value = serverProfile.kind;
        document.getElementById('arial-select').value = serverProfile.arial || 'not_specified';
        document.getElementById('role-select').value = serverProfile.role || 'not_specified';
        document.getElementById('lifecycle-select').value = serverProfile.lifecycle || 'not_specified';
        
        this.profiles[emoji] = {
          emoji: emoji,
          kind: serverProfile.kind,
          arial: serverProfile.arial || 'not_specified',
          role: serverProfile.role || 'not_specified',
          lifecycle: serverProfile.lifecycle || 'not_specified'
        };
      } else {
        // Set defaults
        const randomName = this.data.getRandomName(emoji);
        kindInput.value = randomName || '';
        document.getElementById('arial-select').value = 'not_specified';
        document.getElementById('role-select').value = 'not_specified';
        document.getElementById('lifecycle-select').value = 'not_specified';
      }
    }
    
    // Update opacity for all selects after values are set
    this.updateSelectOpacity('arial-select');
    this.updateSelectOpacity('role-select');
    this.updateSelectOpacity('lifecycle-select');
    
    this.validateKind();
  }

  populateSelect(selectId, categories) {
    const select = document.getElementById(selectId);
    select.innerHTML = categories.map(cat => 
      `<option value="${cat.id}">${cat.name}</option>`
    ).join('');
    
    // Add change listener to update opacity
    select.addEventListener('change', () => this.updateSelectOpacity(selectId));
  }
  
  updateSelectOpacity(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    if (select.value === 'not_specified') {
      select.style.opacity = '0.6';
    } else {
      select.style.opacity = '1';
    }
  }

  async fetchProfile(emoji) {
    try {
      const res = await fetch(`./api/animal_profile.php?action=get&session_id=${this.sessionId}&emoji=${encodeURIComponent(emoji)}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.profile || null;
    } catch (e) {
      return null;
    }
  }

  async save() {
    console.log('[AnimalProfile] save() called');
    if (!this.validateKind()) {
      console.log('[AnimalProfile] Validation failed');
      return;
    }
    
    this.saveCurrentProfile();
    
    const profile = this.profiles[this.selectedEmoji];
    console.log('[AnimalProfile] Saving profile:', profile);
    
    try {
      console.log('[AnimalProfile] Sending save request...');
      const url = './api/animal_profile.php?action=save';
      console.log('[AnimalProfile] Request URL:', url);
      
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: this.sessionId,
          emoji: this.selectedEmoji,
          kind: profile.kind,
          arial: profile.arial,
          role: profile.role,
          lifecycle: profile.lifecycle
        })
      });
      
      const responseText = await res.text();
      
      if (res.ok) {
        let result;
        try {
          result = JSON.parse(responseText);
        } catch (e) {
          console.error('[AnimalProfile] Failed to parse JSON:', e);
          console.error('[AnimalProfile] Full response:', responseText);
          throw e;
        }
        
        // Use the profile data we just saved
        const newName = this.selectedEmoji + ' ' + profile.kind;
        
        // Update via callback
        if (this.onSave) {
          this.onSave(newName);
        }
        
        // Update current emoji to selected
        this.currentEmoji = this.selectedEmoji;
        
        this.close();
      }
    } catch (e) {
      console.error('[AnimalProfile] Exception during save:', e);
    }
  }

  async open() {
    // Set selected emoji to current emoji
    this.selectedEmoji = this.currentEmoji;
    
    // Update large emoji and kind emoji
    document.getElementById('large-emoji').textContent = this.selectedEmoji;
    document.getElementById('kind-emoji').textContent = this.selectedEmoji;
    
    // Find page with current emoji
    const animals = this.data.getAllAnimals();
    const emojiIndex = animals.findIndex(a => a.emoji === this.selectedEmoji);
    
    if (emojiIndex !== -1) {
      this.currentPage = Math.floor(emojiIndex / this.itemsPerPage);
    }
    
    // Load current profile
    await this.loadProfile(this.selectedEmoji);
    
    // Render grid
    this.renderAnimalGrid();
    
    // Show modal
    this.overlay.classList.add('active');
  }

  close() {
    this.overlay.classList.remove('active');
  }

  updateCurrentEmoji(newEmoji) {
    this.currentEmoji = newEmoji;
  }
}
