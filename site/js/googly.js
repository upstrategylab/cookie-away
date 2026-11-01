/* Cookie Away · Kooky and googly eyes. Shared by the site and the style sheet.

   <span data-mascot></span>            → inlines Kooky; his pupils follow the pointer (each in its own
                                          wonky way), drift back to his cross-eyed rest, and he blinks
   <div data-googly="28"></div>         → adds a pair of googly eyes (size in px) to a positioned element
   <button data-googly-toggle>          → switches googly mode: click anything to stick eyes on it,
                                          click eyes to peel them off, Esc or the pill's Done to stop
   CA.chomp(svg)                        → one bite
   document 'ca:arcade' event           → fired when someone types "cookie" (the easter-egg hook) */
(() => {
  const CA = window.CA = window.CA || {};
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pointer = { x: innerWidth / 2, y: innerHeight / 3, t: 0 };
  addEventListener('pointermove', e => { pointer.x = e.clientX; pointer.y = e.clientY; pointer.t = performance.now(); }, { passive: true });

  // Every pupil is a little spring: it chases a target inside its eye and overshoots (the "googly" part).
  // rest = where it sits when nobody's moving (Kooky's eyes never quite agree); bias = how keen it is to follow.
  const pupils = new Set();
  function addPupil(el, eye, max, { svg = false, rest = [0, 0], bias = 1 } = {}) {
    pupils.add({ el, eye, max, svg, rest, bias, x: rest[0], y: rest[1], vx: 0, vy: 0 });
  }
  function tick(now) {
    const idle = now - pointer.t > 2500;
    for (const p of pupils) {
      if (!p.el.isConnected) { pupils.delete(p); continue; }
      const r = p.eye.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) continue;
      const scale = p.svg ? (p.eye.r?.baseVal.value || 1) * 2 / r.width : 1;   // screen px → svg units
      let tx = p.rest[0], ty = p.rest[1];
      if (!idle) {
        const dx = pointer.x - (r.left + r.width / 2), dy = pointer.y - (r.top + r.height / 2), d = Math.hypot(dx, dy) || 1;
        const reach = Math.min(1, d * scale / (p.max * 6)) * p.max * p.bias;
        tx = dx / d * reach + p.rest[0] * .35; ty = dy / d * reach + p.rest[1] * .35 + p.max * .06;
      }
      p.vx = (p.vx + (tx - p.x) * .14) * .74;
      p.vy = (p.vy + (ty - p.y) * .14) * .74;
      p.x += p.vx; p.y += p.vy;
      const m = Math.hypot(p.x, p.y);
      if (m > p.max) { p.x *= p.max / m; p.y *= p.max / m; p.vx *= -.4; p.vy *= -.4; }   // bounce off the rim
      if (p.svg) p.el.setAttribute('transform', `translate(${p.x.toFixed(2)} ${p.y.toFixed(2)})`);
      else p.el.style.transform = `translate(${p.x.toFixed(2)}px, ${p.y.toFixed(2)}px)`;
    }
    requestAnimationFrame(tick);
  }
  if (!reduce) requestAnimationFrame(tick);

  // ── Kooky
  CA.mascot = host => {
    host.innerHTML = window.CA_MASCOT;
    const svg = host.firstElementChild;
    if (!host.hasAttribute('aria-label')) svg.setAttribute('aria-hidden', 'true');
    svg.querySelectorAll('[data-eye]').forEach((g, i) => {
      const rest = (g.dataset.rest || '0 0').split(' ').map(Number);
      addPupil(g.querySelector('.ca-pupil'), g.querySelector('circle'), 17, { svg: true, rest, bias: i ? .75 : 1 });
    });
    if (!reduce) (function blink() {
      setTimeout(() => { svg.classList.add('is-blink'); setTimeout(() => { svg.classList.remove('is-blink'); blink(); }, 130); }, 2500 + Math.random() * 4000);
    })();
    return svg;
  };
  // Any inline SVG with [data-eye] groups (a circle, then a .ca-pupil) gets Kooky's eyes
  CA.svgEyes = root => root.querySelectorAll('[data-eye]').forEach((g, i) => {
    const rest = (g.dataset.rest || '0 0').split(' ').map(Number);
    addPupil(g.querySelector('.ca-pupil'), g.querySelector('circle'), 17, { svg: true, rest, bias: i ? .75 : 1 });
  });
  CA.chomp = svg => { svg.classList.remove('is-chomping'); void svg.getBBox(); svg.classList.add('is-chomping'); setTimeout(() => svg.classList.remove('is-chomping'), 900); };

  // ── Googly eyes
  CA.eyes = (size = 28, cls = '') => {
    const wrap = document.createElement('span');
    wrap.className = 'ca-eyes ' + cls; wrap.style.setProperty('--eye', size + 'px'); wrap.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 2; i++) {
      const eye = document.createElement('span'); eye.className = 'ca-eye';
      const dot = document.createElement('span'); dot.className = 'ca-pupil-dot';
      eye.append(dot); wrap.append(eye);
      addPupil(dot, eye, size * (i ? .3 : .27), { rest: i ? [-size * .12, -size * .1] : [size * .1, size * .08], bias: i ? .8 : 1 });
    }
    return wrap;
  };

  // ── Googly mode: stick eyes on anything
  let on = false, pill = null;
  const layer = () => document.querySelector('.ca-eyelayer') || document.body.appendChild(Object.assign(document.createElement('div'), { className: 'ca-eyelayer' }));
  const count = () => document.querySelectorAll('.ca-eyes.is-stuck').length;
  function updatePill() {
    if (!pill) return;
    const n = count();
    pill.querySelector('[data-count]').textContent = n ? `${n} pair${n === 1 ? '' : 's'} stuck on` : 'Click anything to give it eyes';
  }
  function stick(e) {
    if (!on) return;
    if (e.target.closest('.ca-googly-pill, [data-googly-toggle]')) return;
    const hit = e.target.closest('.ca-eyes.is-stuck');
    e.preventDefault(); e.stopPropagation();
    if (hit) { hit.remove(); updatePill(); return; }
    const r = e.target.getBoundingClientRect();
    const size = Math.round(Math.max(14, Math.min(64, Math.min(r.width, r.height) * .22)));
    const eyes = CA.eyes(size, 'is-stuck');
    eyes.style.left = (e.pageX - size) + 'px';
    eyes.style.top = (e.pageY - size / 2) + 'px';
    layer().append(eyes);
    updatePill();
  }
  document.addEventListener('click', stick, true);
  CA.googlyMode = state => {
    on = state ?? !on;
    const root = document.documentElement;
    root.classList.toggle('is-googly', on);
    document.querySelectorAll('[data-googly-toggle]').forEach(b => {
      b.setAttribute('aria-pressed', on);
      const label = b.querySelector('[data-label]'); if (label) label.textContent = on ? 'Googly mode on' : 'Googly mode';
    });
    if (on && !pill) {
      pill = document.createElement('div');
      pill.className = 'ca-googly-pill'; pill.setAttribute('role', 'status');
      pill.innerHTML = '<span class="ca-googly-pill__dot" aria-hidden="true"></span><b>Googly mode</b><span data-count></span><button type="button" class="ca-googly-pill__peel">Peel off</button><button type="button" class="ca-googly-pill__done">Done <kbd>Esc</kbd></button>';
      pill.querySelector('.ca-googly-pill__done').addEventListener('click', () => CA.googlyMode(false));
      pill.querySelector('.ca-googly-pill__peel').addEventListener('click', () => { CA.peelAll(); updatePill(); });
      document.body.append(pill); updatePill();
    } else if (!on && pill) { pill.remove(); pill = null; }
    return on;
  };
  CA.peelAll = () => document.querySelectorAll('.ca-eyes.is-stuck').forEach(e => e.remove());
  addEventListener('keydown', e => { if (e.key === 'Escape' && on) CA.googlyMode(false); });

  // ── Easter-egg hook: type "cookie" anywhere (not in a field)
  let typed = '';
  addEventListener('keydown', e => {
    if (e.target.closest('input, textarea, [contenteditable]') || e.key.length !== 1) return;
    typed = (typed + e.key.toLowerCase()).slice(-6);
    if (typed === 'cookie') document.dispatchEvent(new CustomEvent('ca:arcade'));
  });

  // ── Wire up declarative bits
  const init = () => {
    document.querySelectorAll('[data-mascot]').forEach(CA.mascot);
    document.querySelectorAll('[data-googly]').forEach(el => {
      el.append(CA.eyes(+el.dataset.googly || 28, el.dataset.googlyPos || 'ca-eyes--top'));
    });
    document.querySelectorAll('[data-googly-toggle]').forEach(b => b.addEventListener('click', () => CA.googlyMode()));
  };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
