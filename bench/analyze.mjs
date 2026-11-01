import { readFileSync } from 'node:fs';
const rows = readFileSync(process.argv[2], 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const by = {}; for (const r of rows) (by[r.site] ??= {})[r.cfg] = r;
const consent = (st = {}) => {
  if (st.tcf && typeof st.tcf === 'object' && st.tcf.status !== 'cmpuishown') return st.tcf.consents === 0 ? `rejected (TCF 0 consents, ${st.tcf.li} LI)` : `ACCEPTED (TCF ${st.tcf.consents} consents)`;
  if (typeof st.onetrust === 'string') return /C000[2-5]/.test(st.onetrust) ? `ACCEPTED (OneTrust ${st.onetrust})` : 'rejected (OneTrust)';
  if (st.cookiebot) return st.cookiebot.marketing || st.cookiebot.statistics ? 'ACCEPTED (Cookiebot)' : 'rejected (Cookiebot)';
  if (st.didomi && st.didomi.enabled > 0) return `ACCEPTED (Didomi ${st.didomi.enabled})`;
  return 'gone, consent unreadable';
};
const verdict = (r) => r?.error ? `error: ${r.error.slice(0, 40)}` : r?.banner ? `banner still up (${r.banner.hit})` : consent(r?.state);
const tally = { cookieaway: {}, com: {} };
console.log('site'.padEnd(24), 'baseline'.padEnd(12), 'Cookie Away'.padEnd(40), 'Consent-O-Matic');
for (const [site, c] of Object.entries(by)) {
  const base = c.none?.error ? 'error' : c.none?.banner ? 'banner' : 'no banner';
  console.log(site.padEnd(24), base.padEnd(12), verdict(c.cookieaway).padEnd(40), verdict(c.com));
  if (base !== 'banner') continue;
  for (const k of ['cookieaway', 'com']) { const v = verdict(c[k]).split(' ')[0].replace(/[(:]/g, ''); tally[k][v] = (tally[k][v] || 0) + 1; }
}
console.log('\nSites with a banner at baseline:', Object.values(by).filter((c) => c.none?.banner).length);
console.log(JSON.stringify(tally, null, 1));
