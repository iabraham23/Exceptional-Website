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
      '.tabs-wrapper',
      '.story-grid > *',
      '.faq-item',
      '.education-media-grid .education-image-slot',
      '.education-context-inline .education-reality-card',
      '.education-topic-accordion .education-topic',
      '.contact-grid > *',
      '.cta-content > *',
      '.footer-top > *'
    ];

    var staggerGroups = [
      ['.services-grid', '.service-card'],
      ['.career-timeline', '.career-card'],
      ['.values-grid', '.value-card'],
      ['.team-grid', '.team-card'],
      ['.philosophy-pillars', '.pillar-card'],
      ['.services-detail-grid', '.service-detail'],
      ['.framework-grid', '.framework-item'],
      ['.process-steps', '.process-step'],
      ['.serve-grid', '.serve-card']
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
    var currentPath = window.location.pathname.split('/').pop();
    if (!currentPath) {
      currentPath = 'index.html';
    }

    document.querySelectorAll('.nav-links a').forEach(function (link) {
      var href = (link.getAttribute('href') || '').split('#')[0];
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

  function animateCount(el, endValue, prefix, suffix) {
    var duration = 1200;
    var start = null;

    function step(timestamp) {
      if (!start) {
        start = timestamp;
      }
      var progress = Math.min((timestamp - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      var current = Math.round(endValue * eased);

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

        return {
          el: el,
          end: parseFloat(match[2]),
          prefix: match[1],
          suffix: match[3]
        };
      })
      .filter(Boolean);

    if (!parsed.length) {
      return;
    }

    var run = function () {
      parsed.forEach(function (item) {
        animateCount(item.el, item.end, item.prefix, item.suffix);
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
    if (!document.body.classList.contains('page-faq')) {
      return;
    }

    var categories = Array.prototype.slice.call(document.querySelectorAll('.faq-category'));
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

      fetch('/api/contact', {
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

          setContactStatus(statusEl, 'success', 'Thanks. Your message was received successfully.');
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

  initBaseReveal();
  initHeaderState();
  initActiveNav();
  initMobileNav();
  initTabs();
  initStatsCountUp();
  initFaqUi();
  initContactForm();
})();
