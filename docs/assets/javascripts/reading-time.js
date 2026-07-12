/**
 * Atlas Reading Time Component
 * Calculates and displays estimated reading time
 */

(function() {
  'use strict';

  // Configuration
  const READING_CONFIG = {
    wordsPerMinute: 200,        // Average adult reading speed
    wordsPerMinuteCode: 150,    // Code reads slower
    minTime: 1,                 // Minimum minutes
    roundTo: 1                  // Round to nearest minute
  };

  // State
  let readingTimeElements = [];

  // Calculate reading time for text
  function calculateReadingTime(text, options = {}) {
    const wpm = options.isCode ? READING_CONFIG.wordsPerMinuteCode : READING_CONFIG.wordsPerMinute;
    
    // Strip HTML tags and code blocks for word count
    const cleanText = text
      .replace(/<[^>]*>/g, ' ')           // Remove HTML tags
      .replace(/```[\s\S]*?```/g, ' ')    // Remove code blocks
      .replace(/`[^`]*`/g, ' ')           // Remove inline code
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links to text
      .replace(/[#*_~`]/g, ' ')           // Markdown syntax
      .replace(/\s+/g, ' ')               // Normalize whitespace
      .trim();

    const words = cleanText.split(/\s+/).filter(w => w.length > 0).length;
    const minutes = Math.max(READING_CONFIG.minTime, Math.round(words / wpm * READING_CONFIG.roundTo) / READING_CONFIG.roundTo);
    
    return {
      words,
      minutes: Math.ceil(minutes),
      rawMinutes: minutes
    };
  }

  // Format time display
  function formatReadingTime(minutes) {
    if (minutes <= 1) return '1 min read';
    if (minutes < 60) return `${minutes} min read`;
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (mins === 0) return `${hours} hr read`;
    return `${hours} hr ${mins} min read`;
  }

  // Extract text content from element
  function getTextContent(element) {
    // Clone to avoid modifying original
    const clone = element.cloneNode(true);
    
    // Remove non-content elements
    const toRemove = clone.querySelectorAll(
      'script, style, nav, header, footer, aside, ' +
      '.md-header, .md-footer, .md-sidebar, .md-search, ' +
      '.md-header__button, .md-tabs, .md-nav, ' +
      '.md-breadcrumb, .md-footer, .md-header, ' +
      '.md-typeset pre, .md-typeset code, ' +
      '.md-admonition, .md-annotation, .md-icon'
    );
    toRemove.forEach(el => el.remove());
    
    // Get text content
    return clone.textContent || clone.innerText || '';
  }

  // Create reading time element
  function createReadingTimeElement(minutes, words) {
    const span = document.createElement('span');
    span.className = 'md-article-reading-time atlas-reading-time';
    span.dataset.minutes = minutes;
    span.dataset.words = words;
    
    const icon = document.createElement('span');
    icon.className = 'md-icon';
    icon.textContent = '⏱';
    icon.style.marginRight = '4px';
    icon.style.fontSize = '0.9em';
    
    const text = document.createElement('span');
    text.textContent = formatReadingTime(minutes);
    
    const el = document.createElement('span');
    el.className = 'atlas-reading-time';
    el.style.cssText = `
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-family: var(--atlas-font-ui, system-ui, sans-serif);
      font-size: var(--atlas-text-caption, 0.75rem);
      font-weight: 500;
      color: var(--atlas-on-surface-variant, #666);
      padding: 2px 8px;
      background: var(--atlas-surface-variant, #f5f5f5);
      border-radius: 9999px;
      white-space: nowrap;
    `;
    
    el.appendChild(icon);
    el.appendChild(document.createTextNode(formatReadingTime(minutes)));
    el.title = `${words} words • ~${minutes} minute${minutes !== 1 ? 's' : ''} read`;
    
    return el;
  }

  // Format reading time
  function formatReadingTime(minutes) {
    if (minutes <= 1) return '1 min read';
    if (minutes < 60) return `${minutes} min read`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `${hours} hr read`;
    return `${hours}h ${mins}m read`;
  }

  // Process all content areas
  function processReadingTime() {
    // Find main content areas
    const contentAreas = document.querySelectorAll('.md-content__inner, .md-typeset, article.md-content__inner, main.md-content__inner');
    
    contentAreas.forEach(area => {
      // Skip if already processed
      if (area.dataset.readingTimeProcessed) return;
      area.dataset.readingTimeProcessed = 'true';

      const text = getTextContent(area);
      if (!text || text.trim().length < 50) return; // Skip short content

      const { minutes, words } = calculateReadingTime(text);
      const readingTimeEl = createReadingTimeElement(minutes, text.split(/\s+/).filter(w => w.length > 0).length);

      // Insert at top of content area
      const header = area.querySelector('h1, h2, .md-article-header, .md-content__header');
      if (header) {
        header.insertAdjacentElement('afterend', readingTimeEl);
      } else {
        area.insertBefore(readingTimeEl, area.firstChild);
      }
    });
  }

  // Initialize
  function initReadingTime() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initReadingTime);
      return;
    }
    processReadingTime();
  }

  // Expose for manual initialization
  window.AtlasReadingTime = {
    init: initReadingTime,
    calculate: calculateReadingTime,
    format: (minutes) => `${minutes} min read`
  };

  // Initialize on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(processReadingTime, 100); // Wait for content to render
    });
  } else {
    setTimeout(processReadingTime, 100);
  }

  // Re-process on navigation (for instant loading)
  document.addEventListener('DOMContentLoaded', () => {
    // Handle instant navigation
    let lastUrl = location.href;
    new MutationObserver(() => {
      const url = location.href;
      if (url !== lastUrl) {
        lastUrl = url;
        setTimeout(processReadingTime, 100);
      }
    }).observe(document, { subtree: true, childList: true });
  });
})();