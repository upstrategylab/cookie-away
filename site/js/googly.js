/* Cookie Away · googly eyes + mascot behaviour. Shared by the site and the style sheet.

   <span data-mascot></span>            → inlines the mascot; its pupils follow the pointer and it blinks
   <div data-googly="28"></div>         → adds a pair of googly eyes (size in px) to a positioned element
   CA.googlyMode(true)                  → click anything to stick eyes on it; click eyes to peel off; Esc to stop
   CA.chomp(mascotSvg)                  → one bite
   document 'ca:arcade' event           → fired when someone types "cookie" (the easter-egg hook) */
(() => {
  const CA = window.CA = window.CA || {};
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pointer = { x: innerWidth / 2, y: innerHeight / 3 };
  addEventListener('pointermove', e => { pointer.x = e.clientX; pointer.y = e.clientY; }, { passive: true });

  // Every pupil is a little spring: it chases a target inside its eye and overshoots (the "googly" part).
  const pupils = new Set();
  function addPupil(el, eye, max, svg) {
    pupils.add({ el, eye, max, svg, x: 0, y: 0, vx: 0, vy: 0 });
  }
  function tick() {
    for (const p of pupils) {
      if (!p.el.isConnected) { pupils.delete(p); continue; }
      const r = p.eye.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const dx = pointer.x - cx, dy = pointer.y - cy, d = Math.hypot(dx, dy) || 1;
      const reach = Math.min(1, d / 160) * p.max;
      const tx = dx / d * reach, ty = dy / d * reach + p.max * .08;   // a touch of gravity
      p.vx = (p.vx + (tx - p.x) * .14) * .74;
      p.vy = (p.vy + (ty - p.y) * .14) * .74;
      p.x += p.vx; p.y += p.vy;
      const m = Math.hypot(p.x, p.y);
      if (m > p.max) { p.x *= p.max / m; p.y *= p.max / m; p.vx *= -.4; p.vy *= -.4; }   // bounce off the rim
      p.el.style.transform = `translate(${p.x.toFixed(2)}${p.svg ? '' : 'px'}, ${p.y.toFixed(2)}${p.svg ? '' : 'px'})`;
    }
    requestAnimationFrame(tick);
  }
  if (!reduce) requestAnimationFrame(tick);

  // ── Mascot
  CA.mascot = host => {
    host.innerHTML = window.CA_MASCOT;
    const svg = host.firstElementChild;
    svg.setAttribute('aria-hidden', host.hasAttribute('aria-label') ? 'true' : 'false');
    svg.querySelectorAll('[data-eye]').forEach(g => addPupil(g.querySelector('.ca-pupil'), g.querySelector('circle'), 9, true));
    if (!reduce) (function blink() {
      setTimeout(() => { svg.classList.add('is-blink'); setTimeout(() => { svg.classList.remove('is-blink'); blink(); }, 130); }, 2500 + Math.random() * 4000);
    })();
    return svg;
  };
  CA.chomp = svg => { svg.classList.remove('is-chomping'); void svg.getBBox(); svg.classList.add('is-chomping'); setTimeout(() => svg.classList.remove('is-chomping'), 900); };

  // ── Googly eyes
  CA.eyes = (size = 28, cls = '') => {
    const wrap = document.createElement('span');
    wrap.className = 'ca-eyes ' + cls; wrap.style.setProperty('--eye', size + 'px'); wrap.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 2; i++) {
      const eye = document.createElement('span'); eye.className = 'ca-eye';
      const dot = document.createElement('span'); dot.className = 'ca-pupil-dot';
      eye.append(dot); wrap.append(eye);
      addPupil(dot, eye, size * (i ? .3 : .27), false);
    }
    return wrap;
  };

  // ── Googly mode: stick eyes on anything
  let on = false;
  const layer = () => document.querySelector('.ca-eyelayer') || document.body.appendChild(Object.assign(document.createElement('div'), { className: 'ca-eyelayer' }));
  function stick(e) {
    if (!on) return;
    const hit = e.target.closest('.ca-eyes.is-stuck');
    if (hit) { hit.remove(); e.preventDefault(); return; }
    if (e.target.closest('[data-googly-toggle]')) return;
    e.preventDefault(); e.stopPropagation();
    const r = e.target.getBoundingClientRect();
    const size = Math.round(Math.max(14, Math.min(64, Math.min(r.width, r.height) * .22)));
    const eyes = CA.eyes(size, 'is-stuck');
    eyes.style.left = (e.pageX - size) + 'px';
    eyes.style.top = (e.pageY - size / 2) + 'px';
    layer().append(eyes);
    CA.onStick && CA.onStick(document.querySelectorAll('.ca-eyes.is-stuck').length);
  }
  document.addEventListener('click', stick, true);
  CA.googlyMode = state => {
    on = state ?? !on;
    document.documentElement.classList.toggle('is-googly', on);
    document.querySelectorAll('[data-googly-toggle]').forEach(b => b.setAttribute('aria-pressed', on));
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
