// Homepage extras. Typing "cookie" (or the footer's Play button) opens Kooky's arcade, loaded on first use.
(() => {
  let loading = null;
  const play = () => {
    document.querySelectorAll('.ca-mascot').forEach(window.CA.chomp);
    if (window.CA.arcade) return window.CA.arcade.open();
    loading = loading || new Promise((ok, fail) => {
      const s = document.createElement('script'); s.src = '/js/arcade.js'; s.onload = ok; s.onerror = fail; document.head.append(s);
    });
    loading.then(() => window.CA.arcade.open(), () => { loading = null; });
  };
  document.addEventListener('ca:arcade', play);
  document.querySelectorAll('[data-arcade]').forEach(b => b.addEventListener('click', play));
})();
