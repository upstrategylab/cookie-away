// Hero illustration: eyes follow the pointer, a nom every few seconds, click (or Enter) to chomp.
(() => {
  const svg = document.querySelector('.hz'); if (!svg || !window.CA) return;
  window.CA.svgEyes?.(svg);
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let busy = false;
  const nom = () => {
    if (busy) return; busy = true;
    svg.classList.remove('is-nom'); void svg.getBBox(); svg.classList.add('is-nom');
    setTimeout(() => { busy = false; }, 900);
  };
  setTimeout(function idle() { if (!document.hidden) nom(); setTimeout(idle, 4500 + Math.random() * 2500); }, 6000);
  const k = svg.querySelector('.hz-kooky');
  k.addEventListener('click', nom);
  k.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); nom(); } });
})();
