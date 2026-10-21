(() => {
  const root = document.documentElement, btn = document.getElementById('themeToggle');
  if (!btn) return;
  const mq = matchMedia('(prefers-color-scheme: dark)');
  const cur = () => root.dataset.theme || (mq.matches ? 'dark' : 'light');
  const sync = () => {
    const dark = cur() === 'dark';
    btn.querySelector('.i-sun').hidden = !dark;
    btn.querySelector('.i-moon').hidden = dark;
    btn.setAttribute('aria-label', dark ? 'Açık temaya geç' : 'Koyu temaya geç');
  };
  btn.addEventListener('click', () => {
    const next = cur() === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch (e) {}
    sync();
  });
  mq.addEventListener('change', sync);
  sync();
})();
