/* VivaPoll – Log in / Sign up page behaviour (frontend only, no backend). */
(function () {
  // The two lists live in geo.js so the profile screen can offer the same ones.
  const COUNTRIES = (window.VP_GEO || {}).COUNTRIES || [];
  const REGIONS = (window.VP_GEO || {}).REGIONS || {};

  const MIN_AGE = 16;

  function currentLang() {
    return document.documentElement.lang || 'en';
  }

  function t(key, fallback) {
    const lang = currentLang();
    const page = (window.VP_I18N_PAGE || {})[lang] || {};
    const base = (window.VP_I18N || {})[lang] || {};
    return page[key] || base[key] || fallback;
  }

  // ---------- Password visibility ----------
  document.querySelectorAll('[data-vp-toggle-password]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.vpTogglePassword);
      if (!input) return;
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.querySelector('i').className = show ? 'bi bi-eye' : 'bi bi-eye-slash';
      btn.setAttribute('aria-label', show ? t('auth.hidePassword', 'Hide password') : t('auth.showPassword', 'Show password'));
      btn.setAttribute('aria-pressed', String(show));
    });
  });

  // ---------- Country and region selects ----------
  const countrySelect = document.getElementById('vpCountry');
  const regionSelect = document.getElementById('vpRegion');

  function countryName(code) {
    try {
      return new Intl.DisplayNames([currentLang()], { type: 'region' }).of(code);
    } catch (e) {
      return code;
    }
  }

  function renderCountries() {
    if (!countrySelect) return;
    const selected = countrySelect.value;
    const placeholder = countrySelect.querySelector('option[value=""]');
    countrySelect.querySelectorAll('option:not([value=""])').forEach((o) => o.remove());
    COUNTRIES
      .map((code) => ({ code, name: countryName(code) }))
      .sort((a, b) => a.name.localeCompare(b.name, currentLang()))
      .forEach(({ code, name }) => {
        const opt = document.createElement('option');
        opt.value = code;
        opt.textContent = name;
        countrySelect.appendChild(opt);
      });
    if (selected) countrySelect.value = selected;
    else if (placeholder) placeholder.selected = true;
  }

  function renderRegions() {
    if (!regionSelect || !countrySelect) return;
    const selected = regionSelect.value;
    regionSelect.querySelectorAll('option:not([value=""])').forEach((o) => o.remove());
    const code = countrySelect.value;
    if (!code) {
      regionSelect.disabled = true;
      return;
    }
    const regions = REGIONS[code];
    if (regions) {
      regions.forEach((name) => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name === 'Other' ? t('auth.region.other', 'Other') : name;
        regionSelect.appendChild(opt);
      });
    } else {
      const opt = document.createElement('option');
      opt.value = 'n/a';
      opt.textContent = t('auth.region.none', 'Not applicable');
      regionSelect.appendChild(opt);
    }
    regionSelect.disabled = false;
    if (selected && regionSelect.querySelector(`option[value="${CSS.escape(selected)}"]`)) regionSelect.value = selected;
  }

  if (countrySelect) {
    renderCountries();
    countrySelect.addEventListener('change', () => {
      if (regionSelect) regionSelect.value = '';
      renderRegions();
    });
  }

  // Re-localise dynamic option text when the language changes.
  document.addEventListener('vp:languagechange', () => {
    renderCountries();
    renderRegions();
  });

  // ---------- Birth date limits ----------
  const birthdate = document.getElementById('vpBirthdate');
  if (birthdate) {
    const today = new Date();
    const max = new Date(today.getFullYear() - MIN_AGE, today.getMonth(), today.getDate());
    const iso = (d) => d.toISOString().slice(0, 10);
    birthdate.max = iso(max);
    birthdate.min = '1900-01-01';
  }

  // ---------- Validation (no backend yet) ----------
  document.querySelectorAll('form[data-vp-auth]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const card = form.closest('.vp-auth-card');
      const alert = card && card.querySelector('.vp-auth-alert');
      if (alert) alert.classList.add('d-none');

      form.classList.add('was-validated');
      if (!form.checkValidity()) {
        const firstInvalid = form.querySelector(':invalid');
        if (firstInvalid) firstInvalid.focus();
        return;
      }
      if (alert) {
        alert.classList.remove('d-none');
        alert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  });
})();
