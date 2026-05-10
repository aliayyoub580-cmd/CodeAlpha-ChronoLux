(function () {
  const storageKey = 'vyntra-theme';

  function applyTheme(theme) {
    const nextTheme = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem(storageKey, nextTheme);
    document.querySelectorAll('[data-theme-icon]').forEach((icon) => {
      icon.setAttribute('data-lucide', nextTheme === 'dark' ? 'sun' : 'moon');
    });
    window.Vyntra?.renderIcons?.();
  }

  window.loadSavedTheme = function loadSavedTheme() {
    const saved = localStorage.getItem(storageKey);
    const preferred = window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    applyTheme(saved || preferred);
  };

  window.saveTheme = function saveTheme(theme) {
    applyTheme(theme);
  };

  window.toggleTheme = function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    applyTheme(current === 'dark' ? 'light' : 'dark');
  };

  window.loadSavedTheme();
})();
