# cookieaway.com

The Cookie Away website: plain HTML, CSS and JavaScript on Vercel, no build step, no cookies, no analytics. Not part of the extension zip.

```sh
python3 site/scripts/serve.py              # http://127.0.0.1:4340/ (serves site/ like Vercel, caching off)
python3 site/scripts/build-benchmarks.py   # after editing data/benchmarks.json
```

Deploy from `site/` with `vercel deploy` (preview) or `vercel deploy --prod`.

## Pages

- `index.html`: the homepage. The hero illustration is inline SVG, animated in `styles/home.css` and `js/hero.js`.
- `benchmarks.html`: generated from `benchmarks.template.html` and `data/benchmarks.json` by `scripts/build-benchmarks.py`, which also fills the homepage's result numbers (`data-bench`). Edit the template and data, never the generated page.
- `styleguide.html` + `styleguide.js`: the brand style sheet (colour, type, components, motion, decisions).

## Shared files

- `styles/tokens.css`, `components.css`, `motion.css`, `fonts.css`: used by every page. `home.css` is the homepage and benchmarks layout; `styleguide.css` is style-sheet chrome only.
- `js/googly.js`: Kooky (eyes follow the pointer, blinks, chomps), googly eyes on any element (`data-googly`), googly mode (`data-googly-toggle`), and the `ca:arcade` event when someone types "cookie".
- `js/site.js`: star count, animated FAQ, tabs, copy buttons, the report-a-site form, scroll reveals.
- `js/mascot.js`: `assets/kooky.svg` as a string. Keep the two in sync.
- `sitemap.xml` + `robots.txt`: the homepage and /benchmarks (the style sheet is left out). Bump `lastmod` when a page changes; it's submitted in Google Search Console.
- `api/stars.js`: edge function that returns the GitHub star count, cached for an hour, so visitors never contact GitHub.
- `assets/`: Kooky, the favicon, the hero illustration, the social image (`og.png`) and self-hosted fonts (SIL OFL).
