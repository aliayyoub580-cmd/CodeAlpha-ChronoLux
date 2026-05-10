import { httpError } from './http.js';
import { enrichPosts } from './postHelpers.js';
import { decorateProfile } from './profileHelpers.js';
import { getConfigStatus, supabaseAdmin } from './supabaseClient.js';

export const siteUrl = (process.env.SEO_SITE_URL || 'https://vyntra-socila.vercel.app').replace(/\/$/, '');
const defaultOgImage = `${siteUrl}/og-image.png`;

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function normalizeText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

export function truncateText(value, max = 155) {
  const cleaned = normalizeText(value);
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max - 3).trim()}...`;
}

export function slugify(value, fallback = 'vyntra-social') {
  const slug = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90)
    .replace(/-+$/g, '');

  return slug || fallback;
}

function profilePath(profile) {
  if (!profile?.username) return '/profile';
  return `/profile/${encodeURIComponent(profile.username)}`;
}

function postPath(post) {
  if (!post?.id) return '/post';
  return `/post/${encodeURIComponent(post.id)}/${slugify(post.title, 'vyntra-social-post')}`;
}

function absoluteUrl(pathname = '/') {
  return `${siteUrl}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
}

function safeJsonLd(data) {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

function headTags({
  title,
  description,
  canonical,
  robots = 'index, follow',
  ogType = 'website',
  image = defaultOgImage,
  jsonLd = []
}) {
  return `
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <meta name="robots" content="${escapeHtml(robots)}">
    <link rel="canonical" href="${escapeHtml(canonical)}">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:type" content="${escapeHtml(ogType)}">
    <meta property="og:site_name" content="Vyntra Social">
    <meta property="og:url" content="${escapeHtml(canonical)}">
    <meta property="og:image" content="${escapeHtml(image)}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <meta name="twitter:image" content="${escapeHtml(image)}">
    <link rel="icon" href="/favicon.ico" sizes="any">
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
    <link rel="apple-touch-icon" href="/apple-touch-icon.png">
    <link rel="manifest" href="/site.webmanifest">
    <meta name="theme-color" content="#8b5cf6">
    ${jsonLd.map((item) => `<script type="application/ld+json">${safeJsonLd(item)}</script>`).join('\n    ')}`;
}

function assetTags() {
  return `
    <link rel="preconnect" href="https://cdn.jsdelivr.net">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css">
    <link rel="stylesheet" href="/css/style.css">
    <link rel="stylesheet" href="/css/responsive.css">
    <script defer src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    <script defer src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
    <script defer src="https://cdn.jsdelivr.net/npm/lucide@latest/dist/umd/lucide.min.js"></script>
    <script defer src="/js/config.js"></script>
    <script defer src="/js/theme.js"></script>
    <script defer src="/js/auth.js"></script>
    <script defer src="/js/comments.js"></script>
    <script defer src="/js/likes.js"></script>
    <script defer src="/js/follows.js"></script>
    <script defer src="/js/posts.js"></script>
    <script defer src="/js/profile.js"></script>
    <script defer src="/js/main.js"></script>`;
}

function footerMarkup() {
  return `
    <footer class="site-footer">
      <div class="footer-glow footer-glow-left" aria-hidden="true"></div>
      <div class="footer-glow footer-glow-right" aria-hidden="true"></div>
      <div class="site-footer-inner">
        <div class="footer-brand-panel">
          <div class="footer-brand-row">
            <div class="footer-logo-mark">V</div>
            <div>
              <h2 class="footer-brand-title">Vyntra Social</h2>
              <p class="footer-brand-tag">Connect. Share. Grow.</p>
            </div>
          </div>
          <p class="footer-brand-copy">Vyntra Social is a modern social networking platform where users can connect with people, share posts, explore content, follow creators, and grow their online community.</p>
          <div class="footer-cta-card">
            <div class="footer-cta-icon"><i data-lucide="sparkles"></i></div>
            <div class="footer-cta-copy">
              <h3>Join the Community</h3>
              <p>Discover people, share ideas, and build your digital presence with Vyntra Social.</p>
            </div>
            <a class="footer-cta-button" href="/explore">Explore Vyntra <i data-lucide="arrow-right"></i></a>
          </div>
        </div>

        <div class="footer-links-grid">
          <div class="footer-links-column">
            <h3>Platform</h3>
            <a href="/">Home</a>
            <a href="/explore">Explore</a>
            <a href="/create">Create</a>
            <a href="/profile">Profile</a>
          </div>

          <div class="footer-links-column">
            <h3>Community</h3>
            <a href="/explore">Discover Users</a>
            <a href="/explore">Public Posts</a>
            <a href="/explore">Trending Topics</a>
            <a href="/explore">Suggested Creators</a>
          </div>

          <div class="footer-links-column">
            <h3>Company</h3>
            <a href="/about">About</a>
            <a href="/privacy-policy">Privacy Policy</a>
            <a href="/terms-and-conditions">Terms &amp; Conditions</a>
            <a href="mailto:support@vyntrasocial.com">Contact</a>
          </div>

          <div class="footer-newsletter-column">
            <h3>Stay in the loop</h3>
            <p>Get updates about new features, community highlights, and platform improvements.</p>
            <form class="footer-newsletter-form" action="/register" method="get">
              <label class="visually-hidden" for="footerEmail">Email address</label>
              <input id="footerEmail" name="email" type="email" placeholder="Enter your email" autocomplete="email">
              <button type="submit">Subscribe</button>
            </form>
            <div class="footer-socials" aria-label="Vyntra Social social links">
              <a href="/explore" aria-label="Updates"><i data-lucide="rss"></i></a>
              <a href="/create" aria-label="Share"><i data-lucide="share-2"></i></a>
              <a href="/profile" aria-label="Creators"><i data-lucide="users"></i></a>
              <a href="/about" aria-label="Community"><i data-lucide="globe"></i></a>
              <a href="mailto:support@vyntrasocial.com" aria-label="Contact"><i data-lucide="mail"></i></a>
            </div>
          </div>
        </div>

        <div class="site-footer-bottom">
          <p>© <span data-footer-year></span> <span class="footer-bold">Vyntra Social</span>. All rights reserved.</p>
          <p class="footer-love">Made with <i data-lucide="heart"></i> for the Vyntra community.</p>
        </div>
      </div>
    </footer>`;
}

function editPostModal() {
  return `
    <div class="modal fade" id="editPostModal" tabindex="-1" aria-labelledby="editPostModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content custom-modal">
          <div class="modal-header">
            <h5 class="modal-title" id="editPostModalLabel">Edit Post</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <input type="hidden" id="editPostId">
            <div class="mb-3">
              <label class="form-label" for="editPostTitle">Post title</label>
              <input type="text" id="editPostTitle" class="form-control" maxlength="140" required>
            </div>
            <div class="mb-3">
              <label class="form-label" for="editPostDescription">Post description</label>
              <textarea id="editPostDescription" class="form-control" rows="5" maxlength="5000" required></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" type="button" data-bs-dismiss="modal">Cancel</button>
            <button class="btn btn-primary" type="button" onclick="updatePost()">Save Changes</button>
          </div>
        </div>
      </div>
    </div>`;
}

function documentShell({ title, description, canonical, robots, ogType, image, jsonLd, bodyPage, main }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    ${headTags({ title, description, canonical, robots, ogType, image, jsonLd })}
    ${assetTags()}
  </head>
  <body data-page="${escapeHtml(bodyPage)}" data-auth="optional">
    <div id="appNavbar"></div>
    ${main}
    ${footerMarkup()}
    <nav id="mobileBottomNav" aria-label="Mobile navigation"></nav>
    ${editPostModal()}
  </body>
</html>`;
}

export async function loadPostForSeo(postId) {
  if (!getConfigStatus().ready) return null;
  if (!uuidPattern.test(postId || '')) throw httpError(404, 'Post not found.');

  const { data, error } = await supabaseAdmin.from('posts').select('*').eq('id', postId).maybeSingle();
  if (error) throw httpError(500, 'Could not load post.', error.message);
  if (!data) throw httpError(404, 'Post not found.');

  const [post] = await enrichPosts([data], null);
  return post;
}

export async function loadProfileForSeo(username) {
  if (!getConfigStatus().ready) return null;

  const rawUsername = String(username || '').replace(/^@/, '').toLowerCase();
  const candidates = [...new Set([rawUsername, rawUsername.replaceAll('-', '_')])].filter((value) =>
    /^[a-z0-9_]{3,30}$/.test(value)
  );

  if (!candidates.length) throw httpError(404, 'Profile not found.');

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .in('username', candidates)
    .limit(1)
    .maybeSingle();

  if (error) throw httpError(500, 'Could not load profile.', error.message);
  if (!data) throw httpError(404, 'Profile not found.');

  return decorateProfile(data, null);
}

export async function loadProfileByIdForSeo(profileId) {
  if (!getConfigStatus().ready) return null;
  if (!uuidPattern.test(profileId || '')) throw httpError(404, 'Profile not found.');

  const { data, error } = await supabaseAdmin.from('profiles').select('*').eq('id', profileId).maybeSingle();
  if (error) throw httpError(500, 'Could not load profile.', error.message);
  if (!data) throw httpError(404, 'Profile not found.');

  return decorateProfile(data, null);
}

export function renderPostHtml(post) {
  const author = post.author || {};
  const canonicalPath = postPath(post);
  const canonical = absoluteUrl(canonicalPath);
  const authorUrl = absoluteUrl(profilePath(author));
  const image = post.image_url || defaultOgImage;
  const description = truncateText(post.description || `Read ${post.title} on Vyntra Social.`);
  const shouldIndex = normalizeText(post.description).length >= 100;
  const published = post.created_at || new Date().toISOString();
  const modified = post.updated_at || published;

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: absoluteUrl('/') },
      { '@type': 'ListItem', position: 2, name: 'Explore', item: absoluteUrl('/explore') },
      { '@type': 'ListItem', position: 3, name: post.title, item: canonical }
    ]
  };

  const postLd = {
    '@context': 'https://schema.org',
    '@type': 'SocialMediaPosting',
    headline: post.title,
    articleBody: normalizeText(post.description),
    author: {
      '@type': 'Person',
      name: author.full_name || 'Vyntra Social user',
      url: authorUrl
    },
    publisher: {
      '@type': 'Organization',
      name: 'Vyntra Social',
      logo: {
        '@type': 'ImageObject',
        url: `${siteUrl}/assets/logo.png`
      }
    },
    datePublished: published,
    dateModified: modified,
    image,
    url: canonical
  };

  const media = post.image_url
    ? `<img class="post-image" src="${escapeHtml(post.image_url)}" alt="${escapeHtml(post.title)} shared as a post on Vyntra Social" width="1200" height="675" loading="eager" decoding="async">`
    : '';

  const main = `
    <main class="app-shell">
      <div class="layout-grid">
        <div class="sidebar-panel js-sidebar"></div>
        <section class="feed-column">
          <nav class="breadcrumb-nav" aria-label="Breadcrumb">
            <a href="/">Home</a><span>/</span><a href="/explore">Explore</a><span>/</span><span>${escapeHtml(post.title)}</span>
          </nav>
          <article class="post-card" id="singlePost">
            <header class="post-author">
              <a href="${escapeHtml(profilePath(author))}" aria-label="View ${escapeHtml(author.full_name || 'author')} on Vyntra Social">
                <img class="avatar" src="${escapeHtml(author.profile_image_url || '/assets/default-avatar.png')}" alt="${escapeHtml(author.full_name || 'Vyntra Social user')} Vyntra Social user profile avatar" width="48" height="48">
              </a>
              <div class="author-meta">
                <a class="author-name" href="${escapeHtml(profilePath(author))}">${escapeHtml(author.full_name || 'Vyntra Social user')}</a>
                <span class="author-username">@${escapeHtml(author.username || 'vyntra')} &middot; ${escapeHtml(new Date(published).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' }))}</span>
              </div>
            </header>
            <h1 class="post-title">${escapeHtml(post.title)}</h1>
            <p class="post-description">${escapeHtml(post.description)}</p>
            ${media}
            <div class="post-actions seo-link-row">
              <a class="btn btn-outline-vyntra" href="${escapeHtml(profilePath(author))}">View ${escapeHtml(author.full_name || 'author')} on Vyntra Social</a>
              <a class="btn btn-outline-vyntra" href="/explore">Explore more posts on Vyntra Social</a>
            </div>
          </article>
        </section>
        <div class="right-panel js-right-panel"></div>
      </div>
    </main>`;

  return documentShell({
    title: `${post.title} | Vyntra Social`,
    description,
    canonical,
    robots: shouldIndex ? 'index, follow' : 'noindex, follow',
    ogType: 'article',
    image,
    jsonLd: [postLd, breadcrumbLd],
    bodyPage: 'post',
    main
  });
}

export async function renderProfileHtml(profile) {
  const canonicalPath = profilePath(profile);
  const canonical = absoluteUrl(canonicalPath);
  const description = profile.bio
    ? truncateText(profile.bio)
    : `${profile.full_name} is on Vyntra Social. Follow this profile, explore public posts, and connect with people online.`;
  const shouldIndex = Boolean(profile.bio) || Number(profile.counts?.posts || 0) > 0;

  const { data: posts, error } = await supabaseAdmin
    .from('posts')
    .select('*')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(6);

  if (error) throw httpError(500, 'Could not load profile posts.', error.message);

  const postLinks = (posts || [])
    .map(
      (post) => `
        <article class="post-card">
          <h2 class="post-title"><a href="${escapeHtml(postPath(post))}">${escapeHtml(post.title)}</a></h2>
          <p class="post-description">${escapeHtml(truncateText(post.description, 220))}</p>
          <a class="read-more-btn" href="${escapeHtml(postPath(post))}">Read full post on Vyntra Social</a>
        </article>`
    )
    .join('');

  const profileLd = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    name: `${profile.full_name} | Vyntra Social`,
    url: canonical,
    mainEntity: {
      '@type': 'Person',
      name: profile.full_name,
      alternateName: `@${profile.username}`
    }
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: absoluteUrl('/') },
      { '@type': 'ListItem', position: 2, name: 'Profile', item: canonical }
    ]
  };

  const main = `
    <main class="app-shell">
      <div class="layout-grid">
        <div class="sidebar-panel js-sidebar"></div>
        <section class="feed-column">
          <nav class="breadcrumb-nav" aria-label="Breadcrumb">
            <a href="/">Home</a><span>/</span><span>${escapeHtml(profile.full_name)}</span>
          </nav>
          <div id="profileMount">
            <section class="profile-card">
              <img class="profile-cover" src="${escapeHtml(profile.cover_image_url || '/assets/default-cover.jpg')}" alt="${escapeHtml(profile.full_name)} Vyntra Social profile banner for online community platform" width="1200" height="500" loading="eager" decoding="async">
              <img class="profile-avatar" src="${escapeHtml(profile.profile_image_url || '/assets/default-avatar.png')}" alt="${escapeHtml(profile.full_name)} Vyntra Social user profile avatar" width="112" height="112">
              <div class="profile-details">
                <h1 class="page-title">${escapeHtml(profile.full_name)}</h1>
                <p class="author-username mb-0">@${escapeHtml(profile.username)}</p>
                <p class="profile-bio">${escapeHtml(profile.bio || 'No bio yet.')}</p>
                <div class="profile-stats">
                  <div><span class="stat-number">${profile.counts?.followers || 0}</span><span class="caption">Followers</span></div>
                  <div><span class="stat-number">${profile.counts?.following || 0}</span><span class="caption">Following</span></div>
                  <div><span class="stat-number">${profile.counts?.posts || 0}</span><span class="caption">Posts</span></div>
                </div>
              </div>
            </section>
          </div>
          <div id="relationshipList"></div>
          <div class="d-flex align-items-center justify-content-between mb-3">
            <h2 class="section-title">Public posts by ${escapeHtml(profile.full_name)}</h2>
          </div>
          <div id="userPosts" class="stack-gap" aria-live="polite">
            ${postLinks || '<div class="empty-state"><h2 class="h4">No public posts yet</h2><p class="muted-text mb-0">This profile has not shared public posts on Vyntra Social yet.</p></div>'}
          </div>
        </section>
        <div class="right-panel js-right-panel"></div>
      </div>
    </main>`;

  return documentShell({
    title: `${profile.full_name} | Vyntra Social`,
    description,
    canonical,
    robots: shouldIndex ? 'index, follow' : 'noindex, follow',
    ogType: 'profile',
    image: profile.profile_image_url || defaultOgImage,
    jsonLd: [profileLd, breadcrumbLd],
    bodyPage: 'profile',
    main
  });
}

export function renderNotFoundHtml() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    ${headTags({
      title: 'Page Not Found | Vyntra Social',
      description: 'The page you are looking for may have been removed or is no longer available on Vyntra Social.',
      canonical: absoluteUrl('/404'),
      robots: 'noindex, follow',
      image: defaultOgImage
    })}
    ${assetTags()}
  </head>
  <body data-page="not-found" data-auth="optional">
    <div id="appNavbar"></div>
    <main class="app-shell">
      <section class="home-feed-shell">
        <div class="empty-state">
          <h1 class="page-title">Page Not Found</h1>
          <p class="muted-text mb-4">The page you are looking for may have been removed or is no longer available.</p>
          <div class="d-flex gap-2 justify-content-center flex-wrap">
            <a class="btn btn-vyntra" href="/">Go to Vyntra Social Home</a>
            <a class="btn btn-outline-vyntra" href="/explore">Explore Public Posts</a>
          </div>
        </div>
      </section>
    </main>
    ${footerMarkup()}
  </body>
</html>`;
}

export async function renderSitemapXml() {
  const urls = [
    { loc: absoluteUrl('/'), changefreq: 'weekly', priority: '1.0', lastmod: new Date().toISOString() },
    { loc: absoluteUrl('/explore'), changefreq: 'daily', priority: '0.8', lastmod: new Date().toISOString() },
    { loc: absoluteUrl('/about'), changefreq: 'monthly', priority: '0.7', lastmod: new Date().toISOString() },
    { loc: absoluteUrl('/privacy-policy'), changefreq: 'yearly', priority: '0.4', lastmod: new Date().toISOString() },
    { loc: absoluteUrl('/terms-and-conditions'), changefreq: 'yearly', priority: '0.4', lastmod: new Date().toISOString() }
  ];

  if (getConfigStatus().ready) {
    const [postsResult, profilesResult] = await Promise.all([
      supabaseAdmin
        .from('posts')
        .select('id,title,description,created_at,updated_at')
        .order('updated_at', { ascending: false })
        .limit(1000),
      supabaseAdmin
        .from('profiles')
        .select('username,bio,created_at,updated_at')
        .not('bio', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(1000)
    ]);

    if (!postsResult.error) {
      (postsResult.data || [])
        .filter((post) => normalizeText(post.description).length >= 100)
        .forEach((post) => {
          urls.push({
            loc: absoluteUrl(postPath(post)),
            changefreq: 'monthly',
            priority: '0.8',
            lastmod: post.updated_at || post.created_at
          });
        });
    }

    if (!profilesResult.error) {
      (profilesResult.data || [])
        .filter((profile) => normalizeText(profile.bio).length > 0)
        .forEach((profile) => {
          urls.push({
            loc: absoluteUrl(profilePath(profile)),
            changefreq: 'weekly',
            priority: '0.7',
            lastmod: profile.updated_at || profile.created_at
          });
        });
    }
  }

  const entries = urls
    .map(
      (url) => `  <url>
    <loc>${escapeHtml(url.loc)}</loc>
    <lastmod>${escapeHtml(new Date(url.lastmod).toISOString().slice(0, 10))}</lastmod>
    <changefreq>${escapeHtml(url.changefreq)}</changefreq>
    <priority>${escapeHtml(url.priority)}</priority>
  </url>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}

export function renderRobotsTxt() {
  return `User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin
Disallow: /messages
Disallow: /notifications

Sitemap: ${absoluteUrl('/sitemap.xml')}
`;
}

export function canonicalPostPath(post) {
  return postPath(post);
}

export function canonicalProfilePath(profile) {
  return profilePath(profile);
}
