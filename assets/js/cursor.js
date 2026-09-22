/* VivaPoll – pointer. Vanilla, no library, so it can run on every page.
 *
 *   · a faint rainbow wash follows the pointer: broad, soft, translucent pools that
 *     spread and drift apart like colour running through water, then fade. Deliberately
 *     slight - it should be noticed at the edge of attention, never compete with the
 *     page. The hue turns with distance travelled, so a sweep across the page draws the
 *     colour through the spectrum.
 *   · a blue glass bead sits on the pointer, collared in white so it stays legible
 *     over the pale page, over photographs and over the blue buttons alike
 *   · an outer ring trails behind, leaning and stretching along the direction of travel
 *   · the ring opens up over anything clickable
 *   · clicking bursts a puff of powder and throws a ring out from the point you pressed
 *
 * Only runs for a real mouse. Touch, pens and anyone who asked for reduced motion keep
 * the ordinary pointer and never load any of this.
 */
(function () {
  'use strict';

  var fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  var still = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!fine.matches || still.matches) return;

  var root = document.documentElement;

  function make(tag, cls) {
    var el = document.createElement(tag);
    el.className = cls;
    el.setAttribute('aria-hidden', 'true');
    document.body.appendChild(el);
    return el;
  }

  var canvas = make('canvas', 'vp-cursor-canvas');
  var ctx = canvas.getContext('2d');
  var dpr = Math.min(window.devicePixelRatio || 1, 2);

  function size() {
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    canvas.style.width = innerWidth + 'px';
    canvas.style.height = innerHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  size();
  addEventListener('resize', size);

  var ring = make('div', 'vp-cursor-ring');
  var core = make('div', 'vp-cursor-core');

  // The pointer itself: an arrow rather than a bead, filled with a lilac-to-cyan gradient
  // and outlined in white so it holds its shape over a photograph or a blue button as
  // well as over the pale page. Built here rather than in the markup so the fourteen
  // pages do not each carry a copy of it.
  //
  // The tip sits at (2,2) in the drawing, and the element is nudged by that much when it
  // is placed, so the point of the arrow is exactly the point being pointed at.
  core.innerHTML =
    '<svg viewBox="0 0 26 34" width="26" height="34" aria-hidden="true" focusable="false">' +
      '<defs>' +
        '<linearGradient id="vpCursorFill" x1="2" y1="2" x2="21" y2="30" gradientUnits="userSpaceOnUse">' +
          '<stop offset="0" stop-color="#cbb2ff" />' +
          '<stop offset="0.48" stop-color="#6ba6ff" />' +
          '<stop offset="1" stop-color="#3fd8ef" />' +
        '</linearGradient>' +
      '</defs>' +
      '<path d="M2 2 L2 27.4 L8.5 21.5 L12.5 31.1 L17.1 29.1 L13.2 19.8 L21.6 19.3 Z" ' +
            'fill="url(#vpCursorFill)" stroke="rgba(255,255,255,0.92)" stroke-width="1.7" ' +
            'stroke-linejoin="round" />' +
    '</svg>';

  /* --------------------------------------------------------------- the wash */

  // A fixed pool, reused round-robin. However hard you scribble, this is the ceiling.
  var MAX = 150;
  var pools = new Array(MAX);
  for (var i = 0; i < MAX; i++) pools[i] = { life: 0 };
  var next = 0;
  var hue = 0;

  // `arc` is how much of the spectrum this handful covers. The trail uses a narrow band
  // around the turning hue; a click opens it wider.
  function bleed(x, y, dx, dy, count, force, arc) {
    for (var n = 0; n < count; n++) {
      var g = pools[next];
      next = (next + 1) % MAX;

      // Drifting across the direction of travel as much as along it, so the colour opens
      // out behind the pointer rather than trailing in a single line.
      var spread = (Math.random() - 0.5) * 2;
      g.x = x + (Math.random() - 0.5) * 12;
      g.y = y + (Math.random() - 0.5) * 12;
      g.vx = dx * 0.07 + -dy * spread * 0.05 + (Math.random() - 0.5) * force;
      g.vy = dy * 0.07 + dx * spread * 0.05 + (Math.random() - 0.5) * force;
      g.size = 13 + Math.random() * 15;
      g.grow = 0.12 + Math.random() * 0.2;    // each pool keeps spreading as it fades
      g.hue = hue + (Math.random() - 0.5) * (arc || 44);
      g.life = 1;
      g.decay = 0.013 + Math.random() * 0.009;
    }
  }

  /* -------------------------------------------------------------- tracking */

  var pointer = { x: innerWidth / 2, y: innerHeight / 2 };
  var ringPos = { x: pointer.x, y: pointer.y };
  var last = { x: pointer.x, y: pointer.y };
  var speed = 0;
  var angle = 0;
  var bursts = [];
  var visible = false;

  document.addEventListener('mousemove', function (e) {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    if (!visible) { visible = true; root.classList.add('vp-cursor-on'); }
  }, { passive: true });

  document.addEventListener('mouseleave', function () {
    visible = false;
    root.classList.remove('vp-cursor-on');
  });
  document.addEventListener('mouseenter', function () {
    visible = true;
    root.classList.add('vp-cursor-on');
  });

  document.addEventListener('mousedown', function (e) {
    root.classList.add('vp-cursor-down');
    bursts.push({ x: e.clientX, y: e.clientY, t: performance.now() });
    bleed(e.clientX, e.clientY, 0, 0, 12, 1.6, 200);
  });
  document.addEventListener('mouseup', function () { root.classList.remove('vp-cursor-down'); });

  var ACTIONABLE = 'a, button, input, select, textarea, summary, [role="button"], [tabindex]:not([tabindex="-1"])';
  document.addEventListener('mouseover', function (e) {
    if (!e.target.closest) return;
    root.classList.toggle('vp-cursor-hot', !!e.target.closest(ACTIONABLE));
    // Over a text field the ordinary caret is more use than an orb.
    root.classList.toggle('vp-cursor-text', !!e.target.closest(
      'input[type="text"], input[type="email"], input[type="password"], input[type="date"], textarea'));
  }, { passive: true });

  /* ----------------------------------------------------------------- paint */

  function frame(now) {
    var dx = pointer.x - last.x;
    var dy = pointer.y - last.y;
    var step = Math.sqrt(dx * dx + dy * dy);
    speed += (Math.min(step, 70) - speed) * 0.2;
    if (step > 0.4) angle = Math.atan2(dy, dx) * 180 / Math.PI;
    last.x = pointer.x;
    last.y = pointer.y;

    // The hue turns with distance travelled, not just with time, so that one sweep
    // across the page crosses the whole spectrum however fast you make it - a slow drag
    // and a quick flick both lay down a rainbow rather than a single colour.
    hue = (hue + 1 + Math.min(step, 60) * 0.42) % 360;

    // Seeded along the segment the pointer covered since the last frame, not only where
    // it ended up. Without this a quick flick leaves a dotted line of blobs, one per
    // frame, instead of a continuous run of colour.
    if (visible && step > 1.2) {
      var drops = Math.min(Math.ceil(step / 14), 4);
      for (var s = 0; s < drops; s++) {
        var back = 1 - (s + 1) / drops;   // `last` has already been advanced, so step back
        bleed(pointer.x - dx * back, pointer.y - dy * back, dx, dy, 1, 0.5);
      }
    }

    ringPos.x += (pointer.x - ringPos.x) * 0.16;
    ringPos.y += (pointer.y - ringPos.y) * 0.16;

    ctx.clearRect(0, 0, innerWidth, innerHeight);

    // Ordinary alpha, not additive. The page is near-white, and additive blending would
    // wash the overlaps out to white against it - exactly where the colour is thickest.
    for (var k = 0; k < MAX; k++) {
      var g = pools[k];
      if (g.life <= 0) continue;

      g.x += g.vx;
      g.y += g.vy;
      g.vx *= 0.94;
      g.vy = g.vy * 0.94 + 0.012;    // barely any weight: it drifts, it does not fall
      g.size += g.grow;
      g.life -= g.decay;
      if (g.life <= 0) continue;

      // Very low alpha and no hard edge anywhere: each pool is almost invisible alone,
      // and only where several overlap does the colour gather. That is what reads as
      // water rather than as a sprayed dot.
      var fade = g.life * g.life;
      var r = g.size;
      var wash = ctx.createRadialGradient(g.x, g.y, 0, g.x, g.y, r);
      wash.addColorStop(0, 'hsla(' + g.hue + ', 90%, 62%, ' + (0.2 * fade).toFixed(3) + ')');
      wash.addColorStop(0.55, 'hsla(' + g.hue + ', 90%, 60%, ' + (0.1 * fade).toFixed(3) + ')');
      wash.addColorStop(1, 'hsla(' + g.hue + ', 90%, 58%, 0)');
      ctx.fillStyle = wash;
      ctx.beginPath();
      ctx.arc(g.x, g.y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Click rings, thrown outward and faded over three quarters of a second.
    for (var j = bursts.length - 1; j >= 0; j--) {
      var age = (now - bursts[j].t) / 720;
      if (age >= 1) { bursts.splice(j, 1); continue; }
      var ease = 1 - Math.pow(1 - age, 3);
      ctx.beginPath();
      ctx.arc(bursts[j].x, bursts[j].y, 8 + ease * 56, 0, Math.PI * 2);
      ctx.lineWidth = 1.6 * (1 - ease);
      ctx.strokeStyle = 'hsla(' + ((hue + 180) % 360) + ', 90%, 60%, ' + (0.3 * (1 - ease)).toFixed(3) + ')';
      ctx.stroke();
    }

    // Stretched along the direction of travel, squeezed across it - the faster the more
    // so, the way a drop of water deforms as it is flung. Kept shallow on purpose.
    var pull = Math.min(speed / 72, 0.3);
    // Not centred: an arrow points from its tip, so the drawing is pulled back by the
    // two pixels that sit between the element's corner and the point of the arrow.
    core.style.transform = 'translate3d(' + pointer.x + 'px,' + pointer.y + 'px,0) translate(-2px,-2px)';
    ring.style.transform =
      'translate3d(' + ringPos.x + 'px,' + ringPos.y + 'px,0) translate(-50%,-50%) ' +
      'rotate(' + angle + 'deg) scale(' + (1 + pull) + ',' + (1 - pull * 0.5) + ')';

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* ---------------------------------------------------------------- ripples */

  var RIPPLES = '.vp-nav .nav-link, .vp-btn, .vp-btn-cta, .vp-lang__toggle, .vp-lang__menu .dropdown-item,' +
                ' .accordion-button, .vp-auth-submit, .vp-link-arrow, .vp-store-badge';

  document.addEventListener('pointerdown', function (e) {
    var host = e.target.closest && e.target.closest(RIPPLES);
    if (!host) return;

    // The ripple is absolutely placed inside the control, so the control has to be a
    // containing block.
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
    host.classList.add('vp-rippling');

    var box = host.getBoundingClientRect();
    var r = Math.max(box.width, box.height) * 1.2;
    var ink = document.createElement('span');
    ink.className = 'vp-ripple';
    ink.style.width = ink.style.height = r + 'px';
    ink.style.left = (e.clientX - box.left - r / 2) + 'px';
    ink.style.top = (e.clientY - box.top - r / 2) + 'px';
    host.appendChild(ink);
    ink.addEventListener('animationend', function () { ink.remove(); });
  }, { passive: true });
})();
