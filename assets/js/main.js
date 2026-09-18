/* VivaPoll homepage – language switching and small enhancements.
   Bootstrap handles the navbar collapse, dropdown and accordion. */
(function () {
  const STORAGE_KEY = 'vp-lang';
  const DEFAULT_LANG = 'en';
  const LANG_NAMES = {
    en: 'English',
    nl: 'Nederlands',
    fr: 'Français',
    de: 'Deutsch',
    es: 'Español',
    it: 'Italiano'
  };

  const dictionaries = window.VP_I18N || {};
  // Optional page-specific translations (e.g. legal pages) loaded before this script.
  const pageDictionaries = window.VP_I18N_PAGE || {};
  // English originals captured from the HTML, used as the fallback for every language.
  let domDefaults = null;

  function captureDomDefaults() {
    const defaults = {
      'meta.title': document.title,
      'meta.description': (document.querySelector('meta[name="description"]') || {}).content
    };
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      if (!(el.dataset.i18n in defaults)) defaults[el.dataset.i18n] = el.textContent;
    });
    document.querySelectorAll('[data-i18n-html]').forEach((el) => {
      if (!(el.dataset.i18nHtml in defaults)) defaults[el.dataset.i18nHtml] = el.innerHTML;
    });
    document.querySelectorAll('[data-i18n-attr]').forEach((el) => {
      el.dataset.i18nAttr.split(';').forEach((pair) => {
        const [attr, key] = pair.split(':').map((part) => part && part.trim());
        if (attr && key && !(key in defaults)) defaults[key] = el.getAttribute(attr);
      });
    });
    return defaults;
  }

  function buildDictionary(lang) {
    return Object.assign(
      {},
      dictionaries.en,
      domDefaults,
      pageDictionaries.en,
      lang !== 'en' ? dictionaries[lang] : null,
      lang !== 'en' ? pageDictionaries[lang] : null
    );
  }

  function readStoredLang() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
  }

  function storeLang(lang) {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) { /* storage unavailable */ }
  }

  function isSupported(lang) {
    return Boolean(lang && dictionaries[lang] && LANG_NAMES[lang]);
  }

  // Priority: ?lang= in the URL, then the saved choice, then the browser language.
  function detectInitialLang() {
    const fromUrl = new URLSearchParams(window.location.search).get('lang');
    if (isSupported(fromUrl)) return fromUrl;

    const stored = readStoredLang();
    if (isSupported(stored)) return stored;

    const browser = (navigator.language || '').slice(0, 2).toLowerCase();
    if (isSupported(browser)) return browser;

    return DEFAULT_LANG;
  }

  // Desktop hero: shrink the headline a little (never below 76%) when a translation needs more than two lines.
  function fitHeroTitle() {
    const title = document.querySelector('.vp-hero__title');
    if (!title) return;
    title.style.fontSize = '';
    if (!window.matchMedia('(min-width: 992px)').matches) return;

    const baseSize = parseFloat(getComputedStyle(title).fontSize);
    const minSize = baseSize * 0.76;
    let size = baseSize;
    const lineCount = () => {
      const lineHeight = parseFloat(getComputedStyle(title).lineHeight) || size * 1.08;
      return Math.round(title.getBoundingClientRect().height / lineHeight);
    };
    while (lineCount() > 2 && size > minSize) {
      size = Math.max(minSize, size - 2);
      title.style.fontSize = size + 'px';
    }
  }

  function applyLanguage(lang) {
    if (!isSupported(lang)) lang = DEFAULT_LANG;
    if (!domDefaults) domDefaults = captureDomDefaults();
    const dict = buildDictionary(lang);

    document.documentElement.lang = lang;

    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const value = dict[el.dataset.i18n];
      if (value !== undefined) el.textContent = value;
    });

    document.querySelectorAll('[data-i18n-html]').forEach((el) => {
      const value = dict[el.dataset.i18nHtml];
      if (value !== undefined) el.innerHTML = value;
    });

    // data-i18n-attr="aria-label:key;alt:otherKey"
    document.querySelectorAll('[data-i18n-attr]').forEach((el) => {
      el.dataset.i18nAttr.split(';').forEach((pair) => {
        const [attr, key] = pair.split(':').map((part) => part && part.trim());
        if (attr && key && dict[key] !== undefined) el.setAttribute(attr, dict[key]);
      });
    });

    // Pages that share one translation file pick their own title key via <body data-i18n-title="...">.
    const titleKey = document.body.dataset.i18nTitle || 'meta.title';
    if (dict[titleKey]) document.title = dict[titleKey];
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription && dict['meta.description']) metaDescription.setAttribute('content', dict['meta.description']);

    const label = document.querySelector('.vp-lang__label');
    if (label) label.textContent = LANG_NAMES[lang];

    document.querySelectorAll('.vp-lang [data-lang]').forEach((item) => {
      const active = item.dataset.lang === lang;
      item.classList.toggle('active', active);
      if (active) item.setAttribute('aria-current', 'true');
      else item.removeAttribute('aria-current');
    });

    storeLang(lang);
    fitHeroTitle();
    document.dispatchEvent(new CustomEvent('vp:languagechange', { detail: { lang } }));
  }

  document.addEventListener('DOMContentLoaded', () => {
    applyLanguage(detectInitialLang());

    // Re-fit the hero headline once web fonts are ready and whenever the window is resized.
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitHeroTitle);
    let resizeTimer;
    window.addEventListener('resize', () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(fitHeroTitle, 120);
    });

    // Language selector
    document.querySelectorAll('.vp-lang [data-lang]').forEach((item) => {
      item.addEventListener('click', (event) => {
        event.preventDefault();
        applyLanguage(item.dataset.lang);
      });
    });

    // Legal pages: highlight the first section until Bootstrap ScrollSpy marks one as active.
    const tocLinks = document.querySelectorAll('#vpTocNav .nav-link');
    if (tocLinks.length) {
      const ensureActive = () => {
        if (!document.querySelector('#vpTocNav .nav-link.active')) tocLinks[0].classList.add('active');
      };
      ensureActive();
      // Bootstrap ScrollSpy initialises on window load and may clear the active link; restore it.
      window.addEventListener('load', () => window.setTimeout(ensureActive, 100));
      window.addEventListener('scroll', () => window.requestAnimationFrame(ensureActive), { passive: true });
    }

    // Legal pages: collapse the mobile "On this page" list after a section is chosen.
    const tocList = document.getElementById('vpTocList');
    if (tocList && window.bootstrap) {
      const tocCollapse = bootstrap.Collapse.getOrCreateInstance(tocList, { toggle: false });
      tocList.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', (event) => {
          if (!(window.matchMedia('(max-width: 991.98px)').matches && tocList.classList.contains('show'))) return;
          // Close the list first, then scroll: the collapsing list changes the page height.
          event.preventDefault();
          event.stopPropagation();
          const hash = link.getAttribute('href');
          const target = document.querySelector(hash);
          tocList.addEventListener('hidden.bs.collapse', () => {
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            if (history.replaceState) history.replaceState(null, '', hash);
          }, { once: true });
          tocCollapse.hide();
        });
      });
    }

    // Close the mobile menu after a nav link or language is chosen.
    const navCollapse = document.getElementById('vpNav');
    if (navCollapse && window.bootstrap) {
      const collapse = bootstrap.Collapse.getOrCreateInstance(navCollapse, { toggle: false });
      navCollapse.querySelectorAll('.nav-link, .vp-nav-actions .btn:not(.dropdown-toggle), .vp-lang [data-lang]').forEach((link) => {
        link.addEventListener('click', () => {
          if (navCollapse.classList.contains('show')) collapse.hide();
        });
      });
    }
  });
})();
