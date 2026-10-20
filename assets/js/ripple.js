// Button ripples. Mouse only, skipped for reduced motion.
(function () {
  'use strict';

  var fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  var still = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!fine.matches || still.matches) return;

  var RIPPLES = '.vp-nav .nav-link, .vp-btn, .vp-btn-cta, .vp-lang__toggle, .vp-lang__menu .dropdown-item,' +
                ' .accordion-button, .vp-auth-submit, .vp-link-arrow, .vp-store-badge';

  document.addEventListener('pointerdown', function (e) {
    var host = e.target.closest && e.target.closest(RIPPLES);
    if (!host) return;

    // The ripple is absolutely positioned inside the button
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
