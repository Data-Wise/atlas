/**
 * Atlas Scroll Progress Bar Component
 * Shows scroll progress at top of viewport
 */

(function() {
  'use strict';

  const SCROLL_PROGRESS_SELECTOR = '.md-scroll-progress';
  const BAR_SELECTOR = '.md-scroll-progress__bar';
  const THROTTLE_MS = 16; // ~60fps

  let progressBar = null;
  let bar = null;
  let ticking = false;
  let lastScrollY = 0;

  // Create progress bar element
  function createProgressBar() {
    const container = document.createElement('div');
    container.className = 'md-scroll-progress';
    container.setAttribute('data-md-component', 'scroll-progress');
    container.setAttribute('role', 'progressbar');
    container.setAttribute('aria-valuemin', '0');
    container.setAttribute('aria-valuemax', '100');
    container.setAttribute('aria-valuenow', '0');
    container.setAttribute('aria-label', 'Page scroll progress');
    
    container.innerHTML = '<div class="md-scroll-progress__bar"></div>';
    
    return container;
  }

  // Get scroll progress (0-1)
  function getScrollProgress() {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (docHeight <= 0) return 0;
    return Math.min(1, Math.max(0, scrollTop / docHeight));
  }

  // Update progress bar
  function updateProgress() {
    if (!bar) return;
    
    const progress = getScrollProgress();
    const percentage = Math.round(progress * 100);
    
    bar.style.transform = `scaleX(${progress})`;
    bar.setAttribute('aria-valuenow', percentage);
    bar.style.width = `${percentage}%`;
    
    lastScrollY = window.scrollY;
  }

  // Throttled scroll handler
  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(() => {
        updateProgress();
        ticking = false;
      });
      ticking = true;
    }
  }

  // Initialize progress bar
  function initScrollProgress() {
    // Check if already exists
    if (document.querySelector(SCROLL_PROGRESS_SELECTOR)) return;
    
    // Create and insert
    progressBar = createProgressBar();
    bar = progressBar.querySelector(BAR_SELECTOR);
    
    // Insert at top of body
    document.body.insertBefore(progressBar, document.body.firstChild);
    
    // Add scroll listener
    window.addEventListener('scroll', onScroll, { passive: true });
    
    // Initial update
    updateProgress();
    
    // Add styles
    addStyles();
  }

  // Add styles
  function addStyles() {
    if (document.getElementById('atlas-scroll-progress-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'atlas-scroll-progress-styles';
    style.textContent = `
      .md-scroll-progress {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: var(--atlas-surface-variant, #f0f0f0);
        z-index: 1000;
        pointer-events: none;
      }
      
      [data-md-color-scheme="slate"] .md-scroll-progress {
        background: var(--atlas-surface-variant, #2d2d2d);
      }
      
      .md-scroll-progress__bar {
        height: 100%;
        background: var(--atlas-primary, #5e35b1);
        transform-origin: left center;
        transform: scaleX(0);
        transition: transform 0.1s linear, width 0.1s linear;
        will-change: transform, width;
      }
      
      [data-md-color-scheme="slate"] .md-scroll-progress__bar {
        background: var(--atlas-primary-light, #ce93d8);
      }
      
      /* Reduced motion */
      @media (prefers-reduced-motion: reduce) {
        .md-scroll-progress__bar {
          transition: none !important;
        }
      }
      
      /* Print: hide progress bar */
      @media print {
        .md-scroll-progress {
          display: none !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initScrollProgress);
  } else {
    initScrollProgress();
  }

  // Expose for manual initialization
  window.AtlasScrollProgress = { init: initScrollProgress };
})();