import { asyncHandler, httpError } from '../utils/http.js';
import { requireSupabase, supabaseAdmin } from '../utils/supabaseClient.js';

const HN_SEARCH_URL = 'https://hn.algolia.com/api/v1/search_by_date?tags=story&hitsPerPage=40';

function plainText(value, maxLength) {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function toNewsArticle(hit) {
  const title = plainText(hit.title, 300);
  const sourceUrl = String(hit.url || `https://news.ycombinator.com/item?id=${encodeURIComponent(hit.objectID || '')}`).trim();
  if (!title || !/^https:\/\//i.test(sourceUrl)) return null;
  return {
    title,
    summary: plainText(hit.story_text, 900) || null,
    source_name: 'Hacker News',
    source_url: sourceUrl,
    author: plainText(hit.author, 100) || null,
    published_at: hit.created_at ? new Date(hit.created_at).toISOString() : null
  };
}

async function fetchLatestNews() {
  const response = await fetch(HN_SEARCH_URL, { signal: AbortSignal.timeout(12_000) });
  if (!response.ok) throw httpError(502, 'The news provider could not be reached.');
  const payload = await response.json();
  const seenUrls = new Set();
  const articles = (payload.hits || [])
    .map(toNewsArticle)
    .filter((article) => article && !seenUrls.has(article.source_url) && seenUrls.add(article.source_url))
    .slice(0, 10);
  if (articles.length !== 10) throw httpError(502, 'The news provider did not return enough articles.');
  return articles;
}

function isAuthorizedRefresh(req) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && req.get('authorization') === `Bearer ${secret}`;
}

export const getNews = asyncHandler(async (req, res) => {
  requireSupabase();
  let { data, error } = await supabaseAdmin
    .from('news_articles')
    .select('id, title, summary, source_name, source_url, author, published_at, fetched_at')
    .order('published_at', { ascending: false })
    .limit(10);
  if (error) throw httpError(500, "Could not load today's news.", error.message);

  // Populate the first set immediately instead of leaving a new page empty
  // until the next scheduled Vercel Cron run.
  if (!data?.length) {
    const articles = await fetchLatestNews();
    const { error: refreshError } = await supabaseAdmin.rpc('replace_daily_news', { p_articles: articles });
    if (refreshError) throw httpError(500, 'Could not save the first daily news set.', refreshError.message);
    data = articles;
  }

  res.json({ articles: data || [] });
});

export const refreshNews = asyncHandler(async (req, res) => {
  if (!isAuthorizedRefresh(req)) throw httpError(401, 'Unauthorized news refresh.');
  requireSupabase();
  const articles = await fetchLatestNews();
  const { error } = await supabaseAdmin.rpc('replace_daily_news', { p_articles: articles });
  if (error) throw httpError(500, 'Could not save the daily news.', error.message);
  res.json({ message: 'Daily news refreshed.', count: articles.length });
});
