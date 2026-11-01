# Chrome Web Store submission

Everything to paste into the Developer Dashboard (https://chrome.google.com/webstore/devconsole). Build the upload with `./scripts/package.sh`, which writes `store/cookie-away-<version>.zip`.

## Store listing tab

**Name** (from the manifest): Cookie Away

**Summary** (from the manifest, max 132 characters):
Rejects cookie banners for you, including the ones that hide Reject behind a settings screen.

**Category:** Privacy & Security

**Language:** English

**Description:**

```
Tired of hitting "Accept all" on every cookie banner just to get to the page? Cookie Away says no for you, automatically.

When a page shows a consent banner, Cookie Away finds it and clicks the reject option. If there isn't one (common on news sites), it opens the settings, clicks "Reject all" or "Object all", switches off whatever is still on, and saves. If even that fails, it leaves the banner alone, or accepts it if you'd rather not see it at all. You choose.

How it finds banners
• Dedicated rules for 27 consent tools, including OneTrust, Cookiebot, Didomi, Sourcepoint, Usercentrics, TrustArc, Google Funding Choices, Quantcast/InMobi and Complianz
• For everything else, it recognises consent banners by their wording, in about 20 languages
• Optional: Jev by TypeSafe can read banners it doesn't understand (off by default, needs your own API key)

Careful by design
• It checks that every click actually closed the banner
• It never clicks a link that takes you to another page, and it never clicks "subscribe" to get past a pay-or-accept wall
• If a banner keeps coming back, it pauses on that site for 24 hours instead of getting stuck in a reload loop
• Turn it off for any site from the popup

Private
No account, no server, no analytics. Settings stay on your device. The only thing that ever leaves your browser is the banner text sent to Jev, and only if you switch Jev on.

Open source under the MIT license: https://github.com/upstrategylab/cookie-away
Found a banner it can't handle? Open an issue with the URL.
```

**Icon:** `icons/icon128.png` (already in the zip)

**Screenshots** (1280×800, at least 1, up to 5): `store/screenshot-1-popup.png`, `store/screenshot-2-settings.png`. Best extra one to take yourself: the popup open on a real news site right after it rejected a banner.

**Small promo tile** (440×280): `store/promo-small-440x280.png`

**Official URL / Homepage:** https://www.cookieaway.com
**Support URL:** https://github.com/upstrategylab/cookie-away/issues

## Privacy practices tab

**Single purpose:**
Cookie Away rejects cookie consent banners on the websites you visit, so you don't have to click through them yourself.

**Permission justifications:**

- **storage:** Saves the user's settings (on/off, fallback choice, sites where it's turned off), simple counters shown in the popup, and an optional API key, all locally in chrome.storage.local.
- **Host permission (all URLs):** Cookie consent banners can appear on any website, often inside third-party iframes from consent providers, so the content script has to run on all pages and frames to find and dismiss them.

**Are you using remote code?** No. All JavaScript is in the package. The optional Jev feature sends a JSON request to api.typesafe.ai and reads a JSON answer back; no code is downloaded or run.

**Data usage** (tick these):
- Website content: **Yes**, only when the optional Jev feature is switched on by the user. The banner's text and button labels are sent to TypeSafe so it can identify which button rejects cookies.
- Everything else (personally identifiable info, health, financial, authentication, personal communications, location, web history, user activity): **No**.

Then tick all three certifications (not sold to third parties, not used for unrelated purposes, not used for creditworthiness).

**Privacy policy URL:** https://github.com/upstrategylab/cookie-away/blob/main/PRIVACY.md

## Distribution tab

Visibility: Public. Regions: all.

## Before you submit

1. Reload the unpacked extension in Chrome (version 4.2.2 removed two unused permissions) and check it still closes a couple of banners.
2. Register as a Chrome Web Store developer (one-off $5 fee) and verify your contact email.
3. Upload the zip, fill in the tabs above, submit. Review usually takes a few days. Extensions that run on all sites sometimes get a longer review.
