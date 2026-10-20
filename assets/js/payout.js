// Cash-out dialog: confirm step, then the thank-you message.
// One modal for all rewards, filled from the row that opened it. No backend yet.
(function () {
  'use strict';

  var modal = document.getElementById('vpPayoutModal');
  if (!modal) return;

  var ask = modal.querySelector('[data-payout-ask]');
  var done = modal.querySelector('[data-payout-done]');
  var name = modal.querySelector('[data-payout-name]');
  var value = modal.querySelector('[data-payout-value]');
  var echo = modal.querySelector('[data-payout-echo]');
  var confirm = modal.querySelector('[data-payout-confirm]');
  if (!ask || !done || !confirm) return;

  modal.addEventListener('show.bs.modal', function (e) {
    var pick = e.relatedTarget;
    if (pick) {
      var reward = pick.getAttribute('data-reward') || '';
      var sum = pick.getAttribute('data-value') || '';
      name.textContent = reward;
      value.textContent = sum;
      // Keep the choice visible after confirming
      echo.textContent = reward.replace(/^an? /, '') + ', ' + sum;
    }

    // Always start on the confirm step
    ask.hidden = false;
    done.hidden = true;
    modal.setAttribute('aria-labelledby', 'vpPayoutTitle');
  });

  confirm.addEventListener('click', function () {
    ask.hidden = true;
    done.hidden = false;
    // Point aria-labelledby at the new title and move focus into it
    modal.setAttribute('aria-labelledby', 'vpPayoutDoneTitle');
    var close = modal.querySelector('[data-payout-close]');
    if (close) close.focus();
  });
})();
