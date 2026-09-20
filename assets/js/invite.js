/* VivaPoll – the invite page's two buttons.
 *
 * Both are entirely the browser's own work: copying to the clipboard and opening the
 * share sheet need nothing from a server. Neither invents a referral that exists
 * anywhere; they hand over the code that is already on the page.
 */
(function () {
  'use strict';

  var codeEl = document.querySelector('[data-invite-code]');
  var copyBtn = document.querySelector('[data-invite-copy]');
  var shareBtn = document.querySelector('[data-invite-share]');
  var said = document.querySelector('[data-invite-said]');
  if (!codeEl) return;

  var code = codeEl.textContent.trim();
  var timer;

  function say(message) {
    if (!said) return;
    said.textContent = message;
    window.clearTimeout(timer);
    timer = window.setTimeout(function () { said.textContent = ''; }, 3200);
  }

  // navigator.clipboard is unavailable on an insecure origin and can be refused even on a
  // secure one, so the older selection trick is kept as a fallback rather than leaving the
  // button silently dead.
  function copy(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var field = document.createElement('textarea');
      field.value = text;
      field.setAttribute('readonly', '');
      field.style.position = 'fixed';
      field.style.opacity = '0';
      document.body.appendChild(field);
      field.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(field);
      ok ? resolve() : reject(new Error('copy refused'));
    });
  }

  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      copy(code).then(function () { say('Code copied'); },
                      function () { say('Press Ctrl+C to copy: ' + code); });
    });
  }

  if (shareBtn) {
    shareBtn.addEventListener('click', function () {
      var invite = new URL('signup.html', location.href).href;
      var text = 'Join me on VivaPoll and earn rewards for your opinions. My code is ' + code + '.';

      // The share sheet where there is one - phones, mostly - and the clipboard
      // everywhere else, which is what a desktop visitor can actually use.
      if (navigator.share) {
        navigator.share({ title: 'VivaPoll', text: text, url: invite })
          .catch(function () { /* dismissed; nothing to report */ });
        return;
      }
      copy(text + ' ' + invite).then(function () { say('Invite copied - paste it to a friend'); },
                                     function () { say('Your code is ' + code); });
    });
  }
})();
