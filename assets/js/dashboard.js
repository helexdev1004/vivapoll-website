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
})();
