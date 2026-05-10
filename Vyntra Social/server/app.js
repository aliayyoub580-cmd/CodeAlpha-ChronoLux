import cors from 'cors';
import express from 'express';
import fs from 'fs/promises';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';

import authRoutes from './routes/authRoutes.js';
import commentRoutes from './routes/commentRoutes.js';
import followRoutes from './routes/followRoutes.js';
import likeRoutes from './routes/likeRoutes.js';
import postRoutes from './routes/postRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import repostRoutes from './routes/repostRoutes.js';
import shareRoutes from './routes/shareRoutes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { getPublicConfig } from './controllers/authController.js';
import { asyncHandler } from './utils/http.js';
import {
  canonicalProfilePath,
  canonicalPostPath,
  loadProfileByIdForSeo,
  loadPostForSeo,
  loadProfileForSeo,
  renderNotFoundHtml,
  renderPostHtml,
  renderProfileHtml,
  renderRobotsTxt,
  renderSitemapXml
} from './utils/seoRenderer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');

const app = express();

app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(morgan('dev'));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(
  '/api',
  rateLimit({
    windowMs: 60 * 1000,
    limit: 180,
    standardHeaders: true,
    legacyHeaders: false
  })
);

app.get('/api/health', (req, res) => {
  res.json({ ok: true, name: 'Vyntra Social', tagline: 'Connect. Share. Grow.' });
});

app.get('/api/config/public', getPublicConfig);
app.use('/api/auth', authRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/posts', postRoutes);
app.use('/api', commentRoutes);
app.use('/api/posts', likeRoutes);
app.use('/api/posts', shareRoutes);
app.use('/api/posts', repostRoutes);
app.use('/api/users', followRoutes);

app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(renderRobotsTxt());
});

app.get(
  '/sitemap.xml',
  asyncHandler(async (req, res) => {
    res.type('application/xml').send(await renderSitemapXml());
  })
);

async function sendHtmlFile(res, file, replacements = {}) {
  const filepath = path.join(publicDir, file);
  let html = await fs.readFile(filepath, 'utf8');
  Object.entries(replacements).forEach(([from, to]) => {
    html = html.replace(from, to);
  });
  res.type('html').send(html);
}

const pageFiles = {
  '/': 'index.html',
  '/home': 'index.html',
  '/about': 'about.html',
  '/feed': 'feed.html',
  '/privacy-policy': 'privacy-policy.html',
  '/login': 'login.html',
  '/register': 'register.html',
  '/create': 'create-post.html',
  '/settings': 'edit-profile.html',
  '/terms': 'terms.html',
  '/terms-and-conditions': 'terms.html'
};

app.get(
  '/explore',
  asyncHandler(async (req, res) => {
    const hasSearch = Boolean(String(req.query.q || req.query.search || '').trim());
    if (!hasSearch) {
      await sendHtmlFile(res, 'explore.html');
      return;
    }

    await sendHtmlFile(res, 'explore.html', {
      '<title>Explore Posts | Vyntra Social</title>': '<title>Search Users and Posts | Vyntra Social</title>',
      '<meta name="description" content="Explore public posts, discover creators, search topics, and find new conversations on Vyntra Social.">':
        '<meta name="description" content="Search users, profiles, and public posts on Vyntra Social to discover new people, topics, and conversations.">',
      '<meta name="robots" content="index, follow">': '<meta name="robots" content="noindex, follow">'
    });
  })
);

Object.entries(pageFiles).forEach(([route, file]) => {
  app.get(route, (req, res) => {
    res.sendFile(path.join(publicDir, file));
  });
});

app.get(
  '/profile',
  asyncHandler(async (req, res) => {
    const profileId = typeof req.query.id === 'string' ? req.query.id : '';
    if (!profileId) {
      res.sendFile(path.join(publicDir, 'profile.html'));
      return;
    }

    const profile = await loadProfileByIdForSeo(profileId);
    if (!profile) {
      res.sendFile(path.join(publicDir, 'profile.html'));
      return;
    }

    res.redirect(301, canonicalProfilePath(profile));
  })
);

app.get(
  '/post',
  asyncHandler(async (req, res) => {
    const postId = typeof req.query.id === 'string' ? req.query.id : '';
    if (!postId) {
      res.sendFile(path.join(publicDir, 'post.html'));
      return;
    }

    const post = await loadPostForSeo(postId);
    if (!post) {
      res.sendFile(path.join(publicDir, 'post.html'));
      return;
    }

    res.redirect(301, canonicalPostPath(post));
  })
);

app.get(
  '/profile/:username',
  asyncHandler(async (req, res) => {
    const profile = await loadProfileForSeo(req.params.username);
    if (!profile) {
      res.sendFile(path.join(publicDir, 'profile.html'));
      return;
    }

    res.type('html').send(await renderProfileHtml(profile));
  })
);

app.get(
  '/post/:id/:slug?',
  asyncHandler(async (req, res) => {
    const post = await loadPostForSeo(req.params.id);
    if (!post) {
      res.sendFile(path.join(publicDir, 'post.html'));
      return;
    }

    const canonical = canonicalPostPath(post);
    if (req.path !== canonical) {
      res.redirect(301, canonical);
      return;
    }

    res.type('html').send(renderPostHtml(post));
  })
);

app.get('/404.html', (req, res) => {
  res.status(404).type('html').send(renderNotFoundHtml());
});

app.use(express.static(publicDir));

app.use('/api', notFoundHandler);

app.use((req, res) => {
  res.status(404).type('html').send(renderNotFoundHtml());
});

app.use((error, req, res, next) => {
  const status = error.status || error.statusCode;
  if (!req.path.startsWith('/api') && status === 404) {
    res.status(404).type('html').send(renderNotFoundHtml());
    return;
  }
  next(error);
});

app.use(errorHandler);

export default app;
