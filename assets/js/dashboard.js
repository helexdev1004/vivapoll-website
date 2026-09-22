/* VivaPoll dashboard – the small amount of behaviour this page owns.
 *
 * The category pills are Bootstrap's, and the panes switch on their own. The heading
 * above them does not: it read "Featured Offers" over a list of surveys, which is the
 * wrong label for everything except the first tab. Each pill carries the heading its
 * own pane should sit under, and this swaps it as the tab changes.
 */
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
    // Bootstrap announces the change after the pane is actually shown, so the heading
    // and the list never disagree, even mid-transition.
    pill.addEventListener('shown.bs.tab', function () { apply(pill); });
    if (pill.classList.contains('active')) apply(pill);
  });

  /* ---------------------------------------------- arriving on a particular tab */

  // Another page can send someone straight to one of these lists - the "you did not
  // qualify" screen sends them to the surveys - by naming the pane in the address:
  // dashboard.html#surveys. Only the four names below are accepted, so a stray hash
  // cannot point this at some other element on the page.
  var PANES = { you: 'vp-seg-you', surveys: 'vp-seg-surveys', profiling: 'vp-seg-profiling', games: 'vp-seg-games' };

  var asked = PANES[(window.location.hash || '').replace('#', '')];
  if (!asked || !window.bootstrap) return;

  var pill = document.getElementById(asked);
  if (!pill || pill.classList.contains('active')) return;

  window.bootstrap.Tab.getOrCreateInstance(pill).show();
  // The tabs sit some way down the page, so bring them into view rather than leaving the
  // reader at the top wondering what changed.
  document.querySelector('.vp-segments').scrollIntoView({ block: 'center', behavior: 'smooth' });
})();
