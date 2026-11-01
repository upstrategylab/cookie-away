// Homepage extras. The arcade isn't built yet: typing "cookie" gets a chomp and a promise.
(() => {
  document.addEventListener('ca:arcade', () => {
    document.querySelectorAll('.ca-mascot').forEach(window.CA.chomp);
    const t = document.createElement('div');
    t.className = 'ca-toast'; t.setAttribute('role', 'status');
    t.style.cssText = 'position:fixed;left:50%;bottom:24px;translate:-50% 0;z-index:99;animation:ca-pop var(--d-3) var(--ease-boing)';
    t.innerHTML = '<span class="ca-chomper" style="--c:28px"></span>Kooky’s arcade is coming. Nom.';
    document.body.append(t); setTimeout(() => t.remove(), 3000);
  });
})();
