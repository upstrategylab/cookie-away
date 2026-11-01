# Cookie Away: website

Brand style sheet for the Cookie Away landing page. Plain HTML and CSS, no build step. Not part of the extension zip.

```sh
python3 site/scripts/serve.py   # http://127.0.0.1:4340/site/styleguide.html
```

Opening `styleguide.html` straight from disk also works.

## Files

- `styleguide.html` + `styleguide.js`: the sheet (13 sections, from idea and voice to open decisions).
- `styles/tokens.css`, `components.css`, `motion.css`: shared by the sheet and the landing page. `styleguide.css` is sheet chrome only.
- `js/googly.js`: the mascot (eyes follow the pointer, blinks, chomps), googly eyes on any element (`data-googly`), googly mode (`CA.googlyMode()`), and the `ca:arcade` easter-egg event when someone types "cookie".
- `js/mascot.js`: the mascot SVG inlined as a string, generated from `assets/mascot.svg`.
