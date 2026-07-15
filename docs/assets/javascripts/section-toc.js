/**
 * section-toc.js — Inline mobile TOC
 *
 * Material's secondary sidebar (TOC) is hidden on viewports < 76.25em.
 * This script injects a collapsible <details> TOC into the page content
 * for those narrow viewports, restoring the navigation lost on mobile.
 */

(function () {
  'use strict';

  var BREAKPOINT_PX = 76.25 * parseFloat(getComputedStyle(document.documentElement).fontSize);

  function buildToc() {
    if (window.innerWidth >= BREAKPOINT_PX) return; // desktop handles TOC natively

    var content = document.querySelector('.md-content__inner');
    if (!content) return;
    if (content.querySelector('.atlas-mobile-toc')) return; // already injected

    var headings = Array.prototype.slice.call(
      content.querySelectorAll('h2, h3')
    );
    if (headings.length < 2) return; // no benefit for single-section pages

    var details = document.createElement('details');
    details.className = 'atlas-mobile-toc';

    var summary = document.createElement('summary');
    summary.textContent = 'On this page';
    details.appendChild(summary);

    var nav = document.createElement('nav');
    headings.forEach(function (h) {
      var a = document.createElement('a');
      a.href = '#' + h.id;
      a.textContent = h.textContent.replace(/¶$/, '').trim();
      a.className = 'atlas-mobile-toc__link atlas-mobile-toc__link--' + h.tagName.toLowerCase();
      nav.appendChild(a);
    });
    details.appendChild(nav);

    // Insert after the first <h1>, or at the top of content if no h1
    var h1 = content.querySelector('h1');
    if (h1 && h1.nextSibling) {
      content.insertBefore(details, h1.nextSibling);
    } else {
      content.insertBefore(details, content.firstChild);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildToc);
  } else {
    buildToc();
  }

  // Re-run on Material's navigation events (instant loading)
  document.addEventListener('DOMContentSwitch', buildToc);
})();
