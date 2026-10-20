// Scroll animations (GSAP + ScrollTrigger). Skipped when GSAP is missing or reduced motion is on.
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
  // Reveals, headings and counters - rebuilt on language change (parallax and rail aren't)
  var triggers = [];
  var tweens = [];

  // --- helpers ---

  var DIST = 46;
  var FROM = {
    up:    { y: DIST },
    down:  { y: -DIST },
    left:  { x: -DIST },
    right: { x: DIST },
    zoom:  { scale: 0.9 },
    fade:  {},
    // hinged on the top edge
    tilt:  { y: 38, rotateX: -32, transformOrigin: '50% 0%' },

    // wipe up from the bottom edge
    mask:  { yPercent: 6, clipPath: 'inset(100% 0% 0% 0%)' },
    // comes into focus
    focus: { scale: 1.07, y: 26, filter: 'blur(16px)' },
    // rotate around the centre - hinging on an edge pushed the last card off the page
    flip:  { rotateY: -34, y: 24, transformOrigin: '50% 50%' },
    // drop and rock upright
    swing: { rotate: -5, y: 54, scale: 0.94, transformOrigin: '50% 100%' }
  };

  // Values to animate back to. `to` only gets what the preset actually set
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

  // Phones: plain rise only (no sideways, 3D or blur)
  function forWidth(name) {
    if (!narrow.matches) return name;
    if (name === 'left' || name === 'right' || name === 'tilt' ||
        name === 'flip' || name === 'focus') return 'up';
    return name;
  }

  // Tweens are played by hand from the callbacks - toggleActions on a .from() won't resume after a reverse
  // Triggers already in view on load never get onEnter, so play them here
  function playActive() {
    triggers.forEach(function (trigger, i) {
      if (trigger.isActive && tweens[i]) tweens[i].play();
    });
  }

  function scrollPlay(tween, trigger, start, end) {
    // Already on screen at load: play once and skip ScrollTrigger (a refresh would rewind it)
    var box = trigger.getBoundingClientRect();
    if (window.scrollY < 4 && box.top < window.innerHeight * 0.92) {
      tween.play();
      return;
    }

    // data-anim-once: reveal once and leave it (used on the legal pages)
    var once = !!(trigger.hasAttribute && trigger.hasAttribute('data-anim-once'));
    var play = function () { tween.play(); };

    tweens.push(tween);

    if (once) {
      // Play on every crossing - a fast scroll can jump straight to onLeave
      triggers.push(ScrollTrigger.create({
        trigger: trigger,
        // start right at the bottom edge so fast scrolling doesn't hit empty blocks
        start: start || 'top 99%',
        end: end || 'bottom top',
        onEnter: play,
        onEnterBack: play,
        onLeave: play,
        onLeaveBack: play
      }));
      // already scrolled past (reload mid-page, deep link)
      if (trigger.getBoundingClientRect().top < window.innerHeight * 0.99) tween.play();
      return;
    }

    triggers.push(ScrollTrigger.create({
      trigger: trigger,
      start: start || 'top 88%',
      // 'bottom top' so short elements don't rewind while still visible
      end: end || 'bottom top',
      onEnter: play,
      onEnterBack: play,
      onLeave: function () { tween.reverse(); },
      onLeaveBack: function () { tween.reverse(); }
    }));
  }

  // --- falling letters ---

  // Each letter gets a span inside a clipping word box, then they drop in one by one.
  // Walks the existing nodes so the <br> and the blue span survive.
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
      // Runs again on language change - restore the original markup if the spans are still there
      if (el.querySelector('.vp-word')) {
        el.innerHTML = el.getAttribute('data-split-src') || el.textContent;
      } else {
        el.setAttribute('data-split-src', el.innerHTML);
      }

      // Screen readers get the whole line, not single letters
      el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());

      var chars = [];
      wrapLetters(el, chars);
      if (!chars.length) return;
      Array.prototype.forEach.call(el.querySelectorAll('.vp-word'), function (w) {
        w.setAttribute('aria-hidden', 'true');
      });

      // the heading itself doesn't animate, just show it
      gsap.set(el, { autoAlpha: 1 });

      var tween = gsap.fromTo(chars,
        { yPercent: -128, rotate: -7, opacity: 0 },
        {
          yPercent: 0,
          rotate: 0,
          opacity: 1,
          duration: 0.78,
          // slight overshoot
          ease: 'back.out(1.5)',
          delay: parseFloat(el.getAttribute('data-anim-delay')) || 0.06,
          stagger: 0.028,
          paused: true
        });

      scrollPlay(tween, el);
    });
  }

  // --- counting figures ---

  // "100K+" -> 100 + "K+", "4,8/5" -> 4.8 + "/5" (comma kept). No number = left alone.
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
      // Remember the target, otherwise a rebuild reads back the 0 and animates 0 -> 0
      var source = el.getAttribute('data-count-value');
      if (!source) {
        source = el.textContent.trim();
        el.setAttribute('data-count-value', source);
      }
      var figure = parseFigure(source);
      if (!figure) return;

      // Real value stays in the DOM until the tween starts
      var state = { n: 0 };
      var tween = gsap.to(state, {
        n: figure.value,
        // power1.out so it doesn't crawl at the end
        duration: parseFloat(el.getAttribute('data-count-duration')) || 2.2,
        ease: 'power1.out',
        // start with the card's own delay
        delay: parseFloat(el.getAttribute('data-anim-delay')) || 0,
        paused: true,
        onUpdate: function () { el.textContent = renderFigure(figure, state.n); }
      });

      scrollPlay(tween, el.closest('.vp-stat') || el);
    });
  }

  // --- generic reveals ---

  // Duration / ease per preset. No overshoot on mask, it tears
  var SHAPE = {
    tilt:  { duration: 0.85, ease: 'power3.out' },
    flip:  { duration: 0.95, ease: 'power3.out' },
    swing: { duration: 0.9,  ease: 'back.out(1.4)' },
    focus: { duration: 0.85, ease: 'power2.out' },
    // ease-out so most of the reveal happens early
    mask:  { duration: 0.68, ease: 'power2.out' },
    zoom:  { duration: 0.75, ease: 'back.out(1.2)' }
  };

  function initReveals() {
    document.querySelectorAll('[data-anim]').forEach(function (el) {
      var name = el.getAttribute('data-anim') || 'up';
      if (name === 'chars') return;   // handled by initChars
      name = forWidth(name);

      var delay = parseFloat(el.getAttribute('data-anim-delay')) || 0;
      // Children with their own data-anim are left out of the group, otherwise the two tweens fight
      var targets = el.hasAttribute('data-anim-group')
        ? Array.prototype.slice.call(el.children).filter(function (c) {
            return !c.hasAttribute('data-anim');
          })
        : [el];
      if (!targets.length) return;

      var shape = SHAPE[name] || { duration: 0.7, ease: 'power2.out' };
      var to = endVars(name);
      // data-anim-duration overrides the preset
      to.duration = parseFloat(el.getAttribute('data-anim-duration')) || shape.duration;
      to.ease = shape.ease;
      to.delay = delay;
      to.paused = true;
      // stagger groups, data-anim-stagger overrides the gap
      to.stagger = targets.length > 1
        ? (parseFloat(el.getAttribute('data-anim-stagger')) || 0.1)
        : 0;

      gsap.killTweensOf(targets);   // runs again on language change
      var tween = gsap.fromTo(targets, startVars(name), to);

      scrollPlay(tween, el);
    });
  }

  // --- depth layers ---

  // data-parallax="-70": drift tied to the scroll position.
  // Don't put it on the same element as data-anim (both set y) - use a wrapper
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

  // Pin below the sticky header, measured from the header itself
  function pinStart() {
    var header = document.querySelector('.vp-header');
    var h = header ? Math.round(header.getBoundingClientRect().height) : 0;
    return 'top ' + h + 'px';
  }

  // --- held stats ---

  // Hold the stats section while the numbers count up.
  // Pin length is scroll distance: ~1.5 screens is about 2s of normal scrolling
  function initPinnedStats() {
    var section = document.querySelector('.vp-stats');
    if (!section) return;

    gsap.matchMedia().add('(min-width: 1200px) and (min-height: 640px)', function () {
      var list = section.querySelector('.vp-stats__list');
      var cards = Array.prototype.slice.call(section.querySelectorAll('.vp-stat'));
      var icons = Array.prototype.slice.call(section.querySelectorAll('.vp-stat__img'));

      // Keep something moving during the hold so it doesn't feel stuck
      var tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: pinStart,
          end: function () { return '+=' + Math.round(window.innerHeight * 1.5); },
          pin: true,
          pinSpacing: true,
          scrub: 0.5,
          invalidateOnRefresh: true
        }
      });

      // the row drifts the whole time (this moves the list, the reveal moves its children)
      if (list) tl.fromTo(list, { y: 38 }, { y: -38, ease: 'none', duration: 4 }, 0);

      // then a wave across the cards
      cards.forEach(function (card, i) {
        // spaced so the last card settles right at the end of the hold
        var at = i * 0.85;
        tl.to(card, { y: -24, scale: 1.045, duration: 0.55, ease: 'power2.out' }, at)
          .to(card, { y: 0, scale: 1, duration: 0.8, ease: 'power2.inOut' }, at + 0.55);
        if (icons[i]) {
          tl.to(icons[i], { scale: 1.2, rotate: -7, duration: 0.55, ease: 'back.out(2)' }, at)
            .to(icons[i], { scale: 1, rotate: 0, duration: 0.8, ease: 'power2.inOut' }, at + 0.55);
        }
      });

      return function () {
        if (list) gsap.set(list, { clearProps: 'all' });
        if (cards.length) gsap.set(cards, { clearProps: 'all' });
        if (icons.length) gsap.set(icons, { clearProps: 'all' });
      };
    });
  }

  // --- pinned steps ---

  // Hold the section and bring each step forward in turn (scrubbed).
  // gsap.matchMedia so it only exists on desktop and cleans up on resize
  function initPinnedSteps() {
    var section = document.querySelector('.vp-how');
    if (!section) return;
    var cards = section.querySelectorAll('.vp-step');
    if (cards.length < 2) return;

    gsap.matchMedia().add('(min-width: 1200px) and (min-height: 640px)', function () {
      // This animates the cards, the reveal animates the li's - never both on one element
      // New object every time - GSAP mutates the vars object it's given
      function back() { return { scale: 0.95, opacity: 0.55, y: 12 }; }
      function fore() { return { scale: 1.05, opacity: 1, y: -10 }; }

      // First card starts forward, the last one has no handover
      gsap.set(cards, back());
      gsap.set(cards[0], fore());

      var tl = gsap.timeline({
        defaults: { ease: 'power1.inOut', duration: 1 },
        scrollTrigger: {
          trigger: section,
          start: pinStart,
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
        // reset when the media query stops matching
        gsap.set(cards, { clearProps: 'all' });
      };
    });
  }

  // --- travelling quotes ---

  // Desktop: pin the section and move the quote rail sideways with the scroll.
  // Otherwise it's a normal swipeable strip.
  function initQuoteRail() {
    var rail = document.querySelector('[data-quote-rail]');
    if (!rail) return;
    var track = rail.querySelector('[data-quote-track]');
    var meter = rail.querySelector('[data-quote-meter]');
    var cards = track ? track.querySelectorAll('.vp-quote') : [];
    if (!track || cards.length < 2) return;

    var section = rail.closest('section') || rail;

    gsap.matchMedia().add('(min-width: 1200px) and (min-height: 640px)', function () {
      rail.classList.add('vp-quotes--driven');

      // Padding so the first and last cards can reach the centre
      function pad() {
        var gap = Math.max(0, (rail.clientWidth - cards[0].getBoundingClientRect().width) / 2);
        track.style.paddingLeft = gap + 'px';
        track.style.paddingRight = gap + 'px';
      }
      pad();

      // Distance for the last card to reach the centre, measured off the card itself
      function travel() {
        var was = gsap.getProperty(track, 'x') || 0;
        gsap.set(track, { x: 0 });
        var last = cards[cards.length - 1].getBoundingClientRect();
        var box = rail.getBoundingClientRect();
        var d = (last.left + last.width / 2) - (box.left + box.width / 2);
        gsap.set(track, { x: was });
        return Math.max(0, d);
      }

      // only the middle card is lit
      gsap.set(cards, { scale: 0.94, opacity: 0.55 });
      gsap.set(cards[0], { scale: 1, opacity: 1 });

      var tween = gsap.to(track, {
        x: function () { return -travel(); },
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: pinStart,
          end: function () { return '+=' + (travel() + window.innerHeight * 0.4); },
          pin: true,
          pinSpacing: true,
          scrub: 0.6,
          invalidateOnRefresh: true,
          onRefresh: pad,
          onUpdate: function (self) {
            if (meter) meter.style.transform = 'scaleX(' + Math.max(0.06, self.progress).toFixed(3) + ')';

            // centre of the rail, not the window
            var rb = rail.getBoundingClientRect();
            var mid = rb.left + rb.width / 2;
            var best = 0;
            var bestGap = Infinity;
            for (var i = 0; i < cards.length; i++) {
              var b = cards[i].getBoundingClientRect();
              var gap = Math.abs(b.left + b.width / 2 - mid);
              if (gap < bestGap) { bestGap = gap; best = i; }
            }
            for (var j = 0; j < cards.length; j++) {
              gsap.to(cards[j], {
                scale: j === best ? 1 : 0.94,
                opacity: j === best ? 1 : 0.55,
                duration: 0.35,
                ease: 'power2.out',
                overwrite: 'auto'
              });
            }
          }
        }
      });

      return function () {
        rail.classList.remove('vp-quotes--driven');
        track.style.paddingLeft = '';
        track.style.paddingRight = '';
        gsap.set(track, { clearProps: 'all' });
        gsap.set(cards, { clearProps: 'all' });
        if (meter) meter.style.transform = '';
        tween.kill();
      };
    });
  }

  // --- section rail ---

  // Fixed index on the side, built from the [data-section-label] sections.
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
      // Measure from the pin spacer if there is one - a pinned section's offsetTop is 0
      item.addEventListener('click', function () {
        var box = section.closest('.pin-spacer') || section;
        var header = document.querySelector('.vp-header');
        var clear = header ? header.getBoundingClientRect().height : 0;
        window.scrollTo({
          top: Math.max(0, box.getBoundingClientRect().top + window.scrollY - clear - 8),
          behavior: 'smooth'
        });
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

  // --- she looks up ---

  // Hero illustration turns toward the pointer when it's close.
  // quickTo re-aims one tween instead of stacking new ones on every mousemove
  function initGaze() {
    var stage = document.querySelector('.vp-hero__stage');
    if (!stage || !desktop.matches) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    var img = stage.querySelector('.vp-hero__img');
    var card = stage.querySelector('.vp-reward-card');

    // rotationY, not rotateY - quickTo doesn't map the alias
    var set = {
      rotY: gsap.quickTo(stage, 'rotationY', { duration: 0.8, ease: 'power3.out' }),
      rotX: gsap.quickTo(stage, 'rotationX', { duration: 0.8, ease: 'power3.out' }),
      x:    gsap.quickTo(stage, 'x',         { duration: 0.8, ease: 'power3.out' }),
      y:    gsap.quickTo(stage, 'y',         { duration: 0.8, ease: 'power3.out' })
    };
    // parallax already uses y, so this uses xPercent
    var lead = img ? gsap.quickTo(img, 'xPercent', { duration: 1, ease: 'power3.out' }) : null;
    var trail = card ? gsap.quickTo(card, 'xPercent', { duration: 1.25, ease: 'power3.out' }) : null;

    function rest() {
      set.rotY(0); set.rotX(0); set.x(0); set.y(0);
      if (lead) lead(0);
      if (trail) trail(0);
    }

    function aim(e) {
      var b = stage.getBoundingClientRect();
      if (!b.width) return;
      var dx = (e.clientX - (b.left + b.width / 2)) / (b.width / 2);
      var dy = (e.clientY - (b.top + b.height / 2)) / (b.height / 2);

      // full effect near her, fades out about a figure's width away
      var reach = Math.min(1, Math.max(0, (2.3 - Math.sqrt(dx * dx + dy * dy)) / 1.3));
      var k = reach * reach;
      if (!k) { rest(); return; }

      var cl = gsap.utils.clamp;
      set.rotY(cl(-11, 11, dx * 10 * k));
      set.rotX(cl(-8, 8, -dy * 7 * k));
      set.x(cl(-14, 14, dx * 12 * k));
      set.y(cl(-9, 9, dy * 7 * k));
      if (lead) lead(cl(-2.2, 2.2, dx * 1.8 * k));
      if (trail) trail(cl(-1.6, 1.6, dx * -1.2 * k));
    }

    window.addEventListener('mousemove', aim, { passive: true });
    document.addEventListener('mouseleave', rest);
  }

  // --- magnetic keys ---

  // Main CTA leans toward the pointer (mouse only)
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

  // --- parallax ---

  function initParallax() {
    if (!desktop.matches) return;

    // illustration and card move at different speeds
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

    // background circles drift slowly
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

  // --- progress rail ---

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

  // --- boot ---

  function build() {
    initChars();
    initCounters();
    initReveals();
    initParallax();
    initDepth();
    initPinnedSteps();
    initPinnedStats();
    initQuoteRail();
    initGaze();
    initMagnets();
    // Top progress bar only when there's no section rail
    if (!initRail()) initProgress();

    root.classList.add('vp-anim-ready');
    root.classList.remove('vp-anim');
    ScrollTrigger.refresh();
    playActive();
  }

  build();

  // Language change rewrites the headings and changes heights, so rebuild the reveals (parallax and rail stay)
  document.addEventListener('vp:languagechange', function () {
    // Use the translated figure as the new target, unless it's our own reset 0
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

    // Rail labels were just translated
    var labels = document.querySelectorAll('[data-section-label]');
    document.querySelectorAll('.vp-rail__label').forEach(function (el, i) {
      if (labels[i]) el.textContent = labels[i].getAttribute('data-section-label');
    });

    ScrollTrigger.refresh();
    playActive();
  });

  // A refresh rewinds anything in view (fonts loading, resize), so play it again
  ScrollTrigger.addEventListener('refresh', playActive);

  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
})();
