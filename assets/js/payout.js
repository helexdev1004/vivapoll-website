/* VivaPoll – the cash-out screen. Vanilla, and only on the page that has the dialog.
 *
 * One dialog serves all seven rewards and has two faces: the question, naming whichever
 * reward was chosen, and the answer. Bootstrap hands us the row that opened it, so the
 * markup does not have to carry seven near-identical dialogs that could drift apart.
 *
 * Nothing is sent anywhere - there is no back end behind this yet. The dialog says what
 * would happen, and says it in the same words the real one will.
 */
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
      // Repeated under the heading of the second face, so that after confirming it still
      // says what was confirmed - by then the question is gone.
      echo.textContent = reward.replace(/^an? /, '') + ', ' + sum;
    }

    // Always opens on the question, however it was left the last time.
    ask.hidden = false;
    done.hidden = true;
    modal.setAttribute('aria-labelledby', 'vpPayoutTitle');
  });

  confirm.addEventListener('click', function () {
    ask.hidden = true;
    done.hidden = false;
    // The dialog has been replaced underneath anyone reading it with a screen reader.
    // Renaming it and moving focus into the new face is what announces that.
    modal.setAttribute('aria-labelledby', 'vpPayoutDoneTitle');
    var close = modal.querySelector('[data-payout-close]');
    if (close) close.focus();
  });
})();
