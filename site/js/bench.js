// Benchmarks table filter.
(() => {
  const btns = [...document.querySelectorAll('[data-filter]')]; if (!btns.length) return;
  btns.forEach(b => b.addEventListener('click', () => {
    btns.forEach(x => x.setAttribute('aria-pressed', x === b));
    const f = b.dataset.filter;
    document.querySelectorAll('tr[data-kind]').forEach(r => {
      const k = r.dataset.kind;
      r.hidden = !(f === 'all' || f === k || (f === 'other' && !['free', 'wall'].includes(k)));
    });
  }));
})();
