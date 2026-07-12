/**
 * Atlas Section TOC Component
 * Collapsible table of contents that highlights current section
 */

(function() {
  'use strict';

  // Configuration
  const TOC_CONFIG = {
    headingSelectors: ['h2', 'h3'],
    maxDepth: 3,
    autoCollapse: true,
    scrollOffset: 100,
    smoothScroll: true,
    highlightCurrent: true
  };

  let tocInstances = [];
  let observer = null;

  // Generate TOC from headings
  function generateTOC(container, headings) {
    const toc = document.createElement('details');
    toc.className = 'atlas-section-toc';
    toc.open = true; // Open by default

    const summary = document.createElement('summary');
    summary.className = 'atlas-section-toc__summary';
    summary.innerHTML = `
      <span class="atlas-section-toc__icon" aria-hidden="true">📑</span>
      <span class="atlas-section-toc__title">On this page</span>
      <span class="atlas-section-toc__toggle" aria-hidden="true">▸</span>
    `;
    toc.appendChild(summary);

    const ul = document.createElement('ul');
    ul.className = 'atlas-section-toc__list';

    let currentLevel = 2;
    let currentList = ul;
    const listStack = [ul];

    headings.forEach((heading, index) => {
      const level = parseInt(heading.tagName.charAt(1), 10);
      const text = heading.textContent.trim();
      const id = heading.id || `heading-${index}`;

      // Ensure heading has ID
      if (!heading.id) {
        heading.id = id;
      }

      // Adjust nesting
      while (level > currentLevel) {
        const newList = document.createElement('ul');
        currentList.lastElementChild.appendChild(newList);
        listStack.push(newList);
        currentList = newList;
        currentLevel = level;
      }

      while (level < currentLevel) {
        listStack.pop();
        currentList = listStack[listStack.length - 1];
        currentLevel = level;
      }

      const li = document.createElement('li');
      li.className = 'atlas-section-toc__item';
      li.style.marginLeft = `${(level - 2) * 1.5}rem`;

      const link = document.createElement('a');
      link.href = `#${id}`;
      link.className = 'atlas-section-toc__link';
      link.textContent = text;
      link.setAttribute('data-heading-id', id);

      // Smooth scroll
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.getElementById(id);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          history.pushState(null, '', `#${id}`);
        }
      });

      li.appendChild(link);
      currentList.appendChild(li);
    });

    toc.appendChild(document.createElement('div')).appendChild(ul); // wrapper for details
    return toc;
  }

  // Build TOC from headings
  function buildTOC(container) {
    const content = container.querySelector('.md-content__inner, .md-typeset, article, main') || container;
    const headings = Array.from(content.querySelectorAll('h2, h3')).filter(h => h.textContent.trim());

    if (headings.length < 2) return null;

    const toc = generateTOC(content, Array.from(content.querySelectorAll('h2, h3')).filter(h => h.textContent.trim()));
    
    // Create container
    const tocContainer = document.createElement('div');
    tocContainer.className = 'atlas-section-toc-container';
    tocContainer.appendChild(toc);

    // Insert before content
    const contentArea = document.querySelector('.md-content__inner, .md-typeset, article, main') || document.body;
    const firstHeading = document.querySelector('h1, h2');
    if (firstHeading) {
      firstHeading.parentNode.insertBefore(tocContainer, firstHeading);
    } else {
      contentArea.insertBefore(tocContainer, contentArea.firstChild);
    }

    // Set up scroll spy
    setupScrollSpy();

    return tocContainer;
  }

  // Set up scroll spy to highlight current section
  function setupScrollSpy() {
    const links = document.querySelectorAll('.atlas-section-toc__link');
    if (!links.length) return;

    const headings = Array.from(document.querySelectorAll('h2[id], h3[id]'))
      .filter(h => h.id);

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const id = entry.target.id;
        const link = document.querySelector(`.atlas-section-toc__link[href="#${id}"]`);
        if (link) {
          if (entry.isIntersecting) {
            link.classList.add('atlas-section-toc__link--active');
          } else {
            link.classList.remove('atlas-section-toc__link--active');
          }
        }
      });
    }, {
      rootMargin: '-80px 0px -66% 0px',
      threshold: [0, 0.25, 0.5, 0.75, 1]
    });

    headings.forEach(h => observer.observe(h));
  }

  // Generate TOC from headings
  function generateTOC(content, headings) {
    const nav = document.createElement('nav');
    nav.className = 'atlas-section-toc';
    nav.setAttribute('aria-label', 'Table of contents');

    const title = document.createElement('h2');
    title.className = 'atlas-section-toc__title';
    title.textContent = 'On this page';
    nav.appendChild(title);

    const ul = document.createElement('ul');
    ul.className = 'atlas-section-toc__list';

    let currentLevel = 2;
    let currentList = ul;
    const listStack = [ul];

    // Filter valid headings
    const validHeadings = headings
      .filter(h => h.textContent.trim())
      .map(h => ({
        level: parseInt(h.tagName.charAt(1), 10),
        text: h.textContent.trim(),
        id: h.id || `heading-${Math.random().toString(36).substr(2, 9)}`
      }));

    // Ensure headings have IDs
    validHeadings.forEach((h, i) => {
      const heading = document.getElementById(h.id) || headings.find(h2 => h2.textContent.trim() === h.text);
      if (heading && !heading.id) {
        heading.id = h.id;
      }
    });

    validHeadings.forEach(h => {
      // Adjust nesting
      while (h.level > currentLevel) {
        const newList = document.createElement('ul');
        currentList.lastElementChild?.appendChild(newList);
        listStack.push(newList);
        currentList = newList;
        currentLevel = h.level;
      }

      while (h.level < currentLevel) {
        listStack.pop();
        currentList = listStack[listStack.length - 1];
        currentLevel = Math.max(2, h.level - 1);
      }

      const li = document.createElement('li');
      li.className = 'atlas-section-toc__item';
      li.style.marginLeft = `${(h.level - 2) * 1.5}rem`;

      const link = document.createElement('a');
      link.href = `#${h.id}`;
      link.className = 'atlas-section-toc__link';
      link.textContent = h.text;
      link.setAttribute('data-heading-id', h.id);

      // Smooth scroll
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.getElementById(h.id);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          history.pushState(null, '', `#${h.id}`);
        }
      });

      li.appendChild(link);
      currentList.appendChild(li);
    });

    nav.appendChild(ul);
    return nav;
  }

  // Initialize TOC
  function initTOC() {
    if (document.querySelector('.atlas-section-toc')) return;

    const content = document.querySelector('.md-content__inner, .md-typeset, article, main');
    if (!content) return;

    const headings = Array.from(content.querySelectorAll('h2, h3')).filter(h => h.textContent.trim());
    if (headings.length < 2) return;

    const toc = buildTOC(content);
    if (toc) {
      tocInstances.push(toc);
    }

    // Initialize scroll spy
    if (window.IntersectionObserver) {
      setupScrollSpy();
    }
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTOC);
  } else {
    initTOC();
  }

  // Re-initialize on navigation
  document.addEventListener('DOMContentLoaded', () => {
    let lastUrl = location.href;
    new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        setTimeout(initTOC, 100);
      }
    }).observe(document, { subtree: true, childList: true });
  });

  // Expose for manual initialization
  window.AtlasSectionTOC = { init: initTOC };
})();