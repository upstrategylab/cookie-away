// One site, Cookie Away loaded: print its console log and the visible buttons in every frame (shadow roots included).
import { mkdtempSync } from 'node:fs'; import { tmpdir } from 'node:os'; import path from 'node:path';
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
const REPO = fileURLToPath(new URL('..', import.meta.url));
const ext = process.env.EXT || REPO;
const sites = process.argv.slice(2); const B = process.env.BENCH || fileURLToPath(new URL('.', import.meta.url));
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
const args = [`--user-agent=${UA}`, '--lang=en-GB'];
if (ext !== 'none') args.push(`--disable-extensions-except=${ext}`, `--load-extension=${ext}`);
const ctx = await chromium.launchPersistentContext(mkdtempSync(path.join(tmpdir(), 'dbg-')), { channel: 'chromium', headless: true, args, viewport: { width: 1280, height: 800 }, locale: 'en-GB', timezoneId: 'Europe/Stockholm' });
await new Promise((r) => setTimeout(r, 3000));
const BTNS = () => { const out = []; const walk = (root) => { for (const el of root.querySelectorAll('*')) { if (el.shadowRoot) walk(el.shadowRoot);
  if (el.matches('button,[role=button],a,input[type=button],input[type=submit],[role=switch],input[type=checkbox]')) { const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) { const t = (el.getAttribute('aria-label') || el.value || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 50);
      if (t || el.type === 'checkbox' || el.getAttribute('role') === 'switch') out.push(`${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''}${el.type === 'checkbox' || el.getAttribute('role') === 'switch' ? `[${el.checked ?? el.getAttribute('aria-checked')}]` : ''} "${t}"`); } } } };
  walk(document); return out; };
for (const site of sites) {
  const page = await ctx.newPage(); const logs = [];
  page.on('console', (m) => { if (/Cookie Away/.test(m.text())) logs.push((m.location()?.url || '').replace(/^https?:\/\//, '').slice(0, 28).padEnd(28) + ' ' + m.text().slice(0, 130)); });
  await page.goto(`https://${site}/`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch((e) => logs.push('NAV ' + e.message.slice(0, 80)));
  await page.waitForTimeout(Number(process.env.WAIT || 12000));
  console.log(`\n===== ${site}\n-- log:\n  ${logs.join('\n  ')}`);
  for (const fr of page.frames()) { const b = await fr.evaluate(BTNS).catch(() => []); const kw = b.filter((x) => /cookie|kakor|reject|avvisa|neka|godkänn|accept|ablehn|akzept|akkoord|instell|agree|settings|spara|opslaan|save|hantera|inställ|einstell|okej|weiger|pay|betal/i.test(x));
    if (kw.length) console.log(`-- frame ${fr === page.mainFrame() ? 'main' : fr.url().slice(0, 70)}:\n  ${kw.slice(0, 40).join('\n  ')}`); }
  await page.screenshot({ path: `${B}/dbg-${site}.jpg`, type: 'jpeg', quality: 55 });
  await page.close();
}
await ctx.close();
