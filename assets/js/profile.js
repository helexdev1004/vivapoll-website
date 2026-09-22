/* VivaPoll – the profile screen's two dialogs.
 *
 * Both are Bootstrap modals, so opening, closing, Escape, the backdrop and the focus trap
 * need nothing from here. What is here is the part Bootstrap cannot know: which control a
 * field wants, and what the row should read afterwards.
 *
 * Nothing is sent anywhere. Saving changes what the row displays and no more - there is
 * no back end behind this yet, and a reload puts every field back as it was.
 */
(function () {
  'use strict';

  /* ------------------------------------------------ the password dialog's eyes */

  // The same `data-vp-toggle-password` attribute the sign-in and sign-up pages use, so
  // the markup reads the same wherever a password field appears. Their handler lives in
  // auth.js, which is not loaded here: it also carries the translated strings and the
  // sign-up validation, none of which the signed-in pages have or want.
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

  var passwordModal = document.getElementById('vpPasswordModal');
  if (passwordModal) {
    // Leaving should leave nothing behind: anything typed is cleared and every field goes
    // back to hidden, so the next open starts clean rather than showing a half-entry.
    passwordModal.addEventListener('hidden.bs.modal', function () {
      passwordModal.querySelectorAll('input').forEach(function (input) {
        input.value = '';
        input.type = 'password';
      });
      passwordModal.querySelectorAll('[data-vp-toggle-password]').forEach(function (btn) {
        btn.querySelector('i').className = 'bi bi-eye-slash';
        btn.setAttribute('aria-label', 'Show password');
        btn.setAttribute('aria-pressed', 'false');
      });
    });
  }

  /* --------------------------------------------------------- editing a field */

  var editModal = document.getElementById('vpEditModal');
  if (!editModal || !window.bootstrap) return;

  var GEO = window.VP_GEO || { COUNTRIES: [], REGIONS: {} };
  var modal = window.bootstrap.Modal.getOrCreateInstance(editModal);

  var title = editModal.querySelector('[data-edit-title]');
  var sub = editModal.querySelector('[data-edit-sub]');
  var icon = editModal.querySelector('[data-edit-icon]');
  var label = editModal.querySelector('[data-edit-label]');
  var holder = editModal.querySelector('[data-edit-control]');
  var hint = editModal.querySelector('[data-edit-hint]');
  var save = editModal.querySelector('[data-edit-save]');

  var openRow = null;

  function countryName(code) {
    try {
      return new Intl.DisplayNames(['en'], { type: 'region' }).of(code);
    } catch (e) {
      return code;
    }
  }

  // "1994-03-14" as a reader would write it. The date input needs the first form; the row
  // shows the second.
  function readableDate(iso) {
    var parts = String(iso).split('-');
    if (parts.length !== 3) return iso;
    var d = new Date(Date.UTC(+parts[0], +parts[1] - 1, +parts[2]));
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  }

  function row(kind) {
    return document.querySelector('[data-edit][data-kind="' + kind + '"]');
  }

  // The regions on offer depend on the country, and countries without a list get a single
  // option rather than an empty menu.
  function regionsFor(code) {
    return GEO.REGIONS[code] || ['Not applicable'];
  }

  function makeSelect(options, current) {
    var select = document.createElement('select');
    select.className = 'form-select vp-form-control vp-form-control--plain';
    select.id = 'vpEditInput';
    options.forEach(function (o) {
      var opt = document.createElement('option');
      opt.value = o.value;
      opt.textContent = o.text;
      if (o.value === current) opt.selected = true;
      select.appendChild(opt);
    });
    return select;
  }

  function makeInput(type, value, extra) {
    var input = document.createElement('input');
    input.type = type;
    input.className = 'form-control vp-form-control vp-form-control--plain';
    input.id = 'vpEditInput';
    input.value = value;
    Object.keys(extra || {}).forEach(function (k) { input.setAttribute(k, extra[k]); });
    return input;
  }

  function build(kind, value) {
    if (kind === 'choice') {
      var choices = (openRow.dataset.options || '').split('|').filter(Boolean);
      return makeSelect(choices.map(function (c) { return { value: c, text: c }; }), value);
    }

    if (kind === 'country') {
      var countries = GEO.COUNTRIES
        .map(function (code) { return { value: code, text: countryName(code) }; })
        .sort(function (a, b) { return a.text.localeCompare(b.text, 'en'); });
      return makeSelect(countries, value);
    }

    if (kind === 'region') {
      var countryRow = row('country');
      var code = countryRow ? countryRow.dataset.value : '';
      var list = regionsFor(code).map(function (r) { return { value: r, text: r }; });
      return makeSelect(list, value);
    }

    if (kind === 'date') {
      // Nobody on this product is under 16, and a birth date in the future is a typo.
      return makeInput('date', value, { max: new Date().toISOString().slice(0, 10) });
    }

    return makeInput('text', value, { maxlength: '60', autocomplete: 'off' });
  }

  var HINTS = {
    date: 'Surveys are matched on your age, so this needs to be right.',
    region: 'The regions on offer follow the country above.'
  };

  var ICONS = {
    text: 'bi bi-pencil',
    choice: 'bi bi-list-ul',
    country: 'bi bi-globe-americas',
    region: 'bi bi-map',
    date: 'bi bi-calendar-event'
  };

  document.querySelectorAll('[data-edit]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      openRow = btn;
      var kind = btn.dataset.kind;
      var name = btn.dataset.label;

      title.textContent = 'Edit ' + name.toLowerCase();
      sub.textContent = 'Used to match you with the right surveys.';
      icon.className = ICONS[kind] || ICONS.text;
      label.textContent = name;
      label.setAttribute('for', 'vpEditInput');

      holder.innerHTML = '';
      holder.appendChild(build(kind, btn.dataset.value));

      if (HINTS[kind]) {
        hint.textContent = HINTS[kind];
        hint.hidden = false;
      } else {
        hint.hidden = true;
      }

      modal.show();
    });
  });

  // Focus the control once the dialog has finished opening - before that it is not
  // focusable, and Bootstrap would take the focus back anyway.
  editModal.addEventListener('shown.bs.modal', function () {
    var control = editModal.querySelector('#vpEditInput');
    if (control) control.focus();
  });

  save.addEventListener('click', function () {
    var control = editModal.querySelector('#vpEditInput');
    if (!openRow || !control) return;

    var value = control.value.trim();
    if (!value) { control.focus(); return; }

    openRow.dataset.value = value;
    var shown = openRow.querySelector('[data-shown]');

    if (openRow.dataset.kind === 'country') {
      shown.textContent = countryName(value);

      // A region belongs to a country. When the country changes, a region from the old one
      // is no longer on offer, so it moves to the first of the new country's rather than
      // being left as something the form would not accept.
      var regionRow = row('region');
      if (regionRow) {
        var list = regionsFor(value);
        if (list.indexOf(regionRow.dataset.value) === -1) {
          regionRow.dataset.value = list[0];
          regionRow.querySelector('[data-shown]').textContent = list[0];
        }
      }
    } else if (openRow.dataset.kind === 'date') {
      shown.textContent = readableDate(value);
    } else {
      shown.textContent = value;
    }

    modal.hide();
  });
})();
