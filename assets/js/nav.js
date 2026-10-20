// Menu bar: sliding underline, pressed state, and a short exit transition before
// navigating. The delay is a plain timeout so navigation always happens.
// Modifier/middle clicks, new-tab links and #anchors are left to the browser.
(function () {
  'use strict';

  var root = document.documentElement;
  var nav = document.querySelector('.vp-nav');
  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Back/forward cache can restore the page mid-exit, so clear it
  window.addEventListener('pageshow', function () { root.classList.remove('vp-leaving'); });

  // --- shared underline ---

  var wide = window.matchMedia('(min-width: 768px)');
  var links = nav ? Array.prototype.slice.call(nav.querySelectorAll('.nav-link')) : [];
  var rail = null;
  var settle = null;

  function measure(link) {
    var n = nav.getBoundingClientRect();
    var b = link.getBoundingClientRect();
    // 6px under the text, same as the CSS underline
    return { left: b.left - n.left, width: b.width, top: b.bottom - n.top + 6 };
  }

  function put(box) {
    rail.style.left = box.left + 'px';
    rail.style.width = box.width + 'px';
    rail.style.top = box.top + 'px';
  }

  // No fallback to the first tab - legal/account pages aren't in the menu
  function current() {
    return document.querySelector('.vp-nav .nav-link.active');
  }

  function slideTo(link) {
    if (!rail || !link) return;
    var to = measure(link);

    // Nothing to slide from, just place it
    if (!nav.classList.contains('vp-nav--live')) {
      put(to);
      nav.classList.add('vp-nav--live');
      return;
    }

    if (still) { put(to); return; }

    // isNaN, not ||, because the first tab sits at left 0
    var fl = parseFloat(rail.style.left);
    var fw = parseFloat(rail.style.width);
    var from = {
      left: isNaN(fl) ? to.left : fl,
      width: isNaN(fw) ? to.width : fw
    };

    // Stretch over both tabs, then shrink onto the new one
    window.clearTimeout(settle);
    put({
      left: Math.min(from.left, to.left),
      width: Math.max(from.left + from.width, to.left + to.width) - Math.min(from.left, to.left),
      top: to.top
    });
    settle = window.setTimeout(function () { put(to); }, 160);
  }

  function reset() {
    if (!nav) return;
    if (!wide.matches) { nav.classList.remove('vp-nav--live'); return; }
    if (!rail) {
      rail = document.createElement('span');
      rail.className = 'vp-nav__rail';
      rail.setAttribute('aria-hidden', 'true');
      nav.appendChild(rail);
    }
    var link = current();
    if (!link) { nav.classList.remove('vp-nav--live'); return; }
    // No transition on the first placement
    var keep = rail.style.transition;
    rail.style.transition = 'none';
    put(measure(link));
    rail.offsetHeight;                      // force reflow
    rail.style.transition = keep;
    nav.classList.add('vp-nav--live');
  }

  if (nav && links.length) {
    reset();
    var timer;
    window.addEventListener('resize', function () {
      window.clearTimeout(timer);
      timer = window.setTimeout(reset, 140);
    });
    // Re-measure after the labels are translated
    document.addEventListener('vp:languagechange', function () { window.setTimeout(reset, 40); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(reset);
  }

  // --- sticky app bar ---

  // Add a shadow once the page has scrolled
  var appbar = document.querySelector('.vp-appbar');
  if (appbar) {
    var stuck = false;
    var check = function () {
      var now = window.scrollY > 4;
      if (now === stuck) return;
      stuck = now;
      appbar.classList.toggle('is-stuck', now);
    };
    window.addEventListener('scroll', check, { passive: true });
    check();
  }

  // --- leaving a page ---

  // Header links that go to another page on this site
  var LEAVES = '.vp-nav .nav-link, .vp-nav-actions a[href], .vp-appnav__item';
  var HOLD = 300;

  function ordinary(e, link) {
    if (e.defaultPrevented || e.button !== 0) return false;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
    if (link.target && link.target !== '_self') return false;
    if (link.hasAttribute('download')) return false;
    var href = link.getAttribute('href');
    if (!href || href.charAt(0) === '#') return false;
    // Same-origin only, external links navigate straight away
    return new URL(href, location.href).origin === location.origin;
  }

  document.addEventListener('click', function (e) {
    var link = e.target.closest && e.target.closest(LEAVES);
    if (!link || !ordinary(e, link)) return;

    var tab = link.matches('.vp-nav .nav-link') ? link : null;
    // App menu pill: no underline, same press + exit
    var pill = link.matches('.vp-appnav__item') ? link : null;
    var here = (tab && tab.classList.contains('active')) || (pill && pill.classList.contains('is-active'));

    // Already on this page - just play the press
    if (here) {
      e.preventDefault();
      var mark = tab || pill;
      mark.classList.add('is-pressed');
      window.setTimeout(function () { mark.classList.remove('is-pressed'); }, 260);
      return;
    }

    e.preventDefault();
    if (tab) {
      tab.classList.add('is-pressed');
      slideTo(tab);
    }
    if (pill) pill.classList.add('is-pressed');
    root.classList.add('vp-leaving');

    var href = link.href;
    window.setTimeout(function () { window.location.href = href; }, still ? 0 : HOLD);
  });
})();
