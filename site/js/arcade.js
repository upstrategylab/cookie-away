/* Cookie Away · Kooky's arcade. Loaded on demand when someone types "cookie" (or taps Play).
   Our own maze-chase game: the maze is a page of stacked cookie banners, Kooky eats the cookies,
   and "Accept all" buttons chase him. Grab a "Reject all" to turn them grey and eat them.
   No storage, no network, no sound. Esc or ✕ closes it. */
(() => {
  const CA = window.CA = window.CA || {};
  if (CA.arcade) return;

  // ── Maze: 21 × 21. Corridors run along every third row; between them sit bands of "banners"
  // with gaps at the listed columns. Every corridor row is open end to end, so nothing dead-ends.
  const W = 21, H = 21;
  const BANDS = [ // [top row, open columns]
    [2, [1, 6, 14, 19]],
    [5, [1, 4, 10, 16, 19]],
    [8, [1, 5, 10, 15, 19]],
    [11, [1, 7, 13, 19]],
    [14, [1, 5, 10, 15, 19]],
    [17, [1, 4, 10, 16, 19]]
  ];
  const wall = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => x === 0 || y === 0 || x === W - 1 || y === H - 1));
  const blocks = [];
  for (const [top, open] of BANDS) {
    let start = null;
    for (let x = 1; x < W; x++) {
      const solid = x < W - 1 && !open.includes(x);
      if (solid) { wall[top][x] = wall[top + 1][x] = true; if (start === null) start = x; }
      else if (start !== null) { blocks.push({ x: start, y: top, w: x - start, h: 2 }); start = null; }
    }
  }
  const POWER = [[1, 1], [19, 1], [1, 19], [19, 19]];
  const KOOKY_START = [10, 16];
  const HOME = [[9, 4], [10, 4], [11, 4]];
  const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const open = (x, y) => x >= 0 && y >= 0 && x < W && y < H && !wall[y][x];

  const CHASERS = [
    { label: 'Accept all', color: '#1A5CFF', mode: 'chase', delay: 0 },
    { label: 'Allow all', color: '#0B84D8', mode: 'ambush', delay: 3 },
    { label: 'I agree', color: '#5B4BDB', mode: 'wander', delay: 6 }
  ];

  const css = `
.ka{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;background:rgba(15,27,54,.86);backdrop-filter:blur(4px);padding:12px;font-family:var(--f-sans)}
.ka__box{background:var(--ca-night);border:2px solid var(--ca-night-2);border-radius:var(--r-3);box-shadow:6px 6px 0 var(--ca-pink);padding:14px;display:flex;flex-direction:column;gap:10px;max-width:100%;color:#fff}
.ka__bar{display:flex;align-items:center;gap:14px;font:600 .875rem/1 var(--f-sans)}
.ka__title{font-weight:800;letter-spacing:-.01em;margin-right:auto}
.ka__stat{font-variant-numeric:tabular-nums;color:#C9D2E8}.ka__stat b{color:#fff}
.ka__lives{display:flex;gap:4px}.ka__lives i{width:14px;height:14px;border-radius:50%;background:conic-gradient(from 90deg,var(--ca-night) 0 35deg,var(--ca-pink) 35deg 325deg,var(--ca-night) 0)}
.ka__x{all:unset;cursor:pointer;width:32px;height:32px;display:grid;place-items:center;border-radius:50%;background:var(--ca-night-2);font-size:18px}
.ka__x:hover,.ka__x:focus-visible{background:var(--ca-pink);color:var(--ca-ink)}
.ka__stage{position:relative;align-self:center}
.ka canvas{display:block;border-radius:14px;touch-action:none}
.ka__msg{position:absolute;inset:0;display:grid;place-items:center;text-align:center;pointer-events:none}
.ka__msg>div{background:rgba(15,27,54,.92);border:2px solid var(--ca-pink);border-radius:18px;padding:16px 22px;pointer-events:auto;max-width:80%}
.ka__msg h3{margin:0 0 6px;font:800 1.4rem/1.1 var(--f-sans);letter-spacing:-.02em}
.ka__msg p{margin:0 0 12px;color:#C9D2E8;font-size:.9rem}
.ka__msg button{font:700 .9rem var(--f-sans);border:2px solid var(--ca-ink);background:var(--ca-pink);color:var(--ca-ink);border-radius:999px;padding:.55em 1.2em;cursor:pointer}
.ka__pad{display:none;grid-template-columns:repeat(3,52px);grid-template-rows:repeat(2,44px);gap:6px;justify-content:center}
.ka__pad button{all:unset;display:grid;place-items:center;background:var(--ca-night-2);border-radius:12px;font-size:20px;color:#fff;-webkit-tap-highlight-color:transparent}
.ka__pad button:active{background:var(--ca-pink);color:var(--ca-ink)}
.ka__pad [data-d=up]{grid-column:2}.ka__pad [data-d=left]{grid-column:1;grid-row:2}.ka__pad [data-d=down]{grid-column:2;grid-row:2}.ka__pad [data-d=right]{grid-column:3;grid-row:2}
.ka__hint{font-size:.75rem;color:#8E9BBC;text-align:center}
@media (pointer:coarse){.ka__pad{display:grid}.ka__hint{display:none}}`;

  let root, canvas, ctx, msgEl, scoreEl, levelEl, livesEl, lastFocus;
  let T = 24, dpr = 1, raf = 0, running = false;
  let state;

  function build() {
    const style = document.createElement('style'); style.textContent = css; document.head.append(style);
    root = document.createElement('div');
    root.className = 'ka'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', "Kooky's arcade");
    root.innerHTML = `<div class="ka__box">
      <div class="ka__bar"><span class="ka__title">Kooky’s arcade</span>
        <span class="ka__stat">Score <b data-score>0</b></span><span class="ka__stat">Level <b data-level>1</b></span>
        <span class="ka__lives" data-lives aria-label="Lives"></span>
        <button class="ka__x" data-close aria-label="Close the game">✕</button></div>
      <div class="ka__stage"><canvas aria-label="Game board: Kooky eats cookies while Accept all buttons chase him"></canvas><div class="ka__msg" aria-live="polite"></div></div>
      <div class="ka__pad"><button data-d="up" aria-label="Up">▲</button><button data-d="left" aria-label="Left">◀</button><button data-d="down" aria-label="Down">▼</button><button data-d="right" aria-label="Right">▶</button></div>
      <div class="ka__hint">Arrow keys or WASD · P to pause · Esc to close</div></div>`;
    canvas = root.querySelector('canvas'); ctx = canvas.getContext('2d');
    msgEl = root.querySelector('.ka__msg'); scoreEl = root.querySelector('[data-score]');
    levelEl = root.querySelector('[data-level]'); livesEl = root.querySelector('[data-lives]');
    root.querySelector('[data-close]').addEventListener('click', close);
    root.addEventListener('click', e => { if (e.target === root) close(); });
    root.querySelectorAll('.ka__pad button').forEach(b => b.addEventListener('pointerdown', e => { e.preventDefault(); steer(b.dataset.d); }));
    let touch = null;
    canvas.addEventListener('pointerdown', e => { touch = [e.clientX, e.clientY]; });
    canvas.addEventListener('pointermove', e => {
      if (!touch) return;
      const dx = e.clientX - touch[0], dy = e.clientY - touch[1];
      if (Math.hypot(dx, dy) < 18) return;
      steer(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
      touch = [e.clientX, e.clientY];
    });
    addEventListener('pointerup', () => { touch = null; });
  }

  function size() {
    const box = Math.min(innerWidth - 44, innerHeight - (matchMedia('(pointer:coarse)').matches ? 230 : 140), 630);
    T = Math.max(12, Math.floor(box / W));
    dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = W * T * dpr; canvas.height = H * T * dpr;
    canvas.style.width = W * T + 'px'; canvas.style.height = H * T + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // ── State
  function newGame() {
    state = { score: 0, level: 1, lives: 3, phase: 'ready', t: 0, popups: [] };
    newLevel();
  }
  function newLevel() {
    state.cookies = new Set(); state.power = new Set();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!open(x, y)) continue;
      const k = x + ',' + y;
      if (POWER.some(([px, py]) => px === x && py === y)) state.power.add(k);
      else if (!(x === KOOKY_START[0] && y === KOOKY_START[1]) && !HOME.some(([hx, hy]) => hx === x && hy === y)) state.cookies.add(k);
    }
    resetActors();
  }
  function resetActors() {
    const sp = 1 + (state.level - 1) * .08;
    state.kooky = { x: KOOKY_START[0], y: KOOKY_START[1], dir: null, want: null, p: 0, speed: 6.2 * Math.min(sp, 1.3), mouth: 0 };
    state.chasers = CHASERS.map((c, i) => ({ ...c, x: HOME[i][0], y: HOME[i][1], dir: null, p: 0, wait: c.delay / sp, speed: 5.2 * sp, scared: 0, home: HOME[i] }));
    state.scared = 0; state.combo = 0; state.phase = 'ready'; state.t = 0;
    showMsg('Ready?', state.level === 1 && state.lives === 3 ? 'Eat every cookie. Grab a “Reject all” and the buttons are yours.' : 'Press an arrow key to go.', 'Go');
    hud();
  }

  // ── Input
  function steer(d) {
    if (!state) return;
    state.kooky.want = d;
    if (state.phase === 'ready') { hideMsg(); state.phase = 'play'; }
  }
  function onKey(e) {
    if (!root?.isConnected) return;
    const map = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right' };
    if (e.key === 'Escape') { e.preventDefault(); return close(); }
    if (map[e.key]) { e.preventDefault(); if (state.phase === 'play' || state.phase === 'ready') steer(map[e.key]); return; }
    if (e.key === 'p' || e.key === 'P') { togglePause(); return; }
    if (e.key === 'Tab') { // keep focus inside the dialog
      const f = [...root.querySelectorAll('button')].filter(b => b.offsetParent);
      if (!f.length) return;
      const i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f.at(-1).focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    }
  }
  function togglePause() {
    if (state.phase === 'play') { state.phase = 'paused'; showMsg('Paused', 'Press P or the button to carry on.', 'Carry on'); }
    else if (state.phase === 'paused') { hideMsg(); state.phase = 'play'; }
  }

  // ── Messages
  function showMsg(title, text, button) {
    msgEl.innerHTML = `<div><h3></h3><p></p>${button ? '<button type="button"></button>' : ''}</div>`;
    msgEl.querySelector('h3').textContent = title; msgEl.querySelector('p').textContent = text;
    const b = msgEl.querySelector('button');
    if (b) { b.textContent = button; b.addEventListener('click', onMsgButton); setTimeout(() => b.focus({ preventScroll: true }), 0); }
  }
  function hideMsg() { msgEl.innerHTML = ''; canvas.focus?.(); }
  function onMsgButton() {
    if (state.phase === 'over') { newGame(); return; }
    if (state.phase === 'clear') { state.level++; newLevel(); return; }
    if (state.phase === 'paused') return togglePause();
    hideMsg(); state.phase = 'play';
  }
  function hud() {
    scoreEl.textContent = state.score; levelEl.textContent = state.level;
    livesEl.innerHTML = '<i></i>'.repeat(state.lives); livesEl.setAttribute('aria-label', `${state.lives} lives`);
  }

  // ── Movement (tile to tile, p = progress 0..1 towards the next tile)
  function step(a, dt, choose) {
    let left = a.speed * dt;
    while (left > 0) {
      if (a.p === 0) { // at a tile centre: pick a direction
        a.dir = choose(a);
        if (!a.dir) return;
      }
      const need = 1 - a.p;
      if (left < need) { a.p += left; left = 0; }
      else {
        left -= need; a.p = 0;
        a.x += DIRS[a.dir][0]; a.y += DIRS[a.dir][1];
        if (a.arrive) a.arrive();
      }
    }
  }
  const canGo = (a, d) => d && open(a.x + DIRS[d][0], a.y + DIRS[d][1]);
  const reverse = d => ({ up: 'down', down: 'up', left: 'right', right: 'left' })[d];
  const pos = a => [a.x + (a.dir && a.p ? DIRS[a.dir][0] * a.p : 0), a.y + (a.dir && a.p ? DIRS[a.dir][1] * a.p : 0)];

  function moveKooky(dt) {
    const k = state.kooky;
    // Turning back is allowed mid-tile
    if (k.want && k.dir && k.p > 0 && k.want === reverse(k.dir)) { k.x += DIRS[k.dir][0]; k.y += DIRS[k.dir][1]; k.p = 1 - k.p; k.dir = k.want; }
    k.arrive = () => eat(k.x, k.y);
    step(k, dt, a => canGo(a, a.want) ? a.want : canGo(a, a.dir) ? a.dir : null);
    if (k.dir) k.mouth += dt * 14;
  }

  function eat(x, y) {
    const key = x + ',' + y;
    if (state.cookies.delete(key)) { state.score += 10; hud(); }
    if (state.power.delete(key)) {
      state.score += 50; state.combo = 0;
      state.scared = Math.max(3, 6.5 - (state.level - 1) * .5);
      state.chasers.forEach(c => { if (c.wait <= 0) { c.scared = 1; if (c.dir && c.p > 0) { c.x += DIRS[c.dir][0]; c.y += DIRS[c.dir][1]; c.p = 1 - c.p; c.dir = reverse(c.dir); } } });
      hud();
    }
    if (!state.cookies.size && !state.power.size) {
      state.phase = 'clear'; state.t = 0;
      showMsg(`Level ${state.level} cleared`, 'Every cookie eaten. The buttons get faster from here.', 'Next level');
    }
  }

  function target(c) {
    const k = state.kooky;
    if (c.mode === 'ambush' && k.dir) return [k.x + DIRS[k.dir][0] * 4, k.y + DIRS[k.dir][1] * 4];
    if (c.mode === 'wander') {
      if (Math.hypot(c.x - k.x, c.y - k.y) > 7) return [k.x, k.y];
      return [1, 19]; // gets close, then loses interest
    }
    return [k.x, k.y];
  }
  function moveChaser(c, dt) {
    if (c.wait > 0) { c.wait -= dt; return; }
    const spd = c.scared ? c.speed * .55 : c.speed;
    const saved = c.speed; c.speed = spd;
    step(c, dt, a => {
      const opts = Object.keys(DIRS).filter(d => canGo(a, d) && d !== reverse(a.dir));
      const choices = opts.length ? opts : Object.keys(DIRS).filter(d => canGo(a, d));
      if (a.scared) return choices[Math.floor(Math.random() * choices.length)];
      const [tx, ty] = target(a);
      let best = null, bd = Infinity;
      for (const d of choices) {
        const dist = Math.hypot(a.x + DIRS[d][0] - tx, a.y + DIRS[d][1] - ty);
        if (dist < bd) { bd = dist; best = d; }
      }
      return best;
    });
    c.speed = saved;
  }

  function collide() {
    const [kx, ky] = pos(state.kooky);
    for (const c of state.chasers) {
      if (c.wait > 0) continue;
      const [cx, cy] = pos(c);
      if (Math.hypot(cx - kx, cy - ky) > .65) continue;
      if (c.scared) {
        state.combo++;
        const pts = 100 * 2 ** state.combo;
        state.score += pts; hud();
        state.popups.push({ x: cx, y: cy, text: `Rejected! +${pts}`, t: 0 });
        c.x = c.home[0]; c.y = c.home[1]; c.dir = null; c.p = 0; c.scared = 0; c.wait = 2;
      } else {
        state.lives--; hud();
        state.phase = 'hit'; state.t = 0;
        state.popups.push({ x: kx, y: ky, text: 'Accepted. Oops.', t: 0 });
        return;
      }
    }
  }

  function update(dt) {
    state.t += dt;
    state.popups = state.popups.filter(p => (p.t += dt) < 1.2);
    if (state.phase === 'hit' && state.t > 1.3) {
      if (state.lives <= 0) {
        state.phase = 'over';
        showMsg('You accepted all cookies', `Score ${state.score}. Kooky would like a rematch.`, 'Play again');
      } else resetActors();
      return;
    }
    if (state.phase !== 'play') return;
    if (state.scared > 0) { state.scared -= dt; if (state.scared <= 0) state.chasers.forEach(c => { c.scared = 0; }); }
    moveKooky(dt);
    if (state.phase !== 'play') return;
    state.chasers.forEach(c => moveChaser(c, dt));
    collide();
  }

  // ── Drawing
  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
  function draw() {
    const s = T;
    ctx.fillStyle = '#0F1B36'; ctx.fillRect(0, 0, W * s, H * s);
    // The page edge
    ctx.strokeStyle = '#FF3FAF'; ctx.lineWidth = 2;
    rr(s * .5, s * .5, (W - 1) * s, (H - 1) * s, s * .5); ctx.stroke();
    // Banners
    for (const b of blocks) {
      const x = b.x * s + 2, y = b.y * s + 2, w = b.w * s - 4, h = b.h * s - 4;
      ctx.fillStyle = '#111113'; rr(x, y, w, h, s * .3); ctx.fill();
      ctx.strokeStyle = '#FF3FAF'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = '#2A3656';
      const lines = Math.max(1, Math.floor((w - s * .6) / s));
      rr(x + s * .3, y + s * .35, Math.min(w - s * .6, lines * s * .9), s * .16, 2); ctx.fill();
      if (w > s * 2.2) { rr(x + s * .3, y + s * .65, (w - s * .6) * .6, s * .16, 2); ctx.fill(); }
      if (w > s * 3.2) { ctx.fillStyle = '#1A5CFF'; rr(x + w - s * 1.25, y + h - s * .62, s * .95, s * .36, s * .18); ctx.fill(); }
    }
    // Cookies
    for (const k of state.cookies) {
      const [x, y] = k.split(',').map(Number);
      const cx = (x + .5) * s, cy = (y + .5) * s;
      ctx.fillStyle = '#C99A55'; ctx.beginPath(); ctx.arc(cx, cy, s * .14, 0, 7); ctx.fill();
      ctx.fillStyle = '#3B2416'; ctx.beginPath(); ctx.arc(cx - s * .04, cy - s * .03, s * .035, 0, 7); ctx.fill();
    }
    // "Reject all" power-ups
    const pulse = 1 + Math.sin(performance.now() / 180) * .08;
    for (const k of state.power) {
      const [x, y] = k.split(',').map(Number);
      const cx = (x + .5) * s, cy = (y + .5) * s, r = s * .36 * pulse;
      ctx.fillStyle = '#FF3FAF'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(2, s * .09); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(cx - r * .4, cy - r * .4); ctx.lineTo(cx + r * .4, cy + r * .4); ctx.moveTo(cx + r * .4, cy - r * .4); ctx.lineTo(cx - r * .4, cy + r * .4); ctx.stroke();
    }
    // Buttons that want you to accept
    for (const c of state.chasers) {
      const [x, y] = pos(c);
      const cx = (x + .5) * s, cy = (y + .5) * s, w = s * 1.5, h = s * .72;
      const flash = c.scared && state.scared < 1.5 && Math.floor(state.scared * 6) % 2;
      ctx.fillStyle = c.scared ? (flash ? '#E4E4E8' : '#6E6E76') : c.color;
      rr(cx - w / 2, cy - h / 2, w, h, h / 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = c.scared && flash ? '#111113' : '#fff';
      ctx.font = `700 ${Math.max(7, s * .26)}px Inter, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const label = c.scared ? 'Rejected' : c.label;
      ctx.fillText(label, cx, cy + .5, w - 6);
      if (c.scared) { ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx - w * .32, cy + 1); ctx.lineTo(cx + w * .32, cy + 1); ctx.stroke(); }
    }
    // Kooky
    drawKooky();
    // Pop-ups
    for (const p of state.popups) {
      ctx.globalAlpha = 1 - p.t / 1.2;
      ctx.font = `800 ${Math.max(10, s * .5)}px Inter, sans-serif`; ctx.textAlign = 'center'; ctx.lineJoin = 'round';
      ctx.strokeStyle = '#0F1B36'; ctx.lineWidth = 4; ctx.strokeText(p.text, (p.x + .5) * s, (p.y + .5 - p.t) * s);
      ctx.fillStyle = '#fff'; ctx.fillText(p.text, (p.x + .5) * s, (p.y + .5 - p.t) * s);
      ctx.globalAlpha = 1;
    }
  }
  function drawKooky() {
    const k = state.kooky, s = T;
    const [x, y] = pos(k);
    const cx = (x + .5) * s, cy = (y + .5) * s, r = s * .44;
    const ang = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }[k.dir || k.want || 'right'];
    const dying = state.phase === 'hit' ? Math.min(1, state.t / 1.1) : 0;
    const m = dying ? .1 + dying * 2.9 : (.12 + Math.abs(Math.sin(k.mouth)) * .55);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang);
    ctx.fillStyle = '#FF3FAF'; ctx.strokeStyle = '#111113'; ctx.lineWidth = Math.max(1.5, s * .08);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r, m, Math.PI * 2 - m); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    if (dying < .8) { // one googly eye on top of his head (on his side when he's heading up)
      const d = k.dir || k.want || 'right';
      const ex = cx + (d === 'up' ? -r * .55 : d === 'left' ? r * .12 : -r * .12), ey = cy + (d === 'up' ? r * .05 : -r * .55);
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#111113'; ctx.lineWidth = Math.max(1.2, s * .06);
      ctx.beginPath(); ctx.arc(ex, ey, r * .34, 0, 7); ctx.fill(); ctx.stroke();
      const wob = Math.sin(performance.now() / 120) * r * .06, [vx, vy] = DIRS[d];
      ctx.fillStyle = '#111113'; ctx.beginPath(); ctx.arc(ex + vx * r * .12 + wob, ey + vy * r * .12 + r * .05, r * .15, 0, 7); ctx.fill();
    }
  }

  let last = 0;
  function loop(now) {
    if (!running) return;
    const dt = Math.min(.05, (now - last) / 1000 || 0); last = now;
    update(dt); draw();
    raf = requestAnimationFrame(loop);
  }

  function onVisibility() { if (document.hidden && state?.phase === 'play') togglePause(); }

  function openGame() {
    if (root?.isConnected) return;
    if (!root) build();
    lastFocus = document.activeElement;
    document.body.append(root);
    document.documentElement.style.overflow = 'hidden';
    size(); newGame();
    running = true; last = performance.now(); raf = requestAnimationFrame(loop);
    addEventListener('keydown', onKey, true);
    addEventListener('resize', size);
    document.addEventListener('visibilitychange', onVisibility);
  }
  function close() {
    running = false; cancelAnimationFrame(raf);
    root.remove();
    document.documentElement.style.overflow = '';
    removeEventListener('keydown', onKey, true);
    removeEventListener('resize', size);
    document.removeEventListener('visibilitychange', onVisibility);
    lastFocus?.focus?.({ preventScroll: true });
  }

  CA.arcade = { open: openGame, close };
})();
