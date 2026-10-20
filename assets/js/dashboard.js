// Dashboard: swap the list heading when the category tab changes.
// Each tab button has the heading in data-title.
(function () {
  'use strict';

  var heading = document.querySelector('[data-offers-title]');
  var pills = document.querySelectorAll('.vp-segment[data-title]');
  if (!heading || !pills.length) return;

  function apply(pill) {
    var text = pill.getAttribute('data-title');
    if (text) heading.textContent = text;
  }

  Array.prototype.forEach.call(pills, function (pill) {
    // shown.bs.tab fires after the pane is visible
    pill.addEventListener('shown.bs.tab', function () { apply(pill); });
    if (pill.classList.contains('active')) apply(pill);
  });

  // --- open a tab from the URL hash ---

  // e.g. dashboard.html#surveys (used by the survey outcome pages).
  // Only these four names are accepted.
  var PANES = { you: 'vp-seg-you', surveys: 'vp-seg-surveys', profiling: 'vp-seg-profiling', games: 'vp-seg-games' };

  var asked = PANES[(window.location.hash || '').replace('#', '')];
  if (!asked || !window.bootstrap) return;

  var pill = document.getElementById(asked);
  if (!pill || pill.classList.contains('active')) return;

  window.bootstrap.Tab.getOrCreateInstance(pill).show();
  // Scroll the tabs into view
  document.querySelector('.vp-segments').scrollIntoView({ block: 'center', behavior: 'smooth' });
})();
