(function () {
  const routes = {
    home: '/',
    explore: '/explore',
    profile: '/profile',
    create: '/create',
    settings: '/settings',
    login: '/login'
  };

  const publicNavItems = [
    { key: 'home', label: 'Home', href: routes.home, icon: 'home' },
    { key: 'explore', label: 'Explore', href: routes.explore, icon: 'compass' }
  ];

  const appNavItems = [
    ...publicNavItems,
    { key: 'create', label: 'Create', href: routes.create, icon: 'square-pen' },
    { key: 'profile', label: 'Profile', href: routes.profile, icon: 'user-round' },
    { key: 'settings', label: 'Settings', href: routes.settings, icon: 'settings' }
  ];

  function activeClass(itemKey, active) {
    return itemKey === active ? 'active' : '';
  }

  function isLoggedIn() {
    return Boolean(window.Vyntra?.currentUser);
  }

  function activePage() {
    const pathname = window.location.pathname.replace(/\/$/, '') || '/';
    if (pathname === '/explore' || new URLSearchParams(window.location.search).get('view') === 'explore') {
      return 'explore';
    }
    return document.body.dataset.page || 'home';
  }

  function profileHref() {
    const profile = window.Vyntra?.currentProfile;
    const id = window.Vyntra?.currentUser?.id;
    if (profile) return window.Vyntra.profilePath(profile);
    return id ? `${routes.profile}?id=${encodeURIComponent(id)}` : window.Vyntra.loginUrl('profile', routes.profile);
  }

  function navLink(item, active, className = 'nav-link-pill') {
    const href = item.key === 'profile' ? profileHref() : item.href;
    return `
      <a class="${className} ${activeClass(item.key, active)}" href="${href}">
        <i data-lucide="${item.icon}"></i><span>${item.label}</span>
      </a>`;
  }

  function renderNavbar(active) {
    const mount = document.getElementById('appNavbar');
    if (!mount) return;

    const loggedIn = isLoggedIn();
    const profile = window.Vyntra?.currentProfile;
    const avatar = profile?.profile_image_url || window.Vyntra.defaultAvatar;
    const searchValue = window.Vyntra.escapeHtml(new URLSearchParams(window.location.search).get('q') || '');

    mount.innerHTML = `
      <nav class="vyntra-navbar">
        <a class="brand-link" href="${routes.home}" aria-label="Vyntra Social home">
          <img src="/assets/logo.png" alt="Vyntra Social logo" width="34" height="34">
          <span>Vyntra Social <small class="brand-subtitle d-block">Connect. Share. Grow.</small></span>
        </a>

        <div class="nav-center" aria-label="Primary navigation">
          ${publicNavItems.map((item) => navLink(item, active)).join('')}
        </div>

        <form class="nav-search" action="${routes.explore}" role="search">
          <i data-lucide="search"></i>
          <input type="search" name="q" value="${searchValue}" placeholder="Search users or posts" aria-label="Search users or posts">
        </form>

        <div class="nav-actions">
          <button class="icon-btn" type="button" onclick="toggleTheme()" aria-label="Toggle dark and light mode" title="Toggle theme">
            <i data-theme-icon data-lucide="moon"></i>
          </button>
          <button class="icon-btn d-lg-none" type="button" data-bs-toggle="offcanvas" data-bs-target="#mobileMenu" aria-controls="mobileMenu" aria-label="Open menu">
            <i data-lucide="menu"></i>
          </button>
          ${
            loggedIn
              ? `<a class="btn btn-vyntra btn-navbar-create d-none d-md-inline-flex align-items-center gap-2" href="${routes.create}">
                   <i data-lucide="square-pen"></i><span>Create</span>
                 </a>
                 <a class="profile-btn" href="${profileHref()}" title="Profile" aria-label="Profile">
                   <img class="profile-btn-avatar" src="${avatar}" alt="${window.Vyntra.escapeHtml(profile?.full_name || 'Vyntra Social user profile avatar')}" width="38" height="38">
                 </a>
                 <button class="icon-btn d-none d-sm-inline-flex" type="button" data-logout-button aria-label="Logout" title="Logout">
                   <i data-lucide="log-out"></i>
                 </button>`
              : `<a class="btn btn-outline-vyntra btn-navbar-login" href="${routes.login}">Login</a>`
          }
        </div>
      </nav>
      <div class="offcanvas offcanvas-start" tabindex="-1" id="mobileMenu" aria-labelledby="mobileMenuLabel">
        <div class="offcanvas-header">
          <h2 class="h5 mb-0" id="mobileMenuLabel">Vyntra Social</h2>
          <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
        </div>
        <div class="offcanvas-body">
          <form class="mobile-search mb-3" action="${routes.explore}" role="search">
            <i data-lucide="search"></i>
            <input type="search" name="q" value="${searchValue}" placeholder="Search users or posts" aria-label="Search users or posts">
          </form>
          <div class="sidebar-menu">
            ${(loggedIn ? appNavItems : publicNavItems).map((item) => navLink(item, active, 'sidebar-link')).join('')}
            ${
              loggedIn
                ? '<button class="sidebar-link text-start" type="button" data-logout-button><i data-lucide="log-out"></i><span>Logout</span></button>'
                : `<a class="sidebar-link" href="${routes.login}"><i data-lucide="log-in"></i><span>Login</span></a>`
            }
          </div>
        </div>
      </div>`;

    wireLogoutButtons();
  }

  function renderSidebar(active) {
    document.querySelectorAll('.js-sidebar').forEach((mount) => {
      const showSidebar = isLoggedIn() && ['profile', 'create', 'settings'].includes(active);
      mount.innerHTML = showSidebar
        ? `
          <aside class="sidebar-card">
            <nav class="sidebar-menu" aria-label="Sidebar navigation">
              ${appNavItems.map((item) => navLink(item, active, 'sidebar-link')).join('')}
            </nav>
          </aside>`
        : '';
      mount.classList.toggle('is-hidden', !showSidebar);
    });
  }

  function renderBottomNav(active) {
    const mount = document.getElementById('mobileBottomNav');
    if (!mount) return;

    if (!isLoggedIn()) {
      mount.className = '';
      mount.innerHTML = '';
      return;
    }

    const items = [
      { key: 'home', label: 'Home', href: routes.home, icon: 'home' },
      { key: 'explore', label: 'Explore', href: routes.explore, icon: 'compass' },
      { key: 'create', label: 'Create', href: routes.create, icon: 'plus-square' },
      { key: 'profile', label: 'Profile', href: profileHref(), icon: 'user-round' }
    ];

    mount.className = 'mobile-bottom-nav';
    mount.innerHTML = items.map((item) => navLink(item, active, 'bottom-nav-link')).join('');
  }

  function renderConfigWarning() {
    if (window.Vyntra?.config?.status?.ready !== false) return;
    const mount = document.querySelector('[data-config-warning]');
    if (!mount) return;

    mount.innerHTML = `
      <div class="config-warning mb-4">
        <i data-lucide="key-round" class="mb-3" width="34" height="34"></i>
        <h1 class="h4">Supabase keys are needed</h1>
        <p class="muted-text mb-0">Add your project URL, anon key, and service role key to <code>.env</code>, then restart the server.</p>
      </div>`;
  }

  function updateFeedIntro(active) {
    const title = document.querySelector('[data-feed-title]');
    const subtitle = document.querySelector('[data-feed-subtitle]');
    const eyebrow = document.querySelector('[data-feed-eyebrow]');
    if (!title || !subtitle || !eyebrow) return;

    const query = new URLSearchParams(window.location.search).get('q');
    const robots = document.querySelector('meta[name="robots"]');
    if (active === 'explore') {
      eyebrow.textContent = 'Explore Vyntra';
      title.textContent = query ? `Search results for "${query}"` : 'Explore Posts';
      subtitle.textContent = query ? 'Public posts matching your search.' : 'Browse public posts and discover people across the community.';
      document.title = query ? 'Search Users and Posts | Vyntra Social' : 'Explore Posts | Vyntra Social';
      robots?.setAttribute('content', query ? 'noindex, follow' : 'index, follow');
      document
        .querySelector('meta[name="description"]')
        ?.setAttribute(
          'content',
          query
            ? 'Search users, profiles, and public posts on Vyntra Social to discover new people, topics, and conversations.'
            : 'Explore public posts, discover creators, search topics, and find new conversations on Vyntra Social.'
        );
      return;
    }

    eyebrow.textContent = 'Modern social networking platform';
    title.textContent = 'Vyntra Social';
    subtitle.textContent = 'Vyntra Social is a modern social networking platform designed to help users connect with people, share posts, explore public content, follow creators, and grow their online presence.';
    document.title = 'Vyntra Social | Connect, Share, Grow with a Modern Social Platform';
    robots?.setAttribute('content', 'index, follow');
  }

  async function renderRightPanel(active) {
    const mount = document.querySelector('.js-right-panel');
    if (!mount) return;

    const shouldShow = isLoggedIn() && ['profile', 'explore'].includes(active) && window.Vyntra?.currentProfile;
    mount.classList.toggle('is-hidden', !shouldShow);
    if (!shouldShow) {
      mount.innerHTML = '';
      return;
    }

    const profile = window.Vyntra.currentProfile;
    mount.innerHTML = `
      <aside class="right-stack">
        <section class="right-card">
          <div class="right-profile">
            <img class="avatar" src="${profile.profile_image_url || window.Vyntra.defaultAvatar}" alt="${window.Vyntra.escapeHtml(profile.full_name)} Vyntra Social user profile avatar" width="48" height="48">
            <div class="min-w-0">
              <strong class="d-block text-truncate">${window.Vyntra.escapeHtml(profile.full_name)}</strong>
              <span class="caption">@${window.Vyntra.escapeHtml(profile.username)}</span>
            </div>
          </div>
          <div class="right-stats">
            <div><span class="stat-number">${profile.counts?.followers || 0}</span><span class="caption">Followers</span></div>
            <div><span class="stat-number">${profile.counts?.following || 0}</span><span class="caption">Following</span></div>
            <div><span class="stat-number">${profile.counts?.posts || 0}</span><span class="caption">Posts</span></div>
          </div>
        </section>
        <section class="right-card">
          <div class="d-flex align-items-center justify-content-between mb-2">
            <h2 class="h6 mb-0">Suggested Users</h2>
            <i data-lucide="sparkles" class="muted-text"></i>
          </div>
          <div data-suggested-users>
            <div class="loader-line mb-2"></div>
            <div class="loader-line w-75"></div>
          </div>
        </section>
      </aside>`;

    try {
      const payload = await window.Vyntra.apiFetch('/api/profiles?limit=6');
      const suggested = (payload.profiles || []).filter((item) => item.id !== profile.id).slice(0, 4);
      const list = mount.querySelector('[data-suggested-users]');
      if (!suggested.length) {
        list.innerHTML = '<p class="caption mb-0">No suggestions yet.</p>';
      } else {
        list.innerHTML = suggested
          .map(
            (item) => `
              <div class="suggested-user">
                <img class="avatar avatar-sm" src="${item.profile_image_url || window.Vyntra.defaultAvatar}" alt="${window.Vyntra.escapeHtml(item.full_name)} Vyntra Social user profile avatar" width="36" height="36">
                <a class="min-w-0 flex-grow-1" href="${window.Vyntra.profilePath(item)}">
                  <strong class="d-block text-truncate">${window.Vyntra.escapeHtml(item.full_name)}</strong>
                  <span class="caption">@${window.Vyntra.escapeHtml(item.username)}</span>
                </a>
              </div>`
          )
          .join('');
      }
    } catch (error) {
      mount.querySelector('[data-suggested-users]').innerHTML = '<p class="caption mb-0">Suggestions unavailable.</p>';
    }
  }

  function wireLogoutButtons() {
    document.querySelectorAll('[data-logout-button]').forEach((button) => {
      button.addEventListener('click', () => window.logoutUser?.());
    });
  }

  function footerMarkup() {
    return `
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
      </div>`;
  }

  function renderFooter() {
    const existingFooters = document.querySelectorAll('footer.site-footer');
    if (existingFooters.length) {
      existingFooters.forEach((footer) => {
        footer.innerHTML = footerMarkup();
      });
      return;
    }

    const footer = document.createElement('footer');
    footer.className = 'site-footer';
    footer.innerHTML = footerMarkup();
    const mobileNav = document.getElementById('mobileBottomNav');
    if (mobileNav && mobileNav.parentElement) {
      mobileNav.parentElement.insertBefore(footer, mobileNav);
      return;
    }

    document.body.appendChild(footer);
  }

  function syncFooterYear() {
    const year = String(new Date().getFullYear());
    document.querySelectorAll('[data-footer-year]').forEach((node) => {
      node.textContent = year;
    });
  }

  async function initShell() {
    const active = activePage();

    renderNavbar(active);
    renderSidebar(active);
    renderBottomNav(active);
    updateFeedIntro(active);
    renderFooter();
    window.loadSavedTheme?.();
    window.Vyntra?.renderIcons?.();
    syncFooterYear();

    await window.Vyntra.ready;
    renderConfigWarning();

    const authMode = document.body.dataset.auth;
    const session = await window.Vyntra.getSession();

    if (authMode === 'required' && !session) {
      window.location.href = window.Vyntra.loginUrl(active, window.Vyntra.currentPath());
      return;
    }

    if (authMode === 'guest' && session) {
      const params = new URLSearchParams(window.location.search);
      window.location.href = window.Vyntra.safeRedirect(params.get('redirect'), routes.home);
      return;
    }

    if (session && window.getCurrentUser) {
      try {
        await window.getCurrentUser();
      } catch (error) {
        if (authMode === 'required') {
          window.Vyntra.showToast(error.message, 'danger');
        }
      }
    }

    document.body.classList.toggle('is-authenticated', Boolean(window.Vyntra.currentUser));
    renderNavbar(active);
    renderSidebar(active);
    renderBottomNav(active);
    await renderRightPanel(active);
    window.Vyntra.shellReady = true;
    window.Vyntra.renderIcons();
    syncFooterYear();
    document.dispatchEvent(new CustomEvent('vyntra:auth-ready', { detail: { session } }));
  }

  document.addEventListener('DOMContentLoaded', initShell);
})();
