# Cookie Away

A Chrome extension that rejects cookie banners for you, including the awkward ones that hide "Reject" behind a settings screen.

**[cookieaway.com](https://www.cookieaway.com)** · [Test results](https://www.cookieaway.com/benchmarks) · Meet Kooky, the monster on the icon whose eyes never quite agree.

Most banners offer "Accept all" in one click and make you work for "Reject". Cookie Away does that work: it finds the banner, picks the reject option, and if there isn't one, it opens the settings, switches everything off and saves.

## How it works

On each page, Cookie Away tries these in order:

1. **Known consent tools.** It recognises 27 common consent platforms (OneTrust, Cookiebot, Didomi, Sourcepoint, Usercentrics, TrustArc, Google Funding Choices and others) and uses their own reject controls.
2. **Heuristics.** For banners it doesn't recognise, it looks for consent-looking overlays and reads the wording and button labels (in about 20 languages).
3. **The settings route.** When there's no reject button, it opens "Manage options", clicks "Reject all" or "Object all", switches off anything still on, and saves. If that fails, it either leaves the banner alone or accepts it, whichever you choose in the options.
4. **Jev (optional).** For banners it can't read, it can ask [Jev by TypeSafe](https://typesafe.ai) which button is which. This is off by default and needs your own TypeSafe API key.

It also has some safety rails. Every click is checked: the banner has to actually go away. It never clicks links that navigate away from the page, and it never pays to say no: on pay-or-accept walls it leaves the choice to you. If it ends up acting again and again on the same site (a reload loop), it pauses itself on that site.

## How well it works

We test it against [Consent-O-Matic](https://github.com/cavi-au/Consent-O-Matic) on 69 European sites and publish every result, misses included: [cookieaway.com/benchmarks](https://www.cookieaway.com/benchmarks). The scripts are in [`bench/`](bench/).

## Install

Cookie Away is in review on the Chrome Web Store. Until it's approved, load it from the source:

1. Download this repository (green **Code** button → **Download ZIP**) and unzip it, or `git clone` it.
2. Open `chrome://extensions` in Chrome.
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and pick the unzipped folder.

It should also work in other Chromium browsers (Edge, Brave, Arc) the same way.

## Privacy

Everything happens inside your browser. Cookie Away has no server, no analytics and no tracking. Settings and stats stay in Chrome's local extension storage.

The one exception is Jev. If you turn it on and add your API key, then for a banner it can't read, the extension sends the site's hostname, the banner's text and its button labels to `api.typesafe.ai`. That's at most 3 requests per site per day. Nothing else from the page is sent.

## When it doesn't work

Some banners will get past it. If you find one, please [open an issue](https://github.com/upstrategylab/cookie-away/issues) with:

- the URL of the page
- what happened (banner stayed, wrong button clicked, page kept reloading)
- your browser and its version

## Contributing

Pull requests are welcome. There's no build step: the extension is plain JavaScript, so edit the files and click the reload icon on `chrome://extensions`.

- `content/cmp_registry.js` has the known consent tools and shared helpers. Adding a new consent platform usually means adding an entry here.
- `content/content.js` finds banners, runs the heuristics and applies the loop guard.
- `background/service_worker.js` handles stats, per-site pauses and the Jev calls.
- `popup/` and `options/` contain the extension's popup and its settings page.
- `site/` is cookieaway.com: plain HTML and CSS on Vercel, with a style sheet at [/styleguide](https://www.cookieaway.com/styleguide).
- `bench/` runs the headless comparison behind the published test results.

## Similar projects

If Cookie Away isn't the right fit, these are worth a look:

- [Consent-O-Matic](https://github.com/cavi-au/Consent-O-Matic) from Aarhus University
- [autoconsent](https://github.com/duckduckgo/autoconsent) from DuckDuckGo
- [I still don't care about cookies](https://github.com/OhMyGuus/I-Still-Dont-Care-About-Cookies)
- uBlock Origin's "Annoyances" filter lists

## License

[MIT](LICENSE). `lib/jszip.min.js` is [JSZip](https://github.com/Stuk/jszip), which is dual-licensed under MIT or GPLv3.
