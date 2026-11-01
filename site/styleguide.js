// Style sheet behaviour. Landing-page behaviour that should ship lives in js/googly.js (and later js/site.js).
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const CA = window.CA;

  // ── Colour
  const SW = [
    ['Cookie Pink', '--ca-pink', '#FF3FAF', 'Fills, primary buttons, highlights. Never text on paper', 1],
    ['Ink', '--ca-ink', '#111113', 'Outlines, headlines, dark bands', 0],
    ['Paper', '--ca-paper', '#F6F5F2', 'Page ground', 0],
    ['White', '--ca-white', '#FFFFFF', 'Cards, frames, eyes', 0],
    ['Pink Deep', '--ca-pink-deep', '#C2127A', 'Pink text and links on light', 0],
    ['Pink Soft', '--ca-pink-soft', '#FFE1F2', 'Tints, callouts, selection', 0],
    ['Ink 2', '--ca-ink-2', '#3A3A40', 'Body text', 0],
    ['Muted', '--ca-muted', '#6E6E76', 'Secondary text', 0],
    ['Line', '--ca-line', '#E3E2DE', 'Hairlines', 0],
    ['Night', '--ca-night', '#0F1B36', 'Dark band, arcade', 0],
    ['Night 2', '--ca-night-2', '#1C2B4D', 'Cards on night', 0],
  ];
  const COOKIE = [['Dough', '--ca-cookie', '#C99A55', 'Cookie body, crumbs'], ['Dough light', '--ca-cookie-lt', '#E2BC7E', 'Highlight'], ['Chip', '--ca-chip', '#3B2416', 'Chocolate chips']];
  const lum = hex => { const c = hex.match(/\w\w/g).map(x => parseInt(x, 16) / 255).map(v => v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + .05) / (y + .05); };
  const swatch = ([n, v, hex, use, big]) => `<div class="swatch${big ? ' hero-sw' : ''}" style="background:${hex};color:${lum(hex) < .25 ? '#fff' : '#111113'}"><b>${n}</b><code>${hex} · var(${v})</code><span style="opacity:.8">${use}</span></div>`;
  $('#swatches').innerHTML = SW.map(swatch).join('');
  $('#swatches-cookie').innerHTML = COOKIE.map(swatch).join('');
  const PAIRS = [['#111113', '#FF3FAF', 'Ink on Pink'], ['#111113', '#F6F5F2', 'Ink on Paper'], ['#3A3A40', '#F6F5F2', 'Body on Paper'], ['#C2127A', '#F6F5F2', 'Pink Deep on Paper'], ['#C2127A', '#FFE1F2', 'Pink Deep on Soft'], ['#FF3FAF', '#111113', 'Pink on Ink'], ['#FF3FAF', '#0F1B36', 'Pink on Night'], ['#FFFFFF', '#FF3FAF', 'White on Pink'], ['#FF3FAF', '#F6F5F2', 'Pink on Paper']];
  $('#pairs').innerHTML = PAIRS.map(([f, b, n]) => {
    const r = ratio(f, b), g = r >= 7 ? 'AAA' : r >= 4.5 ? 'AA' : r >= 3 ? 'AA large / UI only' : 'Fail: never';
    return `<div class="pair" style="background:${b};color:${f};${b === '#FFFFFF' || b === '#F6F5F2' ? 'border:1px solid #E3E2DE' : ''}"><b>${r.toFixed(1)}:1</b><span>${n}</span><span style="opacity:.75">${g}</span></div>`;
  }).join('');

  // ── Icons
  const IC = [['i-x', 'reject'], ['i-check', 'done'], ['i-cookie', 'cookie'], ['i-sliders', 'settings'], ['i-shield', 'private'], ['i-pause', 'pause'], ['i-loop', 'retry'], ['i-globe', 'languages'], ['i-code', 'open source'], ['i-bug', 'report'], ['i-wallet', 'pay wall'], ['i-eye', 'googly'], ['i-chrome', 'chrome'], ['i-github', 'github'], ['i-star', 'star'], ['i-arrow', 'arrow'], ['i-external', 'external']];
  $('#icons').innerHTML = IC.map(([id, n]) => `<figure><svg class="ca-i"><use href="#${id}"/></svg><figcaption>${n}</figcaption></figure>`).join('');

  // ── Spacing
  $('#space').innerHTML = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => `<div style="width:var(--s-${n});height:var(--s-${n})" title="--s-${n}"></div>`).join('') + '<span class="sg-label" style="margin:0 0 0 8px">--s-1 … --s-10 · 4, 8, 12, 16, 24, 32, 48, 64, 96, 144px</span>';

  // ── GitHub stars (public API, cached an hour in localStorage; no cookies, obviously)
  (async () => {
    const KEY = 'ca-stars', hit = JSON.parse(localStorage.getItem(KEY) || 'null');
    let n = hit && Date.now() - hit.t < 36e5 ? hit.n : null;
    if (n == null) try {
      const r = await fetch('https://api.github.com/repos/upstrategylab/cookie-away');
      if (r.ok) { n = (await r.json()).stargazers_count; localStorage.setItem(KEY, JSON.stringify({ n, t: Date.now() })); }
    } catch {}
    const txt = n == null ? 'Star' : n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(n);
    $$('[data-stars]').forEach(el => { el.textContent = txt; });
  })();

  // ── Banner demo
  const demo = $('#demo');
  const crumbs = (host, x, y, n = 12) => {
    for (let i = 0; i < n; i++) {
      const c = document.createElement('span'); c.className = 'ca-crumb';
      const a = Math.random() * Math.PI * 2, d = 40 + Math.random() * 70;
      c.style.left = x + 'px'; c.style.top = y + 'px';
      c.style.setProperty('--dx', Math.cos(a) * d + 'px'); c.style.setProperty('--dy', Math.sin(a) * d - 20 + 'px');
      c.style.scale = .6 + Math.random() * .8;
      host.append(c); setTimeout(() => c.remove(), 800);
    }
  };
  const wait = ms => new Promise(r => setTimeout(r, ms));
  let playing = false;
  async function play() {
    if (playing) return; playing = true;
    const page = $('.ca-browser__page', demo), banner = $('.ca-cbanner', demo), dim = $('.ca-dim', demo);
    const mascot = $('.sg-demo-mascot', demo), toast = $('.sg-demo-toast', demo), reject = $('.is-reject', demo);
    [banner, dim].forEach(el => el.classList.remove('is-gone')); reject.classList.remove('is-hit');
    mascot.classList.remove('is-in'); toast.classList.remove('is-in');
    await wait(900); mascot.classList.add('is-in');
    await wait(700); reject.classList.add('is-hit');
    await wait(600); CA.chomp($('svg', mascot));
    await wait(250);
    const r = reject.getBoundingClientRect(), p = page.getBoundingClientRect();
    banner.classList.add('is-gone'); dim.classList.add('is-gone');
    crumbs(page, r.left - p.left + r.width / 2, r.top - p.top);
    await wait(500); toast.classList.add('is-in');
    await wait(2200); toast.classList.remove('is-in');
    playing = false;
  }
  new IntersectionObserver((es, o) => es.forEach(e => { if (e.isIntersecting) { play(); o.disconnect(); } }), { threshold: .6 }).observe(demo);
  $('#replay').addEventListener('click', play);

  // ── Googly playground
  CA.onStick = n => { $('#eyecount').textContent = `${n} pair${n === 1 ? '' : 's'} of eyes on the page.`; };
  $('#peel').addEventListener('click', e => { e.stopPropagation(); CA.googlyMode(false); CA.peelAll(); $('#eyecount').textContent = 'All peeled off.'; });

  // ── Tabs
  $$('[data-tabs]').forEach(t => {
    const tabs = $$('[role=tab]', t);
    tabs.forEach(b => b.addEventListener('click', () => {
      tabs.forEach(x => { const on = x === b; x.setAttribute('aria-selected', on); $('#' + x.getAttribute('aria-controls')).hidden = !on; });
    }));
  });
  $$('[data-copy]').forEach(b => b.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(b.dataset.copy); b.textContent = 'Copied'; } catch { b.textContent = 'Select it'; }
    setTimeout(() => { b.textContent = 'Copy'; }, 1500);
  }));

  // ── Report form → pre-filled GitHub issue
  $('#report').addEventListener('submit', e => {
    e.preventDefault();
    const input = $('#report-url'); let u;
    try { u = new URL(input.value.trim()); if (!/^https?:$/.test(u.protocol)) throw 0; } catch { input.setAttribute('aria-invalid', 'true'); input.focus(); return; }
    input.removeAttribute('aria-invalid');
    const q = new URLSearchParams({ title: `Banner not handled: ${u.hostname}`, body: `URL: ${u.href}\n\nWhat happened (banner stayed, wrong button, page kept reloading):\n\nBrowser and version:\n` });
    window.open('https://github.com/upstrategylab/cookie-away/issues/new?' + q, '_blank', 'noopener');
  });

  // ── Motion: curves, pop, crumbs, chomp
  const CURVES = [['--ease-out', 'cubic-bezier(.16,1,.3,1)', 'Default. Arrive and settle'], ['--ease-boing', 'cubic-bezier(.34,1.56,.64,1)', 'Stickers, eyes, buttons'], ['--ease-inout', 'cubic-bezier(.65,0,.35,1)', 'Banners leaving, wipes']];
  $('#curves').innerHTML = CURVES.map(([n, v, u]) => `<button class="sg-curve" style="border:0;text-align:left;cursor:pointer;font:inherit;color:#C3CBE0"><div class="track"><span class="dot" style="transition:left var(--d-4) var(${n})"></span></div><b>${n}</b><span class="sg-label">${v}</span><span class="ca-small">${u}</span></button>`).join('');
  $$('.sg-curve').forEach(c => c.addEventListener('click', () => c.classList.toggle('is-run')));
  $('#poprow').parentElement.addEventListener('click', () => $$('#poprow .ca-cookie').forEach((c, i) => { c.style.animation = 'none'; void c.offsetWidth; c.style.animation = `ca-pop var(--d-3) var(--ease-boing) ${i * 70}ms both`; }));
  $('#crumbs').addEventListener('click', e => { const r = e.currentTarget.getBoundingClientRect(); crumbs(e.currentTarget, r.width / 2, r.height / 2, 14); });
  $$('[data-chomp]').forEach(m => m.addEventListener('click', () => CA.chomp($('svg', m))));

  // ── Arcade hook: for now, a chomp and a toast
  document.addEventListener('ca:arcade', () => {
    $$('.ca-mascot').forEach(CA.chomp);
    const t = document.createElement('span');
    t.className = 'ca-toast'; t.style.cssText = 'position:fixed;left:50%;bottom:24px;translate:-50% 0;z-index:99;animation:ca-pop var(--d-3) var(--ease-boing)';
    t.innerHTML = '<span class="ca-chomper" style="--c:28px"></span>The arcade is coming. Nom.';
    document.body.append(t); setTimeout(() => t.remove(), 3000);
  });

  // ── TOC highlight
  const links = new Map($$('.toc a').map(a => [a.getAttribute('href').slice(1), a]));
  const spy = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    links.forEach(a => a.classList.remove('is-on')); links.get(e.target.id)?.classList.add('is-on');
  }), { rootMargin: '-45% 0px -50% 0px' });
  $$('section.sg[id]').forEach(s => links.has(s.id) && spy.observe(s));
})();
