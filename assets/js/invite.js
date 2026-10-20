// Invite page: copy link and share buttons (clipboard / Web Share, no backend).
(function () {
  'use strict';

  var linkEl = document.querySelector('[data-invite-link]');
  var codeEl = document.querySelector('[data-invite-code]');
  var copyBtn = document.querySelector('[data-invite-copy]');
  var shareBtn = document.querySelector('[data-invite-share]');
  var said = document.querySelector('[data-invite-said]');
  if (!linkEl && !codeEl) return;

  // Buttons share the link; the code is used in the share text
  var link = linkEl ? linkEl.textContent.trim() : '';
  var code = codeEl ? codeEl.textContent.trim() : '';
  var timer;

  function say(message) {
    if (!said) return;
    said.textContent = message;
    window.clearTimeout(timer);
    timer = window.setTimeout(function () { said.textContent = ''; }, 3200);
  }

  // navigator.clipboard needs a secure origin and can be denied, so fall back to execCommand
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
      var what = link || code;
      copy(what).then(function () { say(link ? 'Link copied' : 'Code copied'); },
                      function () { say('Press Ctrl+C to copy: ' + what); });
    });
  }

  if (shareBtn) {
    shareBtn.addEventListener('click', function () {
      var invite = link || new URL('signup.html', location.href).href;
      var text = 'Join me on VivaPoll and earn real rewards for your opinions.' +
                 (code ? ' My code is ' + code + '.' : '');

      // Native share sheet if available (mostly phones), clipboard otherwise
      if (navigator.share) {
        navigator.share({ title: 'VivaPoll', text: text, url: invite })
          .catch(function () { /* dismissed */ });
        return;
      }
      copy(text + ' ' + invite).then(function () { say('Invite copied - paste it to a friend'); },
                                     function () { say('Your link is ' + invite); });
    });
  }
})();
