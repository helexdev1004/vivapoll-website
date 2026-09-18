/* VivaPoll – page motion (GSAP + ScrollTrigger). Loaded on every page.
 *
 * Everything here is bidirectional: it plays as you scroll down and rewinds as you
 * scroll back up, so the page reads the same travelling either way.
 *
 * What it does
 *   · the hero headline drops in letter by letter, each through the top of its own line
 *   · headings and copy rise into place, in sequence
 *   · cards hinge up out of the page in 3D, one after another
 *   · the statistics count up to their figure, and count back down on the way out
 *   · the illustration, its reward card and the background circles drift at their own
 *     speeds against the scroll
 *   · a progress bar across the top tracks how far down the page you are
 *
 * Markup drives the simple cases:
 *   data-anim="up|down|left|right|zoom|fade|tilt|chars"
 *   data-anim-group      animate this element's children in sequence
 *   data-anim-delay="0.15"
 *   data-anim-once       reveal once and never rewind (used by the legal pages)
 *   data-count           count this number up
 *
 * The homepage-only pieces - the hero parallax, the counting statistics - look for their
 * own elements and simply do nothing on pages that have none, so this one file drives
 * every page without knowing which it is on.
 *
 * Nothing here is load-bearing. The hidden start state only applies while `.vp-anim` is
 * on <html>, and that class comes off the moment this file runs - so a blocked CDN or a
 * JavaScript error leaves an ordinary, fully visible page behind.
 */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!window.gsap || !window.ScrollTrigger || reduced) {
    root.classList.remove('vp-anim');
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  var narrow = window.matchMedia('(max-width: 767.98px)');
  var desktop = window.matchMedia('(min-width: 992px)');
  // Only the reveals, headings and counters are tracked here. The parallax and the
  // progress rail are built once and left alone, since a language change does not
  // affect them.
  var triggers = [];
  var tweens = [];

  /* ---------------------------------------------------------------- helpers */

  var DIST = 46;
  var FROM = {
    up:    { y: DIST },
    down:  { y: -DIST },
    left:  { x: -DIST },
    right: { x: DIST },
    zoom:  { scale: 0.9 },
    fade:  {},
    // Hinged along its own top edge, so the card swings up out of the page.
    tilt:  { y: 38, rotateX: -32, transformOrigin: '50% 0%' }
  };

  function startVars(name) {
    if (narrow.matches && (name === 'left' || name === 'right')) name = 'up';
    if (narrow.matches && name === 'tilt') name = 'up';
    var preset = FROM[name] || FROM.up;
    var vars = { autoAlpha: 0 };
    for (var k in preset) vars[k] = preset[k];
    return vars;
  }

  // Built paused and driven from the four callbacks by hand. `toggleActions` on a
  // `.from()` tween would not resume once reversed, stranding elements invisible.
  // Anything sitting in the viewport when the page loads has a start position above the
  // top of the document, so ScrollTrigger never sees an "enter" transition for it and
  // the tween would sit at its start state forever. After building, every trigger that
  // is already active is played by hand.
  function playActive() {
    triggers.forEach(function (trigger, i) {
      if (trigger.isActive && tweens[i]) tweens[i].play();
    });
  }

  function scrollPlay(tween, trigger, start, end) {
    // Anything already on screen when the page opens is choreography, not scrolling:
    // play it once and keep it out of ScrollTrigger entirely. Otherwise its start point
    // sits above the top of the document, where every refresh - webfonts arriving, a
    // resize - winds it back and the hero empties itself.
    var box = trigger.getBoundingClientRect();
    if (window.scrollY < 4 && box.top < window.innerHeight * 0.92) {
      tween.play();
      return;
    }

    // `data-anim-once` reveals the element a single time and then leaves it alone. The
    // legal pages use it throughout: a paragraph that faded itself out again as the
    // reader scrolled past would be fighting them, not helping.
    var once = !!(trigger.hasAttribute && trigger.hasAttribute('data-anim-once'));
    var play = function () { tween.play(); };

    tweens.push(tween);

    if (once) {
      // All four crossings reveal it, and none of them rewind. Replaying a tween that
      // has already finished costs nothing, and covering every crossing is what makes
      // this safe: a short paragraph can be cleared entirely between two frames when
      // somebody scrolls quickly or follows a link into the middle of the document, and
      // ScrollTrigger then reports only the leave. Waiting for `onEnter` alone left
      // those sections blank until something else happened to nudge them.
      triggers.push(ScrollTrigger.create({
        trigger: trigger,
        start: start || 'top 88%',
        end: end || 'bottom top',
        onEnter: play,
        onEnterBack: play,
        onLeave: play,
        onLeaveBack: play
      }));
      // Already scrolled past before this was even built - a reload partway down the
      // page, or a deep link.
      if (trigger.getBoundingClientRect().top < window.innerHeight * 0.88) tween.play();
      return;
    }

    triggers.push(ScrollTrigger.create({
      trigger: trigger,
      start: start || 'top 88%',
      // `bottom top` and not a percentage: short elements would otherwise rewind while
      // still on screen.
      end: end || 'bottom top',
      onEnter: play,
      onEnterBack: play,
      onLeave: function () { tween.reverse(); },
      onLeaveBack: function () { tween.reverse(); }
    }));
  }

  /* ------------------------------------------------------ falling letters */

  // Each letter is wrapped in its own span, and each word in a box that hides whatever
  // overflows it. The letters start above their word and drop in one after another, so
  // they arrive through the top edge of the line rather than simply fading on.
  //
  // The wrapping walks the existing nodes rather than rebuilding from plain text, so the
  // structure the markup relies on - the line break, the blue run - survives intact.
  function wrapLetters(node, out) {
    Array.prototype.slice.call(node.childNodes).forEach(function (child) {
      if (child.nodeType === 1) { wrapLetters(child, out); return; }
      if (child.nodeType !== 3) return;

      child.nodeValue.split(/(\s+)/).forEach(function (piece) {
        if (!piece) return;
        if (/^\s+$/.test(piece)) {
          node.insertBefore(document.createTextNode(' '), child);
          return;
        }
        var word = document.createElement('span');
        word.className = 'vp-word';
        for (var i = 0; i < piece.length; i++) {
          var ch = document.createElement('span');
          ch.className = 'vp-char';
          ch.textContent = piece.charAt(i);
          word.appendChild(ch);
          out.push(ch);
        }
        node.insertBefore(word, child);
      });
      node.removeChild(child);
    });
  }

  function initChars() {
    document.querySelectorAll('[data-anim="chars"]').forEach(function (el) {
      // This runs again on a language change. By then i18n has rewritten the heading, so
      // the spans are already gone and the fresh translation is what gets split. If they
      // are somehow still there, fall back to the markup stashed the first time round
      // rather than splitting a split.
      if (el.querySelector('.vp-word')) {
        el.innerHTML = el.getAttribute('data-split-src') || el.textContent;
      } else {
        el.setAttribute('data-split-src', el.innerHTML);
      }

      // A heading cut into single letters is read out letter by letter, so the whole
      // line goes on the element as a label and the pieces are hidden from the tree.
      el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());

      var chars = [];
      wrapLetters(el, chars);
      if (!chars.length) return;
      Array.prototype.forEach.call(el.querySelectorAll('.vp-word'), function (w) {
        w.setAttribute('aria-hidden', 'true');
      });

      // The heading itself carries no motion - only the letters inside it do - so it has
      // to be taken out of the hidden start state by hand.
      gsap.set(el, { autoAlpha: 1 });

      var tween = gsap.fromTo(chars,
        { yPercent: -128, rotate: -7, opacity: 0 },
        {
          yPercent: 0,
          rotate: 0,
          opacity: 1,
          duration: 0.78,
          // Overshoots a touch and settles, so each letter lands rather than slides.
          ease: 'back.out(1.5)',
          delay: parseFloat(el.getAttribute('data-anim-delay')) || 0.06,
          stagger: 0.028,
          paused: true
        });

      scrollPlay(tween, el);
    });
  }

  /* ------------------------------------------------------- counting figures */

  // "100K+" -> 100 with a "K+" tail, "4,8/5" -> 4.8 with a "/5" tail and a comma kept as
  // the decimal mark. Anything with no number in it is left alone.
  function parseFigure(text) {
    var m = text.match(/^(\D*?)(\d+(?:[.,]\d+)?)(.*)$/);
    if (!m) return null;
    var raw = m[2];
    var sep = raw.indexOf(',') > -1 ? ',' : '.';
    var decimals = raw.split(/[.,]/)[1] ? raw.split(/[.,]/)[1].length : 0;
    return { head: m[1], tail: m[3], value: parseFloat(raw.replace(',', '.')), sep: sep, decimals: decimals };
  }

  function renderFigure(figure, n) {
    return figure.head + n.toFixed(figure.decimals).replace('.', figure.sep) + figure.tail;
  }

  function initCounters() {
    document.querySelectorAll('[data-count]').forEach(function (el) {
      // The figure to count TO is remembered on the element. Without this a rebuild
      // would read back the zero this function itself wrote and animate 0 to 0 - which
      // is exactly what happens on load, because the language engine announces its
      // first pass after this file has already run once.
      var source = el.getAttribute('data-count-value');
      if (!source) {
        source = el.textContent.trim();
        el.setAttribute('data-count-value', source);
      }
      var figure = parseFigure(source);
      if (!figure) return;

      // The figure stays in the markup until the tween actually runs - its first frame
      // writes the zero. That keeps the real value in the DOM for anything else reading
      // it, and means a page with the animations disabled just shows the number.
      var state = { n: 0 };
      var tween = gsap.to(state, {
        n: figure.value,
        duration: 1.15,
        ease: 'power2.out',
        paused: true,
        onUpdate: function () { el.textContent = renderFigure(figure, state.n); }
      });

      scrollPlay(tween, el.closest('.vp-stat') || el);
    });
  }

  /* -------------------------------------------------------- generic reveals */

  function initReveals() {
    document.querySelectorAll('[data-anim]').forEach(function (el) {
      var name = el.getAttribute('data-anim') || 'up';
      if (name === 'chars') return;   // initChars handles these, letter by letter
      var delay = parseFloat(el.getAttribute('data-anim-delay')) || 0;
      var targets = el.hasAttribute('data-anim-group') ? Array.prototype.slice.call(el.children) : [el];
      if (!targets.length) return;

      gsap.killTweensOf(targets);   // this function runs again on a language change
      var tween = gsap.fromTo(targets, startVars(name), {
        autoAlpha: 1,
        x: 0,
        y: 0,
        scale: 1,
        rotateX: 0,
        duration: name === 'tilt' ? 0.85 : 0.7,
        ease: name === 'tilt' ? 'power3.out' : 'power2.out',
        delay: delay,
        stagger: targets.length > 1 ? 0.1 : 0,
        paused: true
      });

      scrollPlay(tween, el);
    });
  }

  /* -------------------------------------------------------------- parallax */

  function initParallax() {
    if (!desktop.matches) return;

    // The illustration and the card floating over it travel at different rates, which
    // gives the hero depth as you scroll.
    var layers = [
      ['.vp-hero__img', -52],
      ['.vp-reward-card', -96],
      ['.vp-hero__tag', -24]
    ];
    layers.forEach(function (pair) {
      var el = document.querySelector(pair[0]);
      if (!el) return;
      gsap.to(el, {
        y: pair[1],
        ease: 'none',
        scrollTrigger: { trigger: '.vp-hero', start: 'top top', end: 'bottom top', scrub: 0.6 }
      });
    });

    // The decorative circles drift too, slowly, over the whole page.
    var circles = document.querySelectorAll('.vp-circle');
    if (circles.length) {
      circles.forEach(function (c, i) {
        gsap.to(c, {
          y: (i % 2 ? 1 : -1) * (60 + (i % 3) * 40),
          ease: 'none',
          scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: 1.1 }
        });
      });
    }
  }

  /* --------------------------------------------------------- progress rail */

  function initProgress() {
    var bar = document.createElement('div');
    bar.className = 'vp-progress';
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);
    gsap.to(bar, {
      scaleX: 1,
      ease: 'none',
      scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: 0.3 }
    });
  }

  /* ------------------------------------------------------------------ boot */

  function build() {
    initChars();
    initCounters();
    initReveals();
    initParallax();
    initProgress();

    root.classList.add('vp-anim-ready');
    root.classList.remove('vp-anim');
    ScrollTrigger.refresh();
    playActive();
  }

  build();

  // Switching language rewrites the headings' innerHTML, which throws away the split
  // spans, and changes every height on the page. Rebuild the reveals - but leave the
  // parallax and the progress rail alone, since clearing those would leave the page
  // with no depth and a dead progress bar after the first language switch.
  document.addEventListener('vp:languagechange', function () {
    // A translated figure ("4.8/5" becomes "4,8/5") is now sitting in the element, so
    // take it as the new target - unless what is sitting there is a count this file
    // wound back to zero, which would otherwise become the new target.
    document.querySelectorAll('[data-count][data-i18n]').forEach(function (el) {
      var fresh = el.textContent.trim();
      var parsed = parseFigure(fresh);
      if (!parsed) return;
      var stored = parseFigure(el.getAttribute('data-count-value') || '');
      if (stored && fresh === renderFigure(stored, 0)) return;
      el.setAttribute('data-count-value', fresh);
    });

    triggers.forEach(function (t) { t.kill(); });
    tweens.forEach(function (t) { t.kill(); });
    triggers.length = 0;
    tweens.length = 0;

    initChars();
    initCounters();
    initReveals();
    ScrollTrigger.refresh();
    playActive();
  });

  // A refresh re-evaluates every trigger, and in doing so it winds anything already in
  // view back to its start. Re-assert those afterwards, or the hero would empty itself
  // the moment the webfonts land or the window is resized.
  ScrollTrigger.addEventListener('refresh', playActive);

  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
})();
