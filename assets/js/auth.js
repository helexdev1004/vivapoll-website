/* VivaPoll – Log in / Sign up page behaviour (frontend only, no backend). */
(function () {
  // Countries offered in the sign-up form. Names are localised with Intl.DisplayNames.
  const COUNTRIES = ['AR', 'AT', 'AU', 'BE', 'BR', 'CA', 'CH', 'CO', 'DE', 'ES', 'FR', 'GB', 'IE', 'IN', 'IT', 'MX', 'NL', 'PT', 'US'];

  // Regions for the most common countries; other countries get a single "Not applicable" option.
  const REGIONS = {
    NL: ['Drenthe', 'Flevoland', 'Friesland', 'Gelderland', 'Groningen', 'Limburg', 'Noord-Brabant', 'Noord-Holland', 'Overijssel', 'Utrecht', 'Zeeland', 'Zuid-Holland'],
    BE: ['Brussels', 'Flanders', 'Wallonia'],
    FR: ['Auvergne-Rhône-Alpes', 'Bourgogne-Franche-Comté', 'Bretagne', 'Centre-Val de Loire', 'Corse', 'Grand Est', 'Hauts-de-France', 'Île-de-France', 'Normandie', 'Nouvelle-Aquitaine', 'Occitanie', 'Pays de la Loire', 'Provence-Alpes-Côte d’Azur'],
    DE: ['Baden-Württemberg', 'Bayern', 'Berlin', 'Brandenburg', 'Bremen', 'Hamburg', 'Hessen', 'Mecklenburg-Vorpommern', 'Niedersachsen', 'Nordrhein-Westfalen', 'Rheinland-Pfalz', 'Saarland', 'Sachsen', 'Sachsen-Anhalt', 'Schleswig-Holstein', 'Thüringen'],
    ES: ['Andalucía', 'Aragón', 'Asturias', 'Baleares', 'Canarias', 'Cantabria', 'Castilla y León', 'Castilla-La Mancha', 'Cataluña', 'Comunidad Valenciana', 'Extremadura', 'Galicia', 'La Rioja', 'Madrid', 'Murcia', 'Navarra', 'País Vasco'],
    IT: ['Abruzzo', 'Basilicata', 'Calabria', 'Campania', 'Emilia-Romagna', 'Friuli-Venezia Giulia', 'Lazio', 'Liguria', 'Lombardia', 'Marche', 'Molise', 'Piemonte', 'Puglia', 'Sardegna', 'Sicilia', 'Toscana', 'Trentino-Alto Adige', 'Umbria', 'Valle d’Aosta', 'Veneto'],
    GB: ['England', 'Northern Ireland', 'Scotland', 'Wales'],
    US: ['Alabama', 'Alaska', 'Arizona', 'California', 'Colorado', 'Florida', 'Georgia', 'Illinois', 'Massachusetts', 'Michigan', 'New Jersey', 'New York', 'North Carolina', 'Ohio', 'Pennsylvania', 'Texas', 'Virginia', 'Washington', 'Other'],
    IN: ['Andhra Pradesh', 'Delhi', 'Gujarat', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Punjab', 'Rajasthan', 'Tamil Nadu', 'Telangana', 'Uttar Pradesh', 'West Bengal', 'Other'],
    BR: ['Bahia', 'Ceará', 'Distrito Federal', 'Minas Gerais', 'Paraná', 'Pernambuco', 'Rio de Janeiro', 'Rio Grande do Sul', 'Santa Catarina', 'São Paulo', 'Other'],
    CO: ['Antioquia', 'Atlántico', 'Bogotá D.C.', 'Bolívar', 'Cundinamarca', 'Santander', 'Valle del Cauca', 'Other']
  };

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
