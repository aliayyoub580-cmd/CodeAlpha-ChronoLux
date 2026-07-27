(function () {
  function formatDate(value) {
    if (!value) return 'Recently published';
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
  }

  function renderArticle(article) {
    const title = window.Vyntra.escapeHtml(article.title);
    const summary = window.Vyntra.escapeHtml(article.summary || 'Open the original story to read more.');
    const source = window.Vyntra.escapeHtml(article.source_name || 'News source');
    const author = article.author ? `by ${window.Vyntra.escapeHtml(article.author)}` : '';
    const url = window.Vyntra.escapeHtml(article.source_url);
    return `<article class="news-card"><div class="news-card-meta"><span>${source}</span><span>${formatDate(article.published_at)}</span></div><h2>${title}</h2><p>${summary}</p><div class="news-card-footer"><span>${author}</span><a href="${url}" target="_blank" rel="noopener noreferrer">Read story <i data-lucide="arrow-up-right"></i></a></div></article>`;
  }

  async function loadNews() {
    const mount = document.getElementById('newsList');
    if (!mount) return;
    mount.innerHTML = '<div class="news-loading"><span class="spinner-border spinner-border-sm" aria-hidden="true"></span> Loading today\'s news?</div>';
    try {
      const { articles } = await window.Vyntra.apiFetch('/api/news', { auth: false });
      mount.innerHTML = articles?.length
        ? articles.map(renderArticle).join('')
        : '<div class="empty-state"><i data-lucide="newspaper"></i><h2 class="h4 mt-3">Today\'s news is on its way</h2><p class="muted-text mb-0">The first automatic refresh has not run yet. Please check back soon.</p></div>';
    } catch (error) {
      mount.innerHTML = `<div class="empty-state"><i data-lucide="wifi-off"></i><h2 class="h4 mt-3">News unavailable</h2><p class="muted-text mb-0">${window.Vyntra.escapeHtml(error.message)}</p></div>`;
    }
    window.Vyntra.renderIcons();
  }
  document.addEventListener('DOMContentLoaded', loadNews);
})();
