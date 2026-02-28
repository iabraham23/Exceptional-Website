(function () {
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function isNearViewport(el) {
    var rect = el.getBoundingClientRect();
    var viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
    return rect.bottom > -20 && rect.top < viewportHeight * 0.95;
  }

  function applyRevealVariant(selector, variant) {
    document.querySelectorAll(selector).forEach(function (el) {
      el.setAttribute('data-reveal', variant);
    });
  }

  function initBaseReveal() {
    var revealSelectors = [
      '.hero-content > *',
      '.hero-image',
      '.stats-container .stat-item',
      '.section-header > *',
      '.services-intro',
      '.services-scroll-rail',
      '.tabs-wrapper',
      '.story-grid > *',
      '.faq-item',
      '.education-media-grid .education-image-slot',
      '.education-context-inline .education-reality-card',
      '.education-reading-hint',
      '.contact-grid > :first-child',
      '.cta-content > *',
      '.footer-top > *',
      '.athlete-stat-bar',
      '.athlete-rhythm-split > *',
      '.entertainer-hero-tagline',
      '.entertainer-revenue-flow-card'
    ];

    var staggerGroups = [
      ['.services-grid', '.service-card'],
      ['.career-timeline', '.career-card'],
      ['.values-grid', '.value-card'],
      ['.team-grid', '.team-card'],
      ['.philosophy-pillars', '.pillar-card'],
      ['.services-detail-grid', '.service-detail'],
      ['.services-scroll-panels', '.services-scroll-panel'],
      ['.services-scope-grid', '.services-scope-card'],
      ['.framework-grid', '.framework-item'],
      ['.process-steps', '.process-step'],
      ['.serve-grid', '.serve-card'],
      ['.athlete-feature-blocks', '.athlete-feature-block'],
      ['.athlete-service-rows', '.athlete-service-row'],
      ['.entertainer-artisan-coverage-grid', '.entertainer-artisan-coverage-card'],
      ['.entertainer-masonry', '.entertainer-masonry-card'],
      ['.entertainer-workstream-panels', '.entertainer-workstream-panel'],
      ['.entertainer-lane-cards', '.entertainer-lane-card'],
      ['.entertainer-immersive-panels', '.entertainer-immersive-panel']
    ];

    revealSelectors.forEach(function (selector) {
      document.querySelectorAll(selector).forEach(function (el) {
        el.setAttribute('data-animate', '');
      });
    });

    staggerGroups.forEach(function (group) {
      var parentSelector = group[0];
      var childSelector = group[1];

      document.querySelectorAll(parentSelector).forEach(function (parent) {
        parent.setAttribute('data-stagger', '');
        parent.querySelectorAll(childSelector).forEach(function (child, index) {
          child.setAttribute('data-animate', '');
          child.style.setProperty('--stagger-index', String(index));
        });
      });
    });

    applyRevealVariant('.hero-image', 'right');
    applyRevealVariant('.story-grid > :first-child', 'left');
    applyRevealVariant('.story-grid > :last-child', 'right');
    applyRevealVariant('.services-detail-grid .service-detail:nth-child(odd)', 'left');
    applyRevealVariant('.services-detail-grid .service-detail:nth-child(even)', 'right');
    applyRevealVariant('.services-scroll-panels .services-scroll-panel:nth-child(odd)', 'left');
    applyRevealVariant('.services-scroll-panels .services-scroll-panel:nth-child(even)', 'right');
    applyRevealVariant('.cta-content > *', 'soft');
    applyRevealVariant('.stats-container .stat-item', 'soft');

    var animated = document.querySelectorAll('[data-animate]');

    if (reduceMotion) {
      animated.forEach(function (el) {
        el.classList.add('is-visible');
      });
      return;
    }

    animated.forEach(function (el) {
      if (isNearViewport(el)) {
        el.classList.add('is-visible');
      }
    });

    document.body.classList.add('motion-enabled');

    if (!('IntersectionObserver' in window)) {
      animated.forEach(function (el) {
        el.classList.add('is-visible');
      });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) {
            return;
          }
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        });
      },
      {
        threshold: 0.01,
        rootMargin: '0px'
      }
    );

    animated.forEach(function (el) {
      if (el.classList.contains('is-visible')) {
        return;
      }
      observer.observe(el);
    });
  }

  function initHeaderState() {
    var header = document.querySelector('.site-header');
    if (!header) {
      return;
    }

    var ticking = false;
    var lastScrollY = window.scrollY || 0;
    var isHidden = false;
    var hideAfter = 220;
    var scrollDeltaThreshold = 8;

    var updateHeader = function () {
      var currentY = window.scrollY || 0;
      var scrollingDown = currentY > lastScrollY + scrollDeltaThreshold;
      var scrollingUp = currentY < lastScrollY - scrollDeltaThreshold;

      header.classList.toggle('is-scrolled', currentY > 12);

      if (header.classList.contains('menu-open')) {
        isHidden = false;
      } else if (currentY <= 24) {
        isHidden = false;
      } else if (currentY > hideAfter && scrollingDown) {
        isHidden = true;
      } else if (scrollingUp) {
        isHidden = false;
      }

      header.classList.toggle('is-hidden', isHidden);
      lastScrollY = currentY;
      ticking = false;
    };

    updateHeader();

    window.addEventListener(
      'scroll',
      function () {
        if (ticking) {
          return;
        }
        ticking = true;
        window.requestAnimationFrame(updateHeader);
      },
      { passive: true }
    );
  }

  function initActiveNav() {
    function normalizePageRef(value) {
      if (!value) {
        return 'index';
      }

      var ref = String(value)
        .split('#')[0]
        .split('?')[0]
        .trim()
        .replace(/^\.?\//, '')
        .replace(/\/+$/, '');

      if (!ref) {
        return 'index';
      }

      return ref.replace(/\.html$/i, '');
    }

    var currentPath = normalizePageRef(window.location.pathname);

    document.querySelectorAll('.nav-links a').forEach(function (link) {
      var href = normalizePageRef(link.getAttribute('href') || '');
      var isCurrent = href === currentPath;
      link.classList.toggle('is-current', isCurrent);

      if (isCurrent) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }

  function initMobileNav() {
    var header = document.querySelector('.site-header');
    var nav = document.querySelector('.nav-container');
    var toggle = document.querySelector('.mobile-menu-toggle');
    var navLinks = document.querySelector('.nav-links');
    var navCta = document.querySelector('.nav-cta');

    if (!header || !nav || !toggle || !navLinks || !navCta) {
      return;
    }

    var mobileBreakpoint = window.matchMedia('(max-width: 768px)');

    function setMenuState(expanded) {
      header.classList.toggle('menu-open', expanded);
      toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      document.body.classList.toggle('mobile-menu-open', expanded);
    }

    function closeMenu() {
      setMenuState(false);
    }

    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', 'site-nav-links');
    navLinks.id = navLinks.id || 'site-nav-links';

    toggle.addEventListener('click', function () {
      var willOpen = toggle.getAttribute('aria-expanded') !== 'true';
      setMenuState(willOpen);
    });

    navLinks.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeMenu);
    });

    navCta.addEventListener('click', closeMenu);

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        closeMenu();
      }
    });

    document.addEventListener('click', function (event) {
      if (!mobileBreakpoint.matches || !header.classList.contains('menu-open')) {
        return;
      }

      if (!nav.contains(event.target)) {
        closeMenu();
      }
    });

    mobileBreakpoint.addEventListener('change', function (event) {
      if (!event.matches) {
        closeMenu();
      }
    });
  }

  function activateTab(buttons, panels, nextButton) {
    buttons.forEach(function (btn) {
      btn.classList.remove('active');
      btn.setAttribute('aria-selected', 'false');
      btn.setAttribute('tabindex', '-1');
    });

    panels.forEach(function (panel) {
      panel.classList.remove('active');
      panel.setAttribute('hidden', 'hidden');
    });

    var target = nextButton.getAttribute('data-tab');
    var nextPanel = document.getElementById('tab-' + target);
    if (!nextPanel) {
      return;
    }

    nextButton.classList.add('active');
    nextButton.setAttribute('aria-selected', 'true');
    nextButton.setAttribute('tabindex', '0');

    nextPanel.classList.add('active');
    nextPanel.removeAttribute('hidden');
  }

  function initTabs() {
    var tabList = document.querySelector('.tabs-nav');
    var tabButtons = Array.prototype.slice.call(document.querySelectorAll('.tabs-nav .tab-btn'));
    var tabPanels = Array.prototype.slice.call(document.querySelectorAll('.tabs-content .tab-panel'));

    if (!tabButtons.length || !tabPanels.length) {
      return;
    }

    if (tabList) {
      tabList.setAttribute('role', 'tablist');
      tabList.setAttribute('aria-label', 'What Sets Us Apart');
    }

    tabButtons.forEach(function (button, index) {
      var panelId = 'tab-' + button.getAttribute('data-tab');
      var buttonId = 'tab-btn-' + button.getAttribute('data-tab');
      button.setAttribute('id', buttonId);
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-controls', panelId);
      button.setAttribute('aria-selected', button.classList.contains('active') ? 'true' : 'false');
      button.setAttribute('tabindex', button.classList.contains('active') ? '0' : '-1');

      button.addEventListener('click', function () {
        activateTab(tabButtons, tabPanels, button);
      });

      button.addEventListener('keydown', function (event) {
        var nextIndex = index;

        if (event.key === 'ArrowRight') {
          nextIndex = (index + 1) % tabButtons.length;
        } else if (event.key === 'ArrowLeft') {
          nextIndex = (index - 1 + tabButtons.length) % tabButtons.length;
        } else if (event.key === 'Home') {
          nextIndex = 0;
        } else if (event.key === 'End') {
          nextIndex = tabButtons.length - 1;
        } else if (event.key === 'Enter' || event.key === ' ') {
          activateTab(tabButtons, tabPanels, button);
          return;
        } else {
          return;
        }

        event.preventDefault();
        tabButtons[nextIndex].focus();
        activateTab(tabButtons, tabPanels, tabButtons[nextIndex]);
      });
    });

    tabPanels.forEach(function (panel) {
      var labelledBy = panel.id ? 'tab-btn-' + panel.id.replace(/^tab-/, '') : '';
      panel.setAttribute('role', 'tabpanel');
      if (labelledBy) {
        panel.setAttribute('aria-labelledby', labelledBy);
      }
      if (!panel.classList.contains('active')) {
        panel.setAttribute('hidden', 'hidden');
      }
    });
  }

  function animateCount(el, startValue, endValue, prefix, suffix, duration) {
    var animationDuration = duration || 1200;
    var start = null;

    function step(timestamp) {
      if (!start) {
        start = timestamp;
      }
      var progress = Math.min((timestamp - start) / animationDuration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      var current = Math.round(startValue + (endValue - startValue) * eased);

      el.textContent = prefix + current + suffix;

      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    }

    window.requestAnimationFrame(step);
  }

  function initStatsCountUp() {
    var stats = Array.prototype.slice.call(document.querySelectorAll('.stats-banner .stat-number'));
    if (!stats.length || reduceMotion) {
      return;
    }

    var parsed = stats
      .map(function (el) {
        var original = (el.textContent || '').trim();
        var match = original.match(/^(.*?)(\d+(?:\.\d+)?)(.*)$/);

        if (!match) {
          return null;
        }

        var end = parseFloat(match[2]);
        var dataEnd = parseFloat(el.getAttribute('data-count-to'));
        if (!isNaN(dataEnd)) {
          end = dataEnd;
        }

        var startValue = 0;
        var dataStart = parseFloat(el.getAttribute('data-count-from'));
        if (!isNaN(dataStart)) {
          startValue = dataStart;
        }

        var duration = parseInt(el.getAttribute('data-count-duration'), 10);
        if (isNaN(duration) || duration <= 0) {
          duration = 1200;
        }

        return {
          el: el,
          start: startValue,
          end: end,
          prefix: match[1],
          suffix: match[3],
          duration: duration
        };
      })
      .filter(Boolean);

    if (!parsed.length) {
      return;
    }

    var run = function () {
      parsed.forEach(function (item) {
        animateCount(item.el, item.start, item.end, item.prefix, item.suffix, item.duration);
      });
    };

    var banner = document.querySelector('.stats-banner');
    if (!banner) {
      run();
      return;
    }

    var started = false;
    if (!('IntersectionObserver' in window)) {
      run();
      return;
    }

    var observer = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (started || !entry.isIntersecting) {
            return;
          }
          started = true;
          run();
          obs.unobserve(entry.target);
        });
      },
      {
        threshold: 0.4
      }
    );

    observer.observe(banner);
  }

  function setFaqItemState(item, expanded, immediate) {
    var answer = item.querySelector('.faq-answer');
    var toggle = item.querySelector('.faq-question-toggle');
    if (!answer || !toggle) {
      return;
    }
    var applyImmediate = !!immediate || reduceMotion;
    toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    answer.setAttribute('aria-hidden', expanded ? 'false' : 'true');
    item.classList.toggle('is-open', expanded);

    if (applyImmediate) {
      answer.style.height = expanded ? 'auto' : '0px';
      answer.style.opacity = expanded ? '1' : '0';
      return;
    }

    if (answer._faqTransitionEnd) {
      answer.removeEventListener('transitionend', answer._faqTransitionEnd);
      answer._faqTransitionEnd = null;
    }

    var startHeight = answer.getBoundingClientRect().height;
    var endHeight = 0;
    if (expanded) {
      answer.style.height = 'auto';
      endHeight = answer.scrollHeight + 10;
      answer.style.height = startHeight + 'px';
    } else {
      endHeight = 0;
      answer.style.height = startHeight + 'px';
    }
    answer.style.opacity = expanded ? '0' : '1';

    window.requestAnimationFrame(function () {
      answer.style.height = endHeight + 'px';
      answer.style.opacity = expanded ? '1' : '0';
    });

    var onEnd = function (event) {
      if (event.propertyName !== 'height') {
        return;
      }
      answer.removeEventListener('transitionend', onEnd);
      answer._faqTransitionEnd = null;
      if (expanded) {
        answer.style.height = 'auto';
      }
    };

    answer._faqTransitionEnd = onEnd;
    answer.addEventListener('transitionend', onEnd);
  }

  function scrollToFaqTopic(id) {
    var target = document.getElementById(id);
    if (!target) {
      return;
    }

    var header = document.querySelector('.site-header');
    var headerOffset = header ? header.offsetHeight + 20 : 20;
    var targetTop = target.getBoundingClientRect().top + window.scrollY - headerOffset;

    window.scrollTo({
      top: targetTop,
      behavior: reduceMotion ? 'auto' : 'smooth'
    });
  }

  function initFaqUi() {
    var categories = Array.prototype.slice.call(document.querySelectorAll('.faq-category'));
    if (!categories.length) {
      return;
    }

    categories.forEach(function (category, categoryIndex) {
      var items = Array.prototype.slice.call(category.querySelectorAll('.faq-item'));

      items.forEach(function (item, index) {
        var question = item.querySelector('.faq-question');
        var answer = item.querySelector('.faq-answer');
        if (!question || !answer) {
          return;
        }

        var toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'faq-question-toggle';
        toggle.textContent = question.textContent.trim();
        var answerId = 'faq-answer-' + categoryIndex + '-' + index;
        answer.id = answerId;
        toggle.setAttribute('aria-controls', answerId);

        question.textContent = '';
        question.appendChild(toggle);

        toggle.addEventListener('click', function () {
          var willExpand = toggle.getAttribute('aria-expanded') !== 'true';
          if (willExpand) {
            items.forEach(function (other) {
              if (other !== item) {
                setFaqItemState(other, false, false);
              }
            });
          }
          setFaqItemState(item, willExpand, false);
        });

        setFaqItemState(item, index === 0, true);
      });
    });

    var topicSelect = document.getElementById('faq-topic-select');
    if (!topicSelect) {
      return;
    }

    topicSelect.addEventListener('change', function () {
      if (!topicSelect.value) {
        return;
      }
      scrollToFaqTopic(topicSelect.value);
    });

    var syncTopicSelection = function () {
      var header = document.querySelector('.site-header');
      var probeY = (header ? header.offsetHeight : 0) + 80;
      var activeId = '';

      categories.forEach(function (category) {
        if (!category.id) {
          return;
        }
        var rect = category.getBoundingClientRect();
        if (rect.top <= probeY && rect.bottom > probeY) {
          activeId = category.id;
        }
      });

      if (!activeId && categories.length && categories[0].id) {
        activeId = categories[0].id;
      }

      if (activeId && topicSelect.value !== activeId) {
        topicSelect.value = activeId;
      }
    };

    syncTopicSelection();

    if ('IntersectionObserver' in window) {
      var categoryObserver = new IntersectionObserver(syncTopicSelection, {
        threshold: [0, 0.2, 0.6]
      });

      categories.forEach(function (category) {
        categoryObserver.observe(category);
      });
    }
  }

  function initEducationSubsections() {
    var tabs = Array.prototype.slice.call(document.querySelectorAll('[data-education-track-target]'));
    var panels = Array.prototype.slice.call(document.querySelectorAll('[data-education-track-panel]'));
    var phaseDurationMs = 320;
    var transitionDuration = reduceMotion ? 0 : phaseDurationMs;
    var transitionTimer = null;
    var activePanel = null;
    if (!tabs.length || !panels.length) {
      return;
    }

    function getPanelByHash(hash) {
      if (!hash || hash.charAt(0) !== '#') {
        return null;
      }
      var id = hash.slice(1);
      if (!id) {
        return null;
      }
      var node = document.getElementById(id);
      if (!node || !node.hasAttribute('data-education-track-panel')) {
        return null;
      }
      return node;
    }

    function findPanelById(targetId) {
      for (var i = 0; i < panels.length; i += 1) {
        if (panels[i].id === targetId) {
          return panels[i];
        }
      }
      return null;
    }

    function getCurrentPanel() {
      for (var i = 0; i < panels.length; i += 1) {
        if (panels[i].classList.contains('is-entering')) {
          return panels[i];
        }
      }

      for (var i = 0; i < panels.length; i += 1) {
        if (panels[i].classList.contains('is-active') && !panels[i].classList.contains('is-leaving')) {
          return panels[i];
        }
      }

      for (var i = 0; i < panels.length; i += 1) {
        if (panels[i].classList.contains('is-active')) {
          return panels[i];
        }
      }

      return null;
    }

    function syncTabs(targetId) {
      tabs.forEach(function (tab) {
        var isActive = tab.getAttribute('data-education-track-target') === targetId;
        tab.classList.toggle('is-active', isActive);
        tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
        tab.setAttribute('tabindex', isActive ? '0' : '-1');
      });
    }

    function setPanelStateInstant(targetPanel) {
      panels.forEach(function (panel) {
        var isActive = panel === targetPanel;
        panel.classList.remove('is-entering', 'is-leaving');
        panel.classList.toggle('is-active', isActive);
        panel.setAttribute('aria-hidden', isActive ? 'false' : 'true');
      });
      activePanel = targetPanel || null;
    }

    function activateTrack(targetId, updateHash) {
      if (!targetId) {
        return;
      }

      var targetPanel = findPanelById(targetId);
      if (!targetPanel) {
        return;
      }

      syncTabs(targetId);

      var currentPanel = getCurrentPanel() || activePanel;
      if (transitionTimer) {
        window.clearTimeout(transitionTimer);
        transitionTimer = null;
        if (currentPanel) {
          setPanelStateInstant(currentPanel);
        }
      }

      currentPanel = getCurrentPanel() || activePanel;
      if (currentPanel === targetPanel) {
        setPanelStateInstant(targetPanel);
      } else if (transitionDuration === 0 || !currentPanel) {
        setPanelStateInstant(targetPanel);
      } else {
        panels.forEach(function (panel) {
          if (panel !== currentPanel && panel !== targetPanel) {
            panel.classList.remove('is-active', 'is-entering', 'is-leaving');
            panel.setAttribute('aria-hidden', 'true');
          }
        });

        // Phase 1: fade out current panel
        currentPanel.classList.remove('is-entering');
        currentPanel.classList.add('is-active', 'is-leaving');
        currentPanel.setAttribute('aria-hidden', 'true');

        transitionTimer = window.setTimeout(function () {
          // End phase 1: hide old panel
          currentPanel.classList.remove('is-active', 'is-entering', 'is-leaving');

          // Phase 2: fade in new panel
          targetPanel.classList.remove('is-active', 'is-leaving');
          targetPanel.setAttribute('aria-hidden', 'false');
          void targetPanel.offsetWidth;
          targetPanel.classList.add('is-entering');

          transitionTimer = window.setTimeout(function () {
            setPanelStateInstant(targetPanel);
            transitionTimer = null;
          }, transitionDuration);
        }, transitionDuration);
      }

      if (updateHash) {
        if (window.history && window.history.pushState) {
          window.history.pushState(null, '', '#' + targetId);
        } else {
          window.location.hash = targetId;
        }
      }
    }

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        activateTrack(tab.getAttribute('data-education-track-target'), true);
      });

      tab.addEventListener('keydown', function (event) {
        var currentIndex = tabs.indexOf(tab);
        if (currentIndex < 0) {
          return;
        }

        var nextIndex = currentIndex;
        if (event.key === 'ArrowRight') {
          nextIndex = (currentIndex + 1) % tabs.length;
        } else if (event.key === 'ArrowLeft') {
          nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        } else if (event.key === 'Home') {
          nextIndex = 0;
        } else if (event.key === 'End') {
          nextIndex = tabs.length - 1;
        } else {
          return;
        }

        event.preventDefault();
        tabs[nextIndex].focus();
        activateTrack(tabs[nextIndex].getAttribute('data-education-track-target'), true);
      });
    });

    function activateFromHash(hash) {
      var panel = getPanelByHash(hash);
      if (panel) {
        activateTrack(panel.id, false);
      }
    }

    window.addEventListener('hashchange', function () {
      activateFromHash(window.location.hash);
    });

    if (getPanelByHash(window.location.hash)) {
      activateFromHash(window.location.hash);
    } else if (tabs[0]) {
      activateTrack(tabs[0].getAttribute('data-education-track-target'), false);
    }
  }

  function initServicesScrollRail() {
    if (!document.body.classList.contains('page-services')) {
      return;
    }

    var panels = Array.prototype.slice.call(document.querySelectorAll('.services-scroll-panel[data-service-step]'));
    var links = Array.prototype.slice.call(document.querySelectorAll('[data-services-nav-link]'));
    var numberReel = document.querySelector('[data-services-number-reel]');
    var currentTitle = document.querySelector('[data-services-current-title]');
    var trackFill = document.querySelector('[data-services-track-fill]');
    if (!panels.length || !links.length || !numberReel || !currentTitle) {
      return;
    }

    var digitHeight = numberReel.querySelector('.services-scroll-digit');
    var activeIndex = 0;
    var titleFadeTimer = null;

    function getPanelFromLink(link) {
      var href = link.getAttribute('href') || '';
      if (!href || href.charAt(0) !== '#') {
        return null;
      }
      return document.getElementById(href.slice(1));
    }

    function setActivePanel(targetPanel) {
      if (!targetPanel) {
        return;
      }

      var newIndex = panels.indexOf(targetPanel);
      if (newIndex < 0) {
        newIndex = 0;
      }

      panels.forEach(function (panel) {
        panel.classList.toggle('is-active', panel === targetPanel);
      });

      links.forEach(function (link, linkIndex) {
        var panelForLink = getPanelFromLink(link);
        var isActive = panelForLink === targetPanel;
        var isPassed = linkIndex < newIndex;
        link.classList.toggle('is-active', isActive);
        link.classList.toggle('is-passed', isPassed);
        if (isActive) {
          link.setAttribute('aria-current', 'true');
        } else {
          link.removeAttribute('aria-current');
        }
      });

      // Rolling number animation
      if (digitHeight) {
        var h = digitHeight.offsetHeight;
        numberReel.style.transform = 'translateY(-' + (newIndex * h) + 'px)';
      }

      // Progress track fill
      if (trackFill) {
        var fillPercent = panels.length > 1
          ? (newIndex / (panels.length - 1)) * 100
          : 0;
        trackFill.style.height = fillPercent + '%';
      }

      // Title fade transition
      var newTitle = targetPanel.getAttribute('data-service-title') || '';
      if (newIndex !== activeIndex || currentTitle.textContent !== newTitle) {
        if (titleFadeTimer) {
          window.clearTimeout(titleFadeTimer);
        }
        currentTitle.classList.add('is-fading');
        titleFadeTimer = window.setTimeout(function () {
          currentTitle.textContent = newTitle;
          currentTitle.classList.remove('is-fading');
          titleFadeTimer = null;
        }, reduceMotion ? 0 : 250);
      }

      activeIndex = newIndex;
    }

    links.forEach(function (link) {
      link.addEventListener('click', function (event) {
        var targetPanel = getPanelFromLink(link);
        if (!targetPanel) {
          return;
        }

        event.preventDefault();
        var header = document.querySelector('.site-header');
        var offset = header ? header.offsetHeight + 18 : 18;
        var targetTop = targetPanel.getBoundingClientRect().top + window.scrollY - offset;

        window.scrollTo({
          top: targetTop,
          behavior: reduceMotion ? 'auto' : 'smooth'
        });

        if (window.history && window.history.pushState) {
          window.history.pushState(null, '', '#' + targetPanel.id);
        } else {
          window.location.hash = targetPanel.id;
        }
      });
    });

    if (!('IntersectionObserver' in window)) {
      setActivePanel(panels[0]);
      return;
    }

    var currentPanel = null;
    var observer = new IntersectionObserver(
      function (entries) {
        var visible = entries.filter(function (entry) {
          return entry.isIntersecting;
        });

        if (!visible.length) {
          return;
        }

        visible.sort(function (a, b) {
          return b.intersectionRatio - a.intersectionRatio;
        });

        if (visible[0].target !== currentPanel) {
          currentPanel = visible[0].target;
          setActivePanel(currentPanel);
        }
      },
      {
        threshold: [0.2, 0.4, 0.6, 0.8],
        rootMargin: '-18% 0px -38% 0px'
      }
    );

    panels.forEach(function (panel) {
      observer.observe(panel);
    });

    var fromHash = null;
    if (window.location.hash && window.location.hash.charAt(0) === '#') {
      var hashNode = document.getElementById(window.location.hash.slice(1));
      if (hashNode) {
        fromHash = hashNode.classList.contains('services-scroll-panel')
          ? hashNode
          : hashNode.closest('.services-scroll-panel');
      }
    }

    setActivePanel(fromHash && panels.indexOf(fromHash) > -1 ? fromHash : panels[0]);
  }

  function setContactStatus(statusEl, type, message) {
    if (!statusEl) {
      return;
    }

    statusEl.textContent = message || '';
    statusEl.classList.remove('is-success', 'is-error');
    if (type === 'success') {
      statusEl.classList.add('is-success');
    } else if (type === 'error') {
      statusEl.classList.add('is-error');
    }
  }

  function initContactForm() {
    if (!document.body.classList.contains('page-contact')) {
      return;
    }

    var form = document.getElementById('contact-form');
    if (!form) {
      return;
    }

    var submitButton = form.querySelector('.contact-submit');
    var statusEl = document.getElementById('contact-form-status');
    var busy = false;
    var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (busy) {
        return;
      }

      var formData = new FormData(form);
      var payload = {
        firstName: (formData.get('first-name') || '').toString().trim(),
        lastName: (formData.get('last-name') || '').toString().trim(),
        email: (formData.get('email') || '').toString().trim(),
        phone: (formData.get('phone') || '').toString().trim(),
        careerStage: (formData.get('career-stage') || '').toString().trim(),
        sport: (formData.get('sport') || '').toString().trim(),
        message: (formData.get('message') || '').toString().trim(),
        referral: (formData.get('referral') || '').toString().trim(),
        website: (formData.get('website') || '').toString().trim(),
        turnstileToken:
          (formData.get('turnstileToken') || '').toString().trim() ||
          (formData.get('cf-turnstile-response') || '').toString().trim()
      };

      if (!payload.firstName || !payload.lastName || !payload.email) {
        setContactStatus(statusEl, 'error', 'Please complete first name, last name, and email.');
        return;
      }

      if (!emailPattern.test(payload.email)) {
        setContactStatus(statusEl, 'error', 'Please enter a valid email address.');
        return;
      }

      busy = true;
      if (submitButton) {
        submitButton.disabled = true;
      }
      setContactStatus(statusEl, '', 'Sending...');

      fetch('/api/contact_handler', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })
        .then(function (response) {
          return response
            .json()
            .catch(function () {
              return { ok: false, error: 'Unexpected server response.' };
            })
            .then(function (data) {
              return { response: response, data: data };
            });
        })
        .then(function (result) {
          if (!result.response.ok || !result.data.ok) {
            throw new Error(result.data.error || 'Unable to send your message. Please try again.');
          }

          setContactStatus(statusEl, 'success', 'Your message was received successfully. We will be in touch shortly');
          form.reset();
        })
        .catch(function (error) {
          setContactStatus(
            statusEl,
            'error',
            error && error.message ? error.message : 'Unable to send your message. Please try again.'
          );
        })
        .finally(function () {
          busy = false;
          if (submitButton) {
            submitButton.disabled = false;
          }
        });
    });
  }

  function initAthleteTimeline() {
    var wrapper = document.querySelector('.athlete-timeline-wrapper');
    var track = document.querySelector('.athlete-timeline-track');
    var prevBtn = document.querySelector('.athlete-timeline-arrow--prev');
    var nextBtn = document.querySelector('.athlete-timeline-arrow--next');

    if (!wrapper || !track || !prevBtn || !nextBtn) {
      return;
    }

    var scrollAmount = 340;

    prevBtn.addEventListener('click', function () {
      track.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    });

    nextBtn.addEventListener('click', function () {
      track.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    });

    function updateArrows() {
      var atStart = track.scrollLeft <= 4;
      var atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
      prevBtn.style.opacity = atStart ? '0.3' : '1';
      prevBtn.style.pointerEvents = atStart ? 'none' : 'auto';
      nextBtn.style.opacity = atEnd ? '0.3' : '1';
      nextBtn.style.pointerEvents = atEnd ? 'none' : 'auto';
    }

    track.addEventListener('scroll', updateArrows, { passive: true });
    updateArrows();
  }

  function initEntertainerCoverageCards() {
    var cards = Array.prototype.slice.call(document.querySelectorAll('.entertainer-artisan-coverage-card'));
    var grid = document.querySelector('.entertainer-artisan-coverage-grid');
    if (!cards.length || !grid) {
      return;
    }

    var activeIndex = 0;
    var rotationTimer = null;
    var interactionLock = false;
    var inViewport = true;

    function setActive(index) {
      var nextIndex = index;
      if (nextIndex < 0) {
        nextIndex = cards.length - 1;
      } else if (nextIndex >= cards.length) {
        nextIndex = 0;
      }

      activeIndex = nextIndex;
      cards.forEach(function (card, idx) {
        card.classList.toggle('is-active', idx === activeIndex);
      });
    }

    function stopRotation() {
      if (rotationTimer) {
        window.clearInterval(rotationTimer);
        rotationTimer = null;
      }
    }

    function startRotation() {
      if (reduceMotion || cards.length < 2 || interactionLock || !inViewport || rotationTimer) {
        return;
      }

      rotationTimer = window.setInterval(function () {
        setActive(activeIndex + 1);
      }, 2800);
    }

    cards.forEach(function (card, idx) {
      card.setAttribute('tabindex', '0');

      card.addEventListener('mouseenter', function () {
        interactionLock = true;
        stopRotation();
        setActive(idx);
      });

      card.addEventListener('mouseleave', function () {
        interactionLock = false;
        startRotation();
      });

      card.addEventListener('focus', function () {
        interactionLock = true;
        stopRotation();
        setActive(idx);
      });

      card.addEventListener('blur', function () {
        interactionLock = false;
        startRotation();
      });

      card.addEventListener('click', function () {
        setActive(idx);
      });
    });

    setActive(0);

    if ('IntersectionObserver' in window) {
      inViewport = false;
      var coverageObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.target !== grid) {
              return;
            }

            inViewport = entry.isIntersecting;
            if (inViewport) {
              startRotation();
            } else {
              stopRotation();
            }
          });
        },
        {
          threshold: 0.28
        }
      );

      coverageObserver.observe(grid);
    }

    startRotation();
  }

  initBaseReveal();
  initHeaderState();
  initActiveNav();
  initMobileNav();
  initTabs();
  initStatsCountUp();
  initFaqUi();
  initEducationSubsections();
  initServicesScrollRail();
  initContactForm();
  initAthleteTimeline();
  initEntertainerCoverageCards();
})();
