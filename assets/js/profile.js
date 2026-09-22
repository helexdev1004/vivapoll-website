/* VivaPoll – the profile screen's password dialog.
 *
 * One job: the eye beside each password field. The dialog itself is Bootstrap's, so
 * opening, closing, Escape, the backdrop and the focus trap need nothing from here.
 *
 * The same `data-vp-toggle-password` attribute the sign-in and sign-up pages use, so the
 * markup reads the same wherever a password field appears. Their handler lives in
 * auth.js, which is not loaded here: that file also carries the translated strings and
 * the country and region logic, none of which the signed-in pages have or want.
 */
(function () {
  'use strict';

  document.querySelectorAll('[data-vp-toggle-password]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var input = document.getElementById(btn.dataset.vpTogglePassword);
      if (!input) return;

      var show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.querySelector('i').className = show ? 'bi bi-eye' : 'bi bi-eye-slash';
      btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
      btn.setAttribute('aria-pressed', String(show));
    });
  });

  // Leaving the dialog should leave nothing behind: anything typed is cleared, and every
  // field goes back to hidden, so the next open starts clean rather than showing what was
  // half-entered last time.
  var modal = document.getElementById('vpPasswordModal');
  if (!modal) return;

  modal.addEventListener('hidden.bs.modal', function () {
    modal.querySelectorAll('input[type="password"], input[type="text"]').forEach(function (input) {
      input.value = '';
      input.type = 'password';
    });
    modal.querySelectorAll('[data-vp-toggle-password]').forEach(function (btn) {
      btn.querySelector('i').className = 'bi bi-eye-slash';
      btn.setAttribute('aria-label', 'Show password');
      btn.setAttribute('aria-pressed', 'false');
    });
  });
})();
