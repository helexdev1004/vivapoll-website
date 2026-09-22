/* VivaPoll – menu bar motion. Vanilla, no library, runs on every page.
 *
 * Clicking a tab used to be instant: the browser threw the old page away before anything
 * could be seen, so there was nothing to react to. Three things happen now instead.
 *
 *   · one underline is shared by the whole menu rather than one per tab. On a click it
 *     stretches to span both the old tab and the new one, then contracts onto the new
 *     one - so the mark travels and settles rather than blinking across.
 *   · the tab that was clicked lifts and takes the brand colour straight away, before
 *     the new page has even been asked for
 *   · the content of the page lifts away and fades while the menu bar itself stays put,
 *     which is what makes the two pages read as one place rather than two
 *
 * Navigation is held back for as long as that takes and no longer. The delay is a plain
 * timer that always fires, so a mistake here can at worst make a tab feel slow - it can
 * never strand somebody on a half-faded page. Modifier-clicks, middle-clicks, new-tab
 * links and anchors are all left alone for the browser to handle as it normally would.
 */
(function () {
  'use strict';

  var root = document.documentElement;
  var nav = document.querySelector('.vp-nav');
  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Coming back through the browser's back button can restore this page from cache with
  // whatever classes it had when it was left. Clear the leaving state, or the visitor
  // lands on a page that faded itself out and never came back.
  window.addEventListener('pageshow', function () { root.classList.remove('vp-leaving'); });

  /* ------------------------------------------------------ the shared underline */

  var wide = window.matchMedia('(min-width: 768px)');
  var links = nav ? Array.prototype.slice.call(nav.querySelectorAll('.nav-link')) : [];
  var rail = null;
  var settle = null;

  function measure(link) {
    var n = nav.getBoundingClientRect();
    var b = link.getBoundingClientRect();
    // 6px below the text, matching where the plain CSS underline sits, so nothing shifts
    // when this takes over from it.
    return { left: b.left - n.left, width: b.width, top: b.bottom - n.top + 6 };
  }

  function put(box) {
    rail.style.left = box.left + 'px';
    rail.style.width = box.width + 'px';
    rail.style.top = box.top + 'px';
  }

  // Deliberately no fallback to the first tab. The legal pages and the two account pages
  // are not in the menu at all, so on those nothing is current - and parking the mark
  // under "Home" there would claim the visitor is somewhere they are not.
  function current() {
    return document.querySelector('.vp-nav .nav-link.active');
  }

  function slideTo(link) {
    if (!rail || !link) return;
    var to = measure(link);

    // Arriving from a page with no tab selected: there is nowhere to travel from, so
    // bring the mark up on the tab that was chosen instead.
    if (!nav.classList.contains('vp-nav--live')) {
      put(to);
      nav.classList.add('vp-nav--live');
      return;
    }

    if (still) { put(to); return; }

    // Checked against NaN rather than falsiness: the first tab sits at left 0, and `||`
    // would throw that away and take the destination as the origin - which quietly turns
    // the whole stretch into a plain slide.
    var fl = parseFloat(rail.style.left);
    var fw = parseFloat(rail.style.width);
    var from = {
      left: isNaN(fl) ? to.left : fl,
      width: isNaN(fw) ? to.width : fw
    };

    // Stretch across both tabs first, then collect onto the new one. Two steps, one
    // transition - that is the whole trick, and it is what stops it reading as a jump.
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
    // Placed without a transition on the first run, so it does not fly in from nowhere.
    var keep = rail.style.transition;
    rail.style.transition = 'none';
    put(measure(link));
    rail.offsetHeight;                      // force the change to take before animating again
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
    // The tabs are translated after this file runs, and a longer word is a wider tab.
    document.addEventListener('vp:languagechange', function () { window.setTimeout(reset, 40); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(reset);
  }

  /* ------------------------------------------------- the app bar, once it is stuck */

  // A sticky bar that looks identical to the page behind it is not readable as a bar.
  // The shadow arrives the moment the page moves, which is what tells the eye the menu
  // is in front of the content rather than part of it.
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

  /* ------------------------------------------------------------- leaving a page */

  // Anything in the header that goes somewhere else on this site: the tabs, the log in /
  // sign up buttons beside them, and on the signed-in pages the four menu pills.
  var LEAVES = '.vp-nav .nav-link, .vp-nav-actions a[href], .vp-appnav__item';
  var HOLD = 300;

  function ordinary(e, link) {
    if (e.defaultPrevented || e.button !== 0) return false;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
    if (link.target && link.target !== '_self') return false;
    if (link.hasAttribute('download')) return false;
    var href = link.getAttribute('href');
    if (!href || href.charAt(0) === '#') return false;
    // Only our own pages - an outside link should leave immediately, as expected.
    return new URL(href, location.href).origin === location.origin;
  }

  document.addEventListener('click', function (e) {
    var link = e.target.closest && e.target.closest(LEAVES);
    if (!link || !ordinary(e, link)) return;

    var tab = link.matches('.vp-nav .nav-link') ? link : null;
    // The signed-in menu. It has no travelling underline - the pill itself marks where
    // the visitor is - but it takes the same press and the same page exit.
    var pill = link.matches('.vp-appnav__item') ? link : null;
    var here = (tab && tab.classList.contains('active')) || (pill && pill.classList.contains('is-active'));

    // Already here: give it its press and stop, rather than reloading the page the
    // visitor is looking at.
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
