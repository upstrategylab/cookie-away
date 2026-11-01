// Headless comparison: no extension vs Cookie Away vs Consent-O-Matic, one browser at a time, sites in sequence.
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
const REPO = fileURLToPath(new URL('..', import.meta.url));
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, appendFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const B = process.env.BENCH || fileURLToPath(new URL('.', import.meta.url));
const N = Number(process.env.N || 30), SEED = Number(process.env.SEED || Date.now() % 100000);
const pool = JSON.parse(readFileSync(`${B}/sites.json`, 'utf8'));
let s = SEED; const rnd = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
const sites = process.env.SITES ? process.env.SITES.split(',') : pool.map((x) => [rnd(), x]).sort((a, b) => a[0] - b[0]).slice(0, N).map((x) => x[1]);
const CONFIGS = { none: null, cookieaway: REPO, com: process.env.COM_DIR || `${B}/com` };
const only = process.env.CONFIGS ? process.env.CONFIGS.split(',') : Object.keys(CONFIGS);
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
const OUT = `${B}/out-${SEED}${process.env.TAG || ""}`; mkdirSync(`${OUT}/shots`, { recursive: true });
const log = (o) => { appendFileSync(`${OUT}/results.ndjson`, JSON.stringify(o) + '\n'); console.log(JSON.stringify(o)); };
writeFileSync(`${OUT}/sites.json`, JSON.stringify({ SEED, sites }, null, 1));

// Runs in every frame: is there a visible consent banner?
const DETECT = () => {
  const RX = /cookie|consent|samtycke|kakor|einwillig|datenschutz|consentement|traceurs|privacidad|consenso|toestemming|gdpr|tcf|partners|partenaires|socios|partner/i;
  const KNOWN = '#onetrust-banner-sdk,#onetrust-consent-sdk .ot-sdk-container,#CybotCookiebotDialog,#didomi-popup,#didomi-notice,#usercentrics-root,#uc-banner,.qc-cmp2-container,#qc-cmp2-ui,.fc-consent-root,#truste-consent-track,#cmpbox,#cmpwrapper,.cmp-root,#sp_message_container,[id^="sp_message_container"],#iubenda-cs-banner,#cookiescript_injected,.cky-consent-container,#axeptio_overlay,#tarteaucitronAlertBig,#CookieBoxSaveButton,#cookie-law-info-bar,.cc-window,#gdpr-consent-tool-wrapper,#appconsent,.sd-cmp,#cmp-app-container,#consent-page,.trustarc-banner';
  const vis = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    return r.width > 120 && r.height > 40 && cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0.1 && r.bottom > 0 && r.top < innerHeight; };
  for (const el of document.querySelectorAll(KNOWN)) if (vis(el) && (el.innerText || '').trim().length > 20) return { hit: 'known', sel: el.id || el.className?.toString().slice(0, 40) };
  // CMP iframes count as a banner in the parent frame
  for (const f of document.querySelectorAll('iframe')) {
    const src = (f.src || '') + ' ' + (f.id || '') + ' ' + (f.title || '');
    if (/sp_message|consent|cmp|privacy-mgmt|sourcepoint|cookie/i.test(src) && vis(f) && f.getBoundingClientRect().width > 250) return { hit: 'iframe', sel: src.slice(0, 60) };
  }
  // Generic: a fixed/sticky box (or inside one) with consent wording and a button, open shadow roots included
  const all = []; const walk = (root) => { for (const el of root.querySelectorAll('*')) { all.push(el); if (el.shadowRoot) walk(el.shadowRoot); } }; walk(document);
  const pinned = (el) => { for (let n = el, i = 0; n && i < 8; i++) { if (n.nodeType === 1) { const p = getComputedStyle(n).position; if (p === 'fixed' || p === 'sticky') return true; } n = n.parentNode || n.host; if (n && n.nodeType === 11) n = n.host; } return false; };
  for (const el of all) {
    if (!/^(DIV|SECTION|ASIDE|DIALOG|FORM)$/.test(el.tagName) || !vis(el)) continue;
    const t = (el.innerText || '').slice(0, 3000);
    if (t.length < 40 || t.length > 2500 || !RX.test(t)) continue;
    if (!el.querySelector('button,[role=button],a.btn,input[type=button],input[type=submit]')) continue;
    if (pinned(el)) return { hit: 'generic', sel: (el.id || el.className?.toString() || el.tagName).slice(0, 40), text: t.slice(0, 80).replace(/\s+/g, ' ') };
  }
  // Frame-level: a consent-only document (e.g. inside a CMP iframe)
  if (window !== top && RX.test(document.body?.innerText?.slice(0, 2000) || '') && document.querySelector('button') && vis(document.body)) return { hit: 'frame', sel: location.host };
  return null;
};

