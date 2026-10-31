# Cookie Away privacy policy

Last updated: 31 October 2026

Cookie Away is a browser extension that rejects cookie consent banners for you. It is built to collect as little as possible.

## What Cookie Away does not do

- It has no server and no account.
- It does not use analytics, tracking, or advertising.
- It does not sell or share data with anyone.
- It does not read or store the pages you visit, your browsing history, form contents, or cookies.

## What stays on your device

The extension keeps a small amount of data in Chrome's local extension storage (`chrome.storage.local`) on your own computer:

- your settings (on/off, what to do when a banner has no reject button, sites you've turned it off on)
- simple counters, such as how many banners it has handled
- the names of sites where it paused itself to avoid a reload loop, for 24 hours
- your TypeSafe API key, if you add one

None of this leaves your browser. Uninstalling the extension deletes it.

## The optional Jev feature

Jev (by TypeSafe) is off by default. It only runs if you switch it on in the settings and paste in your own TypeSafe API key.

When it's on and Cookie Away finds a banner it can't read, it sends the following to `https://api.typesafe.ai`:

- the site's hostname (for example `example.com`, not the full URL)
- the visible text of the banner
- the labels of the banner's buttons

That's at most 3 requests per site per day, and answers are cached on your device so the same banner isn't sent twice. TypeSafe handles that request under its own terms and privacy policy. Turn Jev off or remove your key to stop it.

## Permissions

- **Access to all sites:** cookie banners can appear on any website, so the extension needs to look for them everywhere.
- **storage:** to save your settings and counters on your device.

## Contact

Questions or concerns: open an issue at https://github.com/upstrategylab/cookie-away/issues.
