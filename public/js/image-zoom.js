// public/js/image-zoom.js
export class ImageZoom {
  constructor() {
    this.overlay = null;
    this.isOpen = false;
    this.init();
  }

  init() {
    this.createOverlay();
    this.attachListeners();
  }

  createOverlay() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'image-zoom-overlay';
    this.overlay.innerHTML = `
      <div class="image-zoom-container">
        <img class="image-zoom-content" alt="Zoomed image">
      </div>
    `;
    document.body.appendChild(this.overlay);
  }

  attachListeners() {
    // Close on overlay click
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.close();
      }
    });

    // Close on image click
    const zoomedImage = this.overlay.querySelector('.image-zoom-content');
    zoomedImage.addEventListener('click', (e) => {
      e.stopPropagation();
      this.close();
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });

    // Prevent body scroll when overlay is open
    this.overlay.addEventListener('wheel', (e) => {
      e.preventDefault();
    });
  }

  open(imageSrc, originalImage) {
    if (this.isOpen) return;

    // Check if zoomed image would be larger than 90vh
    const img = new Image();
    img.onload = () => {
      const maxHeight = window.innerHeight * 0.9;
      const maxWidth = window.innerWidth * 0.9;
      
      // Calculate if image would be larger when displayed at original size
      const aspectRatio = img.naturalWidth / img.naturalHeight;
      let displayWidth = img.naturalWidth;
      let displayHeight = img.naturalHeight;
      
      // Constrain to max dimensions
      if (displayHeight > maxHeight) {
        displayHeight = maxHeight;
        displayWidth = displayHeight * aspectRatio;
      }
      if (displayWidth > maxWidth) {
        displayWidth = maxWidth;
        displayHeight = displayWidth / aspectRatio;
      }
      
      // Only zoom if the final display size is significantly larger than current size
      const currentRect = originalImage.getBoundingClientRect();
      const zoomFactor = Math.min(displayWidth / currentRect.width, displayHeight / currentRect.height);
      
      if (zoomFactor > 1.5) { // Only zoom if at least 50% larger
        this.showZoom(imageSrc);
      }
    };
    img.src = imageSrc;
  }

  showZoom(imageSrc) {
    this.isOpen = true;
    const content = this.overlay.querySelector('.image-zoom-content');
    content.src = imageSrc;
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
    
    this.overlay.classList.add('active');
  }

  close() {
    if (!this.isOpen) return;
    
    this.isOpen = false;
    this.overlay.classList.remove('active');
    
    // Restore body scroll
    document.body.style.overflow = '';
  }

  // Method to make images zoomable
  makeZoomable(img) {
    img.classList.add('zoomable-image');
    img.addEventListener('click', (e) => {
      e.preventDefault();
      this.open(img.src, img);
    });
  }
}

// Auto-initialize and make existing images zoomable
let imageZoom = null;

export function initImageZoom() {
  if (!imageZoom) {
    imageZoom = new ImageZoom();
  }
  
  // Make all existing images zoomable
  document.querySelectorAll('#chat-log img').forEach(img => {
    if (!img.classList.contains('zoomable-image')) {
      imageZoom.makeZoomable(img);
    }
  });
}

export function makeImageZoomable(img) {
  if (!imageZoom) {
    imageZoom = new ImageZoom();
  }
  imageZoom.makeZoomable(img);
}