// Main frame: what consent did the site record?
const STATE = async () => {
  const out = {};
  try { if (window.__tcfapi) out.tcf = await new Promise((res) => { const t = setTimeout(() => res('timeout'), 2500);
    window.__tcfapi('getTCData', 2, (d, ok) => { clearTimeout(t); if (!ok || !d) return res('noop');
      const c = Object.values(d.purpose?.consents || {}).filter(Boolean).length; const li = Object.values(d.purpose?.legitimateInterests || {}).filter(Boolean).length;
      res({ status: d.eventStatus, cmp: d.cmpId, consents: c, li, vendors: Object.values(d.vendor?.consents || {}).filter(Boolean).length }); }); }); } catch (e) { out.tcf = 'err'; }
  try { if (window.OnetrustActiveGroups !== undefined) out.onetrust = window.OnetrustActiveGroups; } catch {}
  try { if (window.Cookiebot?.consent) out.cookiebot = { ...window.Cookiebot.consent }; } catch {}
  try { if (window.Didomi?.getUserStatus) { const u = window.Didomi.getUserStatus(); out.didomi = { enabled: u.purposes?.global?.enabled?.length, disabled: u.purposes?.global?.disabled?.length }; } } catch {}
  return out;
};

for (const cfg of only) {
  const ext = CONFIGS[cfg];
  const dir = mkdtempSync(path.join(tmpdir(), `bench-${cfg}-`));
  const args = [`--user-agent=${UA}`, '--lang=en-GB'];
  if (ext) args.push(`--disable-extensions-except=${ext}`, `--load-extension=${ext}`);
  const ctx = await chromium.launchPersistentContext(dir, { channel: 'chromium', headless: true, args, viewport: { width: 1280, height: 800 }, locale: 'en-GB', timezoneId: 'Europe/Stockholm' });
  await new Promise((r) => setTimeout(r, ext ? 6000 : 500)); // let extensions initialise (Consent-O-Matic fetches its rules)
  console.log(cfg, 'service workers:', ctx.serviceWorkers().map((w) => w.url().slice(0, 70)));
  for (const p of ctx.pages()) if (p.url().startsWith('chrome-extension')) await p.close().catch(() => {});
  for (const site of sites) {
    const page = await ctx.newPage(); const t0 = Date.now(); const rec = { cfg, site };
    try {
      await page.goto(`https://${site}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(12000);
      let banner = null;
      for (const fr of page.frames()) { try { const r = await fr.evaluate(DETECT); if (r && (!fr.parentFrame() || r.hit !== 'frame' || true)) { banner = { ...r, frame: fr === page.mainFrame() ? 'main' : new URL(fr.url()).host }; if (fr === page.mainFrame() || r.hit === 'frame') break; } } catch {} }
      rec.banner = banner; rec.state = await page.evaluate(STATE).catch(() => ({})); rec.title = (await page.title()).slice(0, 60);
      await page.screenshot({ path: `${OUT}/shots/${site}--${cfg}.jpg`, type: 'jpeg', quality: 55 });
    } catch (e) { rec.error = e.message.split('\n')[0].slice(0, 120); }
    rec.ms = Date.now() - t0; log(rec);
    for (const p of ctx.pages()) if (p !== page && p.url().startsWith('chrome-extension')) await p.close().catch(() => {});
    await page.close().catch(() => {});
  }
  await ctx.close();
}
console.log('DONE', OUT);
