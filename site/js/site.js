/* Cookie Away · site behaviour shared by the homepage, the benchmarks page and the style sheet.
   No cookies, no storage, no trackers: the star count comes from our own /api/stars (cached at
   the edge), and only falls back to GitHub's public API when the page is opened locally. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── GitHub stars
  (async () => {
    const els = $$('[data-stars]'); if (!els.length) return;
    const local = location.protocol === 'file:' || /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
    let n = null;
    for (const url of local ? ['https://api.github.com/repos/upstrategylab/cookie-away'] : ['/api/stars']) {
      try { const r = await fetch(url); if (r.ok) { const j = await r.json(); n = j.stars ?? j.stargazers_count ?? null; break; } } catch {}
    }
    // No count until there's something to count: a "0" next to the star reads as a bad sign
    if (!n) { els.forEach(el => el.closest('.ca-ghstar__count, .ca-starbar__pill')?.setAttribute('hidden', '')); return; }
    const txt = n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(n);
    els.forEach(el => { el.textContent = txt; });
  })();

  // ── FAQ: animate open and close (native <details>, so it still works without JS)
  $$('details.ca-faq').forEach(d => {
    const summary = $('summary', d), body = $('.ca-faq__body', d);
    if (!summary || !body) return;
    let anim = null;
    summary.addEventListener('click', e => {
      if (reduce) return;
      e.preventDefault();
      anim?.cancel();
      const opening = !d.open;
      if (opening) d.open = true;
      const h = body.scrollHeight;
      d.classList.toggle('is-closing', !opening);
      anim = body.animate(
        opening ? [{ height: '0px', opacity: 0 }, { height: h + 'px', opacity: 1 }] : [{ height: h + 'px', opacity: 1 }, { height: '0px', opacity: 0 }],
        { duration: opening ? 320 : 240, easing: opening ? 'cubic-bezier(.16,1,.3,1)' : 'cubic-bezier(.65,0,.35,1)' });
      body.style.overflow = 'hidden';
      anim.onfinish = () => { if (!opening) d.open = false; d.classList.remove('is-closing'); body.style.overflow = ''; anim = null; };
    });
  });

  // ── Tabs
  $$('[data-tabs]').forEach(t => {
    const tabs = $$('[role=tab]', t);
    tabs.forEach(b => b.addEventListener('click', () => {
      tabs.forEach(x => { const on = x === b; x.setAttribute('aria-selected', on); $('#' + x.getAttribute('aria-controls')).hidden = !on; });
    }));
  });

  // ── Copy buttons
  $$('[data-copy]').forEach(b => b.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(b.dataset.copy); b.textContent = 'Copied'; } catch { b.textContent = 'Select it'; }
    setTimeout(() => { b.textContent = 'Copy'; }, 1500);
  }));

  // ── Report a site → pre-filled GitHub issue
  $$('[data-report]').forEach(form => form.addEventListener('submit', e => {
    e.preventDefault();
    const input = $('input', form); let u;
    try { u = new URL(input.value.trim()); if (!/^https?:$/.test(u.protocol)) throw 0; } catch { input.setAttribute('aria-invalid', 'true'); input.focus(); return; }
    input.removeAttribute('aria-invalid');
    const q = new URLSearchParams({ title: `Banner not handled: ${u.hostname}`, body: `URL: ${u.href}\n\nWhat happened (banner stayed, wrong button, page kept reloading):\n\nBrowser and version:\n` });
    window.open('https://github.com/upstrategylab/cookie-away/issues/new?' + q, '_blank', 'noopener');
  }));

  // ── Reveal on scroll
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { threshold: .15 });
  $$('[data-reveal]').forEach(el => io.observe(el));
})();
