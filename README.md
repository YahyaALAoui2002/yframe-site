# YFrame

🔗 **Live Website:** [yahyaalaoui2002.github.io/yframe-site](https://yahyaalaoui2002.github.io/yframe-site/)

YFrame is an independent web design studio based in Paris. This repository holds the studio's website: custom-coded, interactive pages built without templates or page builders.

## Structure

- `index.html` — home page
- `services/` — service pages (business websites, e-commerce, landing pages, custom interactive builds, brand identity, SEO)
- `portfolio/` — case studies
- `assets/` — styles, scripts, logos and video

## Languages (EN / FR)

Every page is available in English and French. English is the text written in the HTML; French is applied in the browser by `assets/i18n.js`.

- Visitors switch with the EN | FR toggle in the nav. The choice is remembered across pages; on a first visit the browser language is used. Adding `?lang=fr` or `?lang=en` to any URL forces a language.
- Translatable elements carry `data-i18n="key"`. Attributes use `data-i18n-alt`, `data-i18n-placeholder`, `data-i18n-title` or `data-i18n-aria-label`.
- Strings live in dictionaries that register themselves with `window.YFRAME_I18N_PAGES.push({ en: {...}, fr: {...} })`:
  - `assets/i18n.js` — home page and strings shared with every page (nav, footer, service names)
  - `assets/i18n/services-common.js` — strings shared by the service pages
  - `assets/i18n/<page>.js` — one per service page
  - `portfolio/aurelia/i18n.js` — the AURELIA case study
- Each page loads its dictionaries, then `assets/i18n.js`, then its other scripts.
- When you change English copy, edit the HTML and the matching `en` entry so they stay identical, then update the `fr` entry.

## Deployment

The site is static and served with GitHub Pages.
