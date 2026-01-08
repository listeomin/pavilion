// public/js/image-zoom.js
export class ImageZoom {
  constructor() {
    this.overlay = null;
    this.isOpen = false;
    this.isAnimating = false;
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
    // Close on any click inside overlay (using event delegation)
    this.overlay.addEventListener('click', (e) => {
      // Always close on any click in the overlay
      this.close();
    }, true); // Use capture phase

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  }

  open(imageSrc, originalImage) {
    if (this.isOpen || this.isAnimating) return;

    // Store reference to original image
    this.originalImage = originalImage;

    // Remove hover transform from original image before measuring position
    if (originalImage) {
      originalImage.style.transform = 'none';
    }

    // Always show zoom, don't check size
    this.showZoom(imageSrc);
  }

  showZoom(imageSrc) {
    this.isOpen = true;
    this.isAnimating = true;
    const content = this.overlay.querySelector('.image-zoom-content');

    // Calculate scrollbar width before hiding it
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    // Store scrollbar width for later restoration
    this.scrollbarWidth = scrollbarWidth;

    // Apply padding FIRST to prevent content jump
    if (scrollbarWidth > 0) {
      // Add padding to body to prevent content jump
      document.body.style.paddingRight = `${scrollbarWidth}px`;

      // Compensate fixed elements that span full width
      const fixedElements = [
        '.main-nav',           // Main navigation
        '.page-header',        // Page header on nest
        '.nest-sidebar',       // Sidebar on nest page
        '#animal-profile-btn', // Animal profile button
        '#nightshift-toggle',  // Night shift toggle button
        '#dev-nest-btn'        // Developer nest button
      ];

      fixedElements.forEach(selector => {
        const el = document.querySelector(selector);
        if (el) {
          el.style.marginRight = `${scrollbarWidth}px`;
        }
      });
    }

    // THEN hide overflow - this prevents visual jump
    document.body.style.overflow = 'hidden';

    // Set initial image state BEFORE showing overlay
    content.style.opacity = '0';
    content.style.transform = 'none';
    content.style.transition = 'none';

    // Animation function to avoid duplication
    let animationTriggered = false;
    const animate = () => {
      // Prevent double animation
      if (animationTriggered) return;
      animationTriggered = true;

      // Clear onload handler to prevent it from firing again
      content.onload = null;

      // Show overlay AFTER image is loaded to prevent flicker
      this.overlay.classList.add('active');

      if (this.originalImage) {
        const originalRect = this.originalImage.getBoundingClientRect();
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
      } else {
        // No original image, just fade in
        content.style.transition = 'opacity 0.3s ease';
        content.style.opacity = '1';
      }

      // Reset animation flag after animation completes
      setTimeout(() => {
        this.isAnimating = false;
      }, 300);
    };

    // Set up onload handler BEFORE setting src
    content.onload = animate;

    // Check if image is the same (already loaded)
    if (content.src === imageSrc && content.complete && content.naturalHeight !== 0) {
      // Same image already loaded, animate immediately and clear onload
      content.onload = null;
      requestAnimationFrame(animate);
    } else {
      // Set new image src (will trigger onload if needed)
      content.src = imageSrc;
    }
  }

  close() {
    if (!this.isOpen || this.isAnimating) return;

    this.isOpen = false;
    this.isAnimating = true;
    
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

      // Restore body scroll and remove padding compensation
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';

      // Remove padding/margin from all fixed elements
      if (this.scrollbarWidth > 0) {
        const fixedElements = [
          '.main-nav',
          '.page-header',
          '.nest-sidebar',
          '#animal-profile-btn',
          '#nightshift-toggle',
          '#dev-nest-btn'
        ];

        fixedElements.forEach(selector => {
          const el = document.querySelector(selector);
          if (el) {
            el.style.paddingRight = '';
            el.style.marginRight = '';
          }
        });
      }

      // Restore original image's transform (for hover effects)
      if (this.originalImage) {
        this.originalImage.style.transform = '';
      }

      this.originalImage = null;
      this.scrollbarWidth = 0;
      this.isAnimating = false;
    }, 300);
  }

  // Method to make images zoomable
  makeZoomable(img) {
    // Don't make the overlay's image zoomable - that would create infinite loop
    if (img.classList.contains('image-zoom-content')) {
      return;
    }

    // Don't re-add if already zoomable (using data attribute as definitive flag)
    if (img.dataset.zoomEnabled === 'true') {
      return;
    }

    // Exclude button images, icons, and UI elements
    const parentButton = img.closest('button, a.button, .btn, .icon-button, #animal-profile-btn, #nightshift-toggle, #dev-nest-btn');
    const hasExcludeClass = img.classList.contains('icon') ||
                            img.classList.contains('avatar') ||
                            img.classList.contains('logo') ||
                            img.classList.contains('emoji');
    const isSVG = img.src && img.src.endsWith('.svg');

    if (parentButton || hasExcludeClass || isSVG) {
      return;
    }

    // Mark as processed before adding event listeners
    img.dataset.zoomEnabled = 'true';
    img.classList.add('zoomable-image');
    img.style.cursor = 'zoom-in'; // Force cursor style

    // Create handler function with reference to avoid duplicates
    const clickHandler = (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      this.open(img.src, img);
    };

    const mousedownHandler = (e) => {
      if (e.button === 0) { // Left click only
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // Use capture phase to catch event before it bubbles
    img.addEventListener('click', clickHandler, true);
    img.addEventListener('mousedown', mousedownHandler, true);
  }
}

// Auto-initialize and make existing images zoomable
let imageZoom = null;

export function initImageZoom() {
  if (!imageZoom) {
    imageZoom = new ImageZoom();
  }

  // Make all existing images zoomable (in both chat-log and nest-editor)
  const selectors = [
    '#chat-log img',
    '#nest-editor img',
    '#nest-static-content img',
    '.tiptap img',
    '.ProseMirror img'
  ];
  selectors.forEach(selector => {
    document.querySelectorAll(selector).forEach(img => {
      if (!img.classList.contains('zoomable-image')) {
        imageZoom.makeZoomable(img);
      }
    });
  });
}

export function makeImageZoomable(img) {
  if (!imageZoom) {
    imageZoom = new ImageZoom();
  }
  imageZoom.makeZoomable(img);
}

// Auto-watch for new images using MutationObserver
export function watchForImages() {
  if (!imageZoom) {
    imageZoom = new ImageZoom();
  }

  // Watch for images added to the page
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) { // Element node
          // Check if the node itself is an image
          if (node.tagName === 'IMG' && !node.classList.contains('zoomable-image')) {
            imageZoom.makeZoomable(node);
          }
          // Check for images inside the added node
          if (node.querySelectorAll) {
            node.querySelectorAll('img').forEach(img => {
              if (!img.classList.contains('zoomable-image')) {
                imageZoom.makeZoomable(img);
              }
            });
          }
        }
      });
    });
  });

  // Start observing the document
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Also make existing images zoomable
  document.querySelectorAll('img').forEach(img => {
    if (!img.classList.contains('zoomable-image')) {
      imageZoom.makeZoomable(img);
    }
  });
}
