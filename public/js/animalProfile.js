// public/js/animalProfile.js
import { AnimalData } from './animalData.js?v=1';

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
          <svg class="animal-profile-info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
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
              <svg class="animal-profile-icon-btn" id="refresh-kind" viewBox="0 0 24 24">
                <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
              </svg>
              <svg class="animal-profile-info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="16" x2="12" y2="12"/>
                <line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
            </div>
            <div class="animal-profile-tooltip" id="kind-tooltip">Имя вашего зверя</div>
          </div>

          <div class="animal-profile-field">
            <div class="animal-profile-label">Ареал обитания</div>
            <div class="animal-profile-input-wrapper">
              <span class="animal-profile-emoji-icon" id="arial-emoji">🐳</span>
              <select class="animal-profile-select" id="arial-select"></select>
              <svg class="animal-profile-icon-btn" viewBox="0 0 24 24">
                <path d="M7 10l5 5 5-5z"/>
              </svg>
              <svg class="animal-profile-info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="16" x2="12" y2="12"/>
                <line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
            </div>
            <div class="animal-profile-tooltip">Где обитает зверь</div>
          </div>

          <div class="animal-profile-field">
            <div class="animal-profile-label">Роль в стае</div>
            <div class="animal-profile-input-wrapper">
              <span class="animal-profile-emoji-icon" id="role-emoji">🐳</span>
              <select class="animal-profile-select" id="role-select"></select>
              <svg class="animal-profile-icon-btn" viewBox="0 0 24 24">
                <path d="M7 10l5 5 5-5z"/>
              </svg>
              <svg class="animal-profile-info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="16" x2="12" y2="12"/>
                <line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
            </div>
            <div class="animal-profile-tooltip">Роль в сообществе</div>
          </div>

          <div class="animal-profile-field">
            <div class="animal-profile-label">Жизненный цикл</div>
            <div class="animal-profile-input-wrapper">
              <span class="animal-profile-emoji-icon" id="lifecycle-emoji">🐳</span>
              <select class="animal-profile-select" id="lifecycle-select"></select>
              <svg class="animal-profile-icon-btn" viewBox="0 0 24 24">
                <path d="M7 10l5 5 5-5z"/>
              </svg>
              <svg class="animal-profile-info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="16" x2="12" y2="12"/>
                <line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
            </div>
            <div class="animal-profile-tooltip">Стадия жизни</div>
          </div>

          <button class="animal-profile-submit" id="submit-profile">Сохранить зверя</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(this.overlay);
    this.modal = document.getElementById('animal-profile-modal');
  }

  attachEventListeners() {
    // Close on overlay click
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.close();
      }
    });

    // Refresh kind button
    document.getElementById('refresh-kind').addEventListener('click', () => {
      const randomName = this.data.getRandomName(this.selectedEmoji);
      if (randomName) {
        document.getElementById('kind-input').value = randomName;
        this.validateKind();
      }
    });

    // Kind input validation
    const kindInput = document.getElementById('kind-input');
    kindInput.addEventListener('input', () => this.validateKind());

    // Submit button
    document.getElementById('submit-profile').addEventListener('click', () => this.save());

    // Animal grid pagination will be attached in renderAnimalGrid
  }

  validateKind() {
    const input = document.getElementById('kind-input');
    const wrapper = document.getElementById('kind-wrapper');
    const submitBtn = document.getElementById('submit-profile');
    
    const value = input.value.trim();
    const isValid = value.length >= 2;
    
    if (isValid) {
      wrapper.classList.remove('error');
      submitBtn.disabled = false;
    } else {
      wrapper.classList.add('error');
      submitBtn.disabled = true;
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
    
    // Render pagination
    pagination.innerHTML = Array.from({ length: totalPages }, (_, i) => 
      `<div class="animal-profile-page-dot ${i === this.currentPage ? 'active' : ''}" data-page="${i}"></div>`
    ).join('');
    
    // Attach pagination handlers
    pagination.querySelectorAll('.animal-profile-page-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        this.currentPage = parseInt(dot.dataset.page);
        this.renderAnimalGrid();
      });
    });
  }

  selectAnimal(emoji) {
    // Save current profile
    this.saveCurrentProfile();
    
    // Switch to new emoji
    this.selectedEmoji = emoji;
    
    // Update large emoji
    document.getElementById('large-emoji').textContent = emoji;
    
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
    // Update emoji icons
    document.getElementById('kind-emoji').textContent = emoji;
    document.getElementById('arial-emoji').textContent = emoji;
    document.getElementById('role-emoji').textContent = emoji;
    document.getElementById('lifecycle-emoji').textContent = emoji;
    
    // Populate dropdowns
    this.populateSelect('arial-select', this.data.getArials(emoji));
    this.populateSelect('role-select', this.data.getRoles(emoji));
    this.populateSelect('lifecycle-select', this.data.getLifecycles(emoji));
    
    // Check if we have saved profile
    if (this.profiles[emoji]) {
      const profile = this.profiles[emoji];
      document.getElementById('kind-input').value = profile.kind || '';
      document.getElementById('arial-select').value = profile.arial || 'not_specified';
      document.getElementById('role-select').value = profile.role || 'not_specified';
      document.getElementById('lifecycle-select').value = profile.lifecycle || 'not_specified';
    } else {
      // Try to load from server
      const serverProfile = await this.fetchProfile(emoji);
      
      if (serverProfile) {
        document.getElementById('kind-input').value = serverProfile.kind || '';
        document.getElementById('arial-select').value = serverProfile.arial || 'not_specified';
        document.getElementById('role-select').value = serverProfile.role || 'not_specified';
        document.getElementById('lifecycle-select').value = serverProfile.lifecycle || 'not_specified';
      } else {
        // Set defaults
        const randomName = this.data.getRandomName(emoji);
        document.getElementById('kind-input').value = randomName || '';
        document.getElementById('arial-select').value = 'not_specified';
        document.getElementById('role-select').value = 'not_specified';
        document.getElementById('lifecycle-select').value = 'not_specified';
      }
    }
    
    this.validateKind();
  }

  populateSelect(selectId, categories) {
    const select = document.getElementById(selectId);
    select.innerHTML = categories.map(cat => 
      `<option value="${cat.id}">${cat.name}</option>`
    ).join('');
  }

  async fetchProfile(emoji) {
    try {
      const res = await fetch(`/api/animal_profile.php?action=get&session_id=${this.sessionId}&emoji=${encodeURIComponent(emoji)}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.profile || null;
    } catch (e) {
      return null;
    }
  }

  async save() {
    if (!this.validateKind()) return;
    
    this.saveCurrentProfile();
    
    const profile = this.profiles[this.selectedEmoji];
    
    try {
      const res = await fetch('/api/animal_profile.php?action=save', {
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
      
      if (res.ok) {
        if (this.onSave) {
          this.onSave(this.selectedEmoji, profile.kind);
        }
        this.close();
      }
    } catch (e) {
      console.error('Failed to save profile:', e);
    }
  }

  async open() {
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
}
