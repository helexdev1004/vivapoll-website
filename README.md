# VivaPoll — marketing site

The public website for VivaPoll, a paid-survey app by Main Frame Ltd. Seven static pages
in six languages, with no build step: open `index.html` and it runs.

## Running it

There is nothing to install. Open `index.html` in a browser, or serve the folder if you
want the language switcher's `localStorage` to behave exactly as it does in production:

```
npx serve .
```

## What is here

```
index.html                 home
about-us.html              about
support.html               support and FAQ
privacy-policy.html        privacy policy
terms-and-conditions.html  terms
signin.html  signup.html   account forms (front end only — see "Not wired up" below)

assets/css/style.css       all styling, in numbered sections
assets/js/i18n.js          the translation engine
assets/js/i18n-*.js        per-page dictionaries (nl, fr, de, es, it)
assets/js/main.js          navigation, FAQ, password toggles, form validation
assets/js/animations.js    homepage scroll motion (GSAP)
assets/js/cursor.js        the custom pointer
assets/images/             illustrations and icons
```

## Built with

HTML5, CSS3, Bootstrap 5.3.3 and vanilla JavaScript — no framework, no build tooling.
GSAP 3.12.5 drives the homepage scroll animation. Bootstrap, Bootstrap Icons, GSAP and the
webfonts (Inter, Caveat) all load from a CDN.

## Translations

Six languages: English, Dutch, French, German, Spanish, Italian.

Text is marked up in the HTML and filled in at runtime:

```html
<p data-i18n="hero.lead">Complete surveys, play games, and try new apps.</p>
```

- `data-i18n` replaces the element's text
- `data-i18n-html` replaces its markup, for copy that contains tags
- `data-i18n-attr="alt:hero.imgAlt"` sets an attribute
- `data-i18n-title` sets the page title

The English in the markup is the fallback: if a key is missing from a dictionary, that
element keeps what the HTML says rather than going blank. The chosen language is kept in
`localStorage` under `vp-lang`, and a change dispatches a `vp:languagechange` event on
`document` for anything that needs to rebuild itself.

To add a string: add `data-i18n="section.key"` in the HTML, then add that key to each of
the five dictionaries for that page.

## Motion

`animations.js` reads `data-anim` attributes, so most motion is set in the markup:

```html
<div data-anim="up" data-anim-delay="0.3">
```

Presets are `up`, `down`, `left`, `right`, `zoom`, `fade`, `tilt` and `chars` (which
splits a heading into letters and drops them in one by one). `data-anim-group` staggers an
element's children; `data-count` counts a number up.

Everything reverses on the way back up the page, so it reads the same scrolling either
direction.

None of it is load-bearing. Elements are only hidden while `.vp-anim` is on `<html>`, and
that class comes off the moment `animations.js` runs — a blocked CDN, a script error or
`prefers-reduced-motion` all leave an ordinary, fully visible page. A 2.5s failsafe in
`<head>` removes it even if the script never arrives at all.

## Browser support

Modern evergreen browsers. Layout is checked at three bands: desktop (1200px and up),
tablet (768–1199px) and mobile (below 768px). The custom pointer and the scroll motion are
both switched off for touch devices and for anyone who has asked for reduced motion.

## Not wired up

There is no backend. Sign in, sign up, and the support form validate in the browser and
then stop — nothing is submitted anywhere, and no account is created. App store buttons
and social links point at `#`. These are placeholders waiting for real endpoints.

## Licence

© 2026 Main Frame Ltd. All rights reserved.
