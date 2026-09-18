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
 *   data-anim="up|down|left|right|zoom|fade|tilt|mask|focus|flip|swing|chars"
 *   data-anim-group      animate this element's children in sequence
 *   data-anim-delay="0.15"
 *   data-anim-stagger="0.14"   gap between a group's children
 *   data-anim-once       reveal once and never rewind (used by the legal pages)
 *   data-parallax="-70"  drift this far, tied to the scrollbar, the whole way past
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
    tilt:  { y: 38, rotateX: -32, transformOrigin: '50% 0%' },

    // Wiped in from its own bottom edge. The element is not moving into place behind a
    // hole in the page - it is being uncovered, which is why the inner shift is small.
    mask:  { yPercent: 6, clipPath: 'inset(100% 0% 0% 0%)' },
    // Arrives out of focus and slightly too large, the way a camera settles onto it.
    focus: { scale: 1.07, y: 26, filter: 'blur(16px)' },
    // Turned on its own vertical axis, seen at an angle. Rotated about its centre and
    // with no sideways offset on purpose: hinging on the left edge swings the right edge
    // toward the viewer, and perspective then projects it wider than its own column -
    // which puts the last card in a row over the edge of the page.
    flip:  { rotateY: -34, y: 24, transformOrigin: '50% 50%' },
    // Dropped and rocked upright on its base.
    swing: { rotate: -5, y: 54, scale: 0.94, transformOrigin: '50% 100%' }
  };

  // What each animated property has to be put back to. `to` is built from whatever the
  // preset actually touched, so a new preset needs no changes anywhere else.
  var NEUTRAL = {
    x: 0, y: 0, yPercent: 0, xPercent: 0,
    scale: 1, rotate: 0, rotateX: 0, rotateY: 0,
    clipPath: 'inset(0% 0% 0% 0%)',
    filter: 'blur(0px)'
  };

  function startVars(name) {
    var preset = FROM[name] || FROM.up;
    var vars = { autoAlpha: 0 };
    for (var k in preset) vars[k] = preset[k];
    return vars;
  }

  function endVars(name) {
    var preset = FROM[name] || FROM.up;
    var vars = { autoAlpha: 1 };
    for (var k in preset) {
      if (k === 'transformOrigin') continue;      // carried over, not reset
      if (k in NEUTRAL) vars[k] = NEUTRAL[k];
    }
    return vars;
  }

  // Narrow screens get the plain rise instead of anything sideways or three-dimensional:
  // a horizontal offset pushes a full-width column off the edge, and perspective effects
  // are wasted on a phone. Blur is dropped too - it is the most expensive of these to
  // paint, and least worth it at that size.
  function forWidth(name) {
    if (!narrow.matches) return name;
    if (name === 'left' || name === 'right' || name === 'tilt' ||
        name === 'flip' || name === 'focus') return 'up';
    return name;
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
        // Started as the element clears the bottom edge rather than at 88%, so it is
        // already most of the way in by the time the reader's eye reaches it. On a long
        // document that difference is what stops a quick scroll finding empty blocks.
        start: start || 'top 99%',
        end: end || 'bottom top',
        onEnter: play,
        onEnterBack: play,
        onLeave: play,
        onLeaveBack: play
      }));
      // Already scrolled past before this was even built - a reload partway down the
      // page, or a deep link.
      if (trigger.getBoundingClientRect().top < window.innerHeight * 0.99) tween.play();
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

  // How long each one wants to take, and how it should feel arriving. The dimensional
  // ones are given longer and allowed to overshoot; a wipe is given none, because a mask
  // that springs past its own edge tears.
  var SHAPE = {
    tilt:  { duration: 0.85, ease: 'power3.out' },
    flip:  { duration: 0.95, ease: 'power3.out' },
    swing: { duration: 0.9,  ease: 'back.out(1.4)' },
    focus: { duration: 0.85, ease: 'power2.out' },
    // Front-loaded on purpose. An in-out ease looks better in isolation but holds the
    // element near-blank for its first third, and on a long document that is exactly
    // when a fast scroll arrives at it - the reader meets an empty block. Easing out
    // puts most of the reveal in the first few frames.
    mask:  { duration: 0.68, ease: 'power2.out' },
    zoom:  { duration: 0.75, ease: 'back.out(1.2)' }
  };

  function initReveals() {
    document.querySelectorAll('[data-anim]').forEach(function (el) {
      var name = el.getAttribute('data-anim') || 'up';
      if (name === 'chars') return;   // initChars handles these, letter by letter
      name = forWidth(name);

      var delay = parseFloat(el.getAttribute('data-anim-delay')) || 0;
      // A child that animates itself is left out of its parent's group. Two tweens on one
      // element each reset only the properties their own preset touched, so the second to
      // run leaves the first's behind - a heading inside a `mask` group that also asked
      // for `up` came out fully clipped and stayed that way, invisible but at full
      // opacity. Whichever reveal the child asked for by name wins.
      var targets = el.hasAttribute('data-anim-group')
        ? Array.prototype.slice.call(el.children).filter(function (c) {
            return !c.hasAttribute('data-anim');
          })
        : [el];
      if (!targets.length) return;

      var shape = SHAPE[name] || { duration: 0.7, ease: 'power2.out' };
      var to = endVars(name);
      to.duration = shape.duration;
      to.ease = shape.ease;
      to.delay = delay;
      to.paused = true;
      // A row of cards arrives one after another rather than all at once. `data-anim-stagger`
      // overrides the gap where a particular group wants to be tighter or looser.
      to.stagger = targets.length > 1
        ? (parseFloat(el.getAttribute('data-anim-stagger')) || 0.1)
        : 0;

      gsap.killTweensOf(targets);   // this function runs again on a language change
      var tween = gsap.fromTo(targets, startVars(name), to);

      scrollPlay(tween, el);
    });
  }

  /* ------------------------------------------------------------- depth layers */

  // `data-parallax="-70"` ties an element's drift to the scrollbar itself rather than to
  // a trigger that fires once, so it keeps moving the whole time it is on screen. That
  // continuous link to the scroll is what separates this from a reveal.
  //
  // Never put this on the same element as `data-anim` - both write `y`, and the last one
  // to run wins. Put the reveal on a wrapper and the drift on what is inside it.
  function initDepth() {
    if (narrow.matches) return;
    document.querySelectorAll('[data-parallax]').forEach(function (el) {
      var dist = parseFloat(el.getAttribute('data-parallax'));
      if (!dist) return;
      gsap.to(el, {
        y: dist,
        ease: 'none',
        scrollTrigger: {
          trigger: el.closest('section') || el,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 0.8
        }
      });
    });
  }

  /* ------------------------------------------------------------- pinned steps */

  // The four steps stop being a row you scroll past and become a sequence you drive: the
  // section holds still while each card comes forward in turn, the others dropping back
  // and dimming behind it. Tied to the scrollbar, so it moves exactly as fast as you do
  // and reverses when you scroll back.
  //
  // Built through gsap.matchMedia so that it exists only on wide screens and is torn down
  // properly - pin leaves spacing and inline styles behind, and unwinding that by hand on
  // every resize is how pinned sections come apart.
  function initPinnedSteps() {
    var section = document.querySelector('.vp-how');
    if (!section) return;
    var cards = section.querySelectorAll('.vp-step');
    if (cards.length < 2) return;

    gsap.matchMedia().add('(min-width: 1200px) and (min-height: 640px)', function () {
      // The reveal animates the list items; this animates the cards inside them. Two
      // different elements on purpose - both writing a transform to one element would
      // mean whichever ran last silently won.
      // Fresh objects every time, never one shared constant. GSAP writes its own
      // bookkeeping into the vars object it is handed, so passing the same one to several
      // tweens contaminates them - the duration collapses and the cards snap between
      // states instead of moving between them.
      function back() { return { scale: 0.95, opacity: 0.55, y: 12 }; }
      function fore() { return { scale: 1.05, opacity: 1, y: -10 }; }

      // The first card is already forward before the section pins, so it arrives lit
      // rather than as a row of four dimmed cards waiting to be told what to do. Each
      // handover then costs one unit of the timeline, and the last card is left out.
      gsap.set(cards, back());
      gsap.set(cards[0], fore());

      var tl = gsap.timeline({
        defaults: { ease: 'power1.inOut', duration: 1 },
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: '+=' + ((cards.length - 1) * 58) + '%',
          pin: true,
          pinSpacing: true,
          scrub: 0.6,
          invalidateOnRefresh: true
        }
      });

      for (var i = 1; i < cards.length; i++) {
        tl.to(cards[i - 1], back(), i - 1)
          .to(cards[i], fore(), i - 1);
      }

      return function () {
        // Put the cards back exactly as the stylesheet left them when the query stops
        // matching, so a narrow window never inherits a half-played sequence.
        gsap.set(cards, { clearProps: 'all' });
      };
    });
  }

  /* ------------------------------------------------------------- section rail */

  // A fixed index down the side of the page: one mark per section, the current one lit,
  // its line filling as you travel through it. It is built from the markup rather than
  // written out by hand, so adding a section to the page adds it here too.
  function initRail() {
    var sections = document.querySelectorAll('[data-section-label]');
    if (sections.length < 2 || !desktop.matches) return false;

    var rail = document.createElement('nav');
    rail.className = 'vp-rail';
    rail.setAttribute('aria-label', 'Page sections');

    Array.prototype.forEach.call(sections, function (section, i) {
      var item = document.createElement('button');
      item.type = 'button';
      item.className = 'vp-rail__item';
      item.innerHTML =
        '<span class="vp-rail__num">' + (i < 9 ? '0' : '') + (i + 1) + '</span>' +
        '<span class="vp-rail__track"><span class="vp-rail__fill"></span></span>' +
        '<span class="vp-rail__label"></span>';
      item.querySelector('.vp-rail__label').textContent = section.getAttribute('data-section-label');
      item.addEventListener('click', function () {
        window.scrollTo({ top: section.offsetTop - 70, behavior: 'smooth' });
      });
      rail.appendChild(item);

      var fill = item.querySelector('.vp-rail__fill');
      ScrollTrigger.create({
        trigger: section,
        start: 'top 60%',
        end: 'bottom 60%',
        onUpdate: function (self) { fill.style.transform = 'scaleY(' + self.progress.toFixed(3) + ')'; },
        onToggle: function (self) { item.classList.toggle('is-active', self.isActive); }
      });
    });

    document.body.appendChild(rail);
    return true;
  }

  /* ------------------------------------------------------------ magnetic keys */

  // The main call to action leans toward the pointer as it comes near, and springs back
  // when it leaves. Mouse only - there is no hover on a touch screen to lean into.
  function initMagnets() {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    document.querySelectorAll('.vp-btn-cta, .vp-auth-submit, .vp-support-contact__btn').forEach(function (el) {
      var pull = 0.28;
      el.addEventListener('mousemove', function (e) {
        var b = el.getBoundingClientRect();
        gsap.to(el, {
          x: (e.clientX - (b.left + b.width / 2)) * pull,
          y: (e.clientY - (b.top + b.height / 2)) * pull,
          duration: 0.4,
          ease: 'power3.out',
          overwrite: 'auto'
        });
      });
      el.addEventListener('mouseleave', function () {
        gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)', overwrite: 'auto' });
      });
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
    initDepth();
    initPinnedSteps();
    initMagnets();
    // The side index says everything the thin bar at the top said and more, so the bar
    // is only built where there is no index to replace it.
    if (!initRail()) initProgress();

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

    // The section index is left standing, but its labels have just been translated.
    var labels = document.querySelectorAll('[data-section-label]');
    document.querySelectorAll('.vp-rail__label').forEach(function (el, i) {
      if (labels[i]) el.textContent = labels[i].getAttribute('data-section-label');
    });

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
