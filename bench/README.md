# Benchmarks

The scripts behind https://cookieaway.com/benchmarks. One headless Chromium at a time, a fresh profile per site, 12 seconds per page.

```sh
cd bench && npm install && npx playwright install chromium
SITES=www.lidl.de,www.techradar.com node run.mjs                 # none, cookieaway and com on two sites
CONFIGS=cookieaway N=30 SEED=2611 node run.mjs                     # Cookie Away only, 30 random sites from sites.json
node analyze.mjs out-2611/results.ndjson                           # what each site recorded
node debug.mjs www.example.com                                     # Cookie Away's log and every visible button
```

- `com` needs Consent-O-Matic unpacked (the official GitHub release) in `bench/com`, or set `COM_DIR`.
- Results and screenshots go to `bench/out-*` (git-ignored).
- "Rejected" means the site's consent tool (TCF, OneTrust, Cookiebot, Didomi) records no consents. Everything else, including pay-or-accept walls, was classified by looking at the screenshots; the published table is in `site/data/benchmarks.json`.
