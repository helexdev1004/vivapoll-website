// Profile page: password dialog and the field edit dialog.
// Bootstrap handles the modals; this only builds the right input and updates the row.
// Nothing is saved yet (no backend) - a reload resets the values.
(function () {
  'use strict';

  // --- password dialog ---

  // Same data-vp-toggle-password as the auth pages (auth.js isn't loaded here)
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
    // Clear the fields and re-hide them when the dialog closes
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

  // --- edit dialog ---

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

  // "1994-03-14" -> "14 March 1994" for the row
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

  // Countries without a region list get a single option
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
      // No future dates
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

  // Focus after the dialog has opened (Bootstrap moves focus before that)
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

      // Changing the country resets the region to the new country's first one
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
