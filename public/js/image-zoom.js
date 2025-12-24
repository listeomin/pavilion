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

    // Store reference to original image
    this.originalImage = originalImage;

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
    
    // If we have original image, animate from its position
    if (this.originalImage) {
      const originalRect = this.originalImage.getBoundingClientRect();
      
      // Wait for image to load and calculate final position
      content.onload = () => {
        const contentRect = content.getBoundingClientRect();
        
        // Calculate initial transform (from original position to center)
        const scaleX = originalRect.width / contentRect.width;
        const scaleY = originalRect.height / contentRect.height;
        const scale = Math.min(scaleX, scaleY);
        
        const translateX = originalRect.left + originalRect.width/2 - (contentRect.left + contentRect.width/2);
        const translateY = originalRect.top + originalRect.height/2 - (contentRect.top + contentRect.height/2);
        
        // Set initial state (at original position)
        content.style.transition = 'none';
        content.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
        content.style.opacity = '0';
        
        // Force reflow
        content.offsetHeight;
        
        // Animate to final state
        content.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
        content.style.transform = 'translate(0, 0) scale(1)';
        content.style.opacity = '1';
      };
    }
  }

  close() {
    if (!this.isOpen) return;
    
    this.isOpen = false;
    
    // Get current image element
    const zoomedImage = this.overlay.querySelector('.image-zoom-content');
    
    // If we have the original image reference, animate back to it
    if (this.originalImage) {
      const originalRect = this.originalImage.getBoundingClientRect();
      const zoomedRect = zoomedImage.getBoundingClientRect();
      
      // Calculate transform to go from current position back to original
      const scaleX = originalRect.width / zoomedRect.width;
      const scaleY = originalRect.height / zoomedRect.height;
      const scale = Math.min(scaleX, scaleY);
      
      const translateX = originalRect.left + originalRect.width/2 - (zoomedRect.left + zoomedRect.width/2);
      const translateY = originalRect.top + originalRect.height/2 - (zoomedRect.top + zoomedRect.height/2);
      
      // Apply transform to animate back to original position
      zoomedImage.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
      zoomedImage.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
      zoomedImage.style.opacity = '0';
      
      // Fade out overlay
      this.overlay.style.transition = 'opacity 0.3s ease';
      this.overlay.style.opacity = '0';
    } else {
      // Fallback to original behavior if no original image reference
      this.overlay.classList.add('closing');
    }
    
    // Wait for animation to complete
    setTimeout(() => {
      this.overlay.classList.remove('active', 'closing');
      this.overlay.style.opacity = '';
      
      // Reset image styles
      zoomedImage.style.transition = '';
      zoomedImage.style.transform = '';
      zoomedImage.style.opacity = '';
      
      // Restore body scroll
      document.body.style.overflow = '';
      
      this.originalImage = null;
    }, 300);
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
