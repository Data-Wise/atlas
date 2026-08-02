/**
 * Atlas docs — section-aware navigation.
 *
 * Three things, all driven by the current URL path:
 *
 * 1. Stamps `document.body.dataset.atlasSection` with one of
 *    learn/do/build/code (or unset on the homepage), so extra.css can theme
 *    the sidebar and pill nav per-section without duplicating the
 *    mkdocs.yml nav structure in CSS.
 * 2. Highlights the active pill in the "Home + 4 pills + search" bar
 *    (overrides/partials/tabs.html supplies the pill markup) and wires the
 *    search box to filter the left sidebar.
 * 3. Collapses the left sidebar's top-level sections into a single-open
 *    accordion, with an item count on each collapsed header.
 * 4. Stamps each top-level sidebar group (and standalone top-level page)
 *    with its own `data-atlas-section`, so the "color spine" treatment in
 *    extra.css can tint every group by its own hue at once — not just the
 *    single group matching the current page (that's `applySectionAttribute`
 *    on <body>, which this complements).
 */

(function () {
  'use strict';

  var SECTION_BY_PREFIX = [
    // Order matters — first match wins; longer/more-specific prefixes first.
    ['getting-started/', 'do'],
    ['TUTORIAL', 'do'],
    ['DEMOS', 'do'],
    ['demos/', 'do'],
    ['user-guide/', 'learn'],
    ['STATUS-SCHEMA', 'learn'],
    ['CONFIGURATION', 'learn'],
    ['VISUAL-GUIDE', 'learn'],
    ['CLI-REFERENCE', 'code'],
    ['REFCARD', 'code'],
    ['API-GUIDE', 'code'],
    ['API-RECIPES', 'code'],
    ['MCP-SERVER', 'code'],
    ['ARCHITECTURE', 'build'],
    ['DIAGRAMS', 'build'],
    ['INTEGRATIONS', 'build'],
    ['WHAT-S-NEW', 'do'],
    ['ROADMAP', 'do'],
    ['CONTRIBUTING', 'do']
  ];

  function sectionForPath(path) {
    for (var i = 0; i < SECTION_BY_PREFIX.length; i++) {
      if (path.indexOf(SECTION_BY_PREFIX[i][0]) !== -1) {
        return SECTION_BY_PREFIX[i][1];
      }
    }
    return null;
  }

  function currentSection() {
    // location.pathname is the *rendered* site path (e.g. /atlas/user-guide/...),
    // not the source .md path — but mkdocs preserves the doc's relative path
    // structure 1:1 in the built site, so the same prefixes apply.
    return sectionForPath(window.location.pathname);
  }

  function applySectionAttribute() {
    var section = currentSection();
    if (section) {
      document.body.setAttribute('data-atlas-section', section);
    } else {
      document.body.removeAttribute('data-atlas-section');
    }
  }

  // ── Pill nav (Home + 4 color pills + search) ────────────────────────
  function wirePillNav() {
    var pills = document.querySelectorAll('.atlas-pill[data-section]');
    if (!pills.length) return;

    var active = currentSection();
    for (var i = 0; i < pills.length; i++) {
      var isActive = pills[i].getAttribute('data-section') === active;
      pills[i].classList.toggle('atlas-pill--active', isActive);
    }

    var searchBox = document.querySelector('.atlas-pill-search');
    var sidebar = document.querySelector('.md-nav--primary');
    if (!searchBox || !sidebar) return;

    // Avoid double-binding across instant-navigation re-runs.
    if (searchBox.dataset.atlasWired === 'true') return;
    searchBox.dataset.atlasWired = 'true';

    searchBox.addEventListener('input', function () {
      var query = searchBox.value.trim().toLowerCase();
      var items = sidebar.querySelectorAll('.md-nav__item');

      if (!query) {
        for (var i = 0; i < items.length; i++) {
          items[i].style.display = '';
        }
        return;
      }

      for (var j = 0; j < items.length; j++) {
        var item = items[j];
        var link = item.querySelector(':scope > .md-nav__link');
        var text = link ? link.textContent.trim().toLowerCase() : '';
        var matches = text.indexOf(query) !== -1;
        var childMatches = false;

        if (!matches) {
          var descendantLinks = item.querySelectorAll('.md-nav__link');
          for (var k = 0; k < descendantLinks.length; k++) {
            if (descendantLinks[k].textContent.trim().toLowerCase().indexOf(query) !== -1) {
              childMatches = true;
              break;
            }
          }
        }

        item.style.display = matches || childMatches ? '' : 'none';

        // Auto-expand a matching group so the hit is actually visible.
        if (childMatches && item.classList.contains('md-nav__item--nested')) {
          var toggle = item.querySelector(':scope > input.md-toggle');
          if (toggle) toggle.checked = true;
        }
      }
    });
  }

  // ── Sidebar color spine — tint every group by its own section ───────
  function stampGroupSections() {
    // Top-level items directly under the primary nav's root list: both
    // nested groups (e.g. "ADHD Guide") and standalone pages (e.g.
    // "Cookbook") — the spine treatment applies to both alike.
    var groups = document.querySelectorAll(
      '.md-nav--primary > .md-nav__list > .md-nav__item'
    );

    for (var i = 0; i < groups.length; i++) {
      var group = groups[i];
      var firstLink = group.querySelector('.md-nav__link[href]');
      if (!firstLink) continue;

      var href = firstLink.getAttribute('href') || '';
      var path;
      try {
        path = new URL(href, window.location.href).pathname;
      } catch (e) {
        continue;
      }

      var section = sectionForPath(path);
      if (section) {
        group.setAttribute('data-atlas-section', section);
      } else {
        group.removeAttribute('data-atlas-section');
      }
    }
  }

  // ── Sidebar single-open accordion ───────────────────────────────────
  function wireAccordion() {
    var groups = document.querySelectorAll(
      '.md-nav--primary .md-nav__item--nested > input.md-toggle'
    );
    if (groups.length < 2) return; // nothing to collapse-in-favor-of

    for (var i = 0; i < groups.length; i++) {
      (function (toggle) {
        var item = toggle.closest('.md-nav__item--nested');
        var link = item.querySelector(':scope > label.md-nav__link, :scope > .md-nav__link');
        if (!link) return;

        // Item count badge (once per element).
        if (!link.querySelector('.atlas-nav-count')) {
          var count = item.querySelectorAll('.md-nav__item:not(.md-nav__item--nested)').length;
          if (count > 0) {
            var badge = document.createElement('span');
            badge.className = 'atlas-nav-count';
            badge.textContent = String(count);
            link.appendChild(badge);
          }
        }

        if (toggle.dataset.atlasAccordionWired === 'true') return;
        toggle.dataset.atlasAccordionWired = 'true';

        toggle.addEventListener('change', function () {
          if (!toggle.checked) return;
          for (var j = 0; j < groups.length; j++) {
            if (groups[j] !== toggle) groups[j].checked = false;
          }
        });
      })(groups[i]);
    }
  }

  function init() {
    applySectionAttribute();
    wirePillNav();
    stampGroupSections();
    wireAccordion();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Re-run on Material's navigation events (instant loading)
  document.addEventListener('DOMContentSwitch', init);
})();
