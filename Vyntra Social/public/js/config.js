(function () {
  const Vyntra = {
    apiBase: '',
    config: null,
    supabase: null,
    currentUser: null,
    currentProfile: null,
    defaultAvatar: '/assets/default-avatar.png',
    defaultCover: '/assets/default-cover.jpg'
  };

  Vyntra.escapeHtml = function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  };

  Vyntra.formatDate = function formatDate(value) {
    if (!value) return '';
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }).format(new Date(value));
  };

  Vyntra.slugify = function slugify(value, fallback = 'vyntra-social') {
    const slug = String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 90)
      .replace(/-+$/g, '');
    return slug || fallback;
  };

  Vyntra.profilePath = function profilePath(profile) {
    if (!profile) return '/profile';
    if (profile.username) return `/profile/${encodeURIComponent(profile.username)}`;
    if (profile.id) return `/profile?id=${encodeURIComponent(profile.id)}`;
    return '/profile';
  };

  Vyntra.postPath = function postPath(post) {
    if (!post?.id) return '/post';
    const slug = Vyntra.slugify(post.title, 'vyntra-social-post');
    return `/post/${encodeURIComponent(post.id)}/${slug}`;
  };

  Vyntra.fileSize = function fileSize(bytes) {
    if (!bytes) return '0 KB';
    const units = ['B', 'KB', 'MB', 'GB'];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
  };

  Vyntra.showToast = function showToast(message, type = 'success') {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container position-fixed top-0 end-0 p-3';
      document.body.appendChild(container);
    }

    const tone = {
      success: 'var(--success-color)',
      danger: 'var(--danger-color)',
      warning: 'var(--warning-color)',
      info: 'var(--primary-color)'
    }[type] || 'var(--primary-color)';

    const toast = document.createElement('div');
    toast.className = 'toast align-items-center';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.innerHTML = `
      <div class="d-flex">
        <div class="toast-body d-flex align-items-center gap-2">
          <span style="width:10px;height:10px;border-radius:50%;background:${tone};display:inline-block"></span>
          <span>${Vyntra.escapeHtml(message)}</span>
        </div>
        <button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>`;

    container.appendChild(toast);
    if (window.bootstrap?.Toast) {
      const instance = new window.bootstrap.Toast(toast, { delay: 3200 });
      toast.addEventListener('hidden.bs.toast', () => toast.remove());
      instance.show();
    } else {
      setTimeout(() => toast.remove(), 3200);
    }
  };

  Vyntra.setButtonLoading = function setButtonLoading(button, loading, label) {
    if (!button) return;
    if (loading) {
      button.dataset.originalHtml = button.innerHTML;
      button.disabled = true;
      button.innerHTML = `<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>${label || 'Loading'}`;
    } else {
      button.disabled = false;
      if (button.dataset.originalHtml) button.innerHTML = button.dataset.originalHtml;
    }
  };

  Vyntra.renderIcons = function renderIcons() {
    if (window.lucide) window.lucide.createIcons();
  };

  Vyntra.ready = (async function initConfig() {
    try {
      const response = await fetch('/api/config/public');
      Vyntra.config = await response.json();

      if (Vyntra.config?.supabaseUrl && Vyntra.config?.supabaseAnonKey && window.supabase?.createClient) {
        Vyntra.supabase = window.supabase.createClient(
          Vyntra.config.supabaseUrl,
          Vyntra.config.supabaseAnonKey
        );
      }
    } catch (error) {
      Vyntra.config = { status: { ready: false }, error: error.message };
    }

    return Vyntra.config;
  })();

  Vyntra.getSession = async function getSession() {
    await Vyntra.ready;
    if (!Vyntra.supabase) return null;
    const { data } = await Vyntra.supabase.auth.getSession();
    return data?.session || null;
  };

  Vyntra.apiFetch = async function apiFetch(path, options = {}) {
    await Vyntra.ready;

    const headers = new Headers(options.headers || {});
    const fetchOptions = {
      method: options.method || 'GET',
      headers
    };

    if (options.body instanceof FormData) {
      fetchOptions.body = options.body;
    } else if (options.body !== undefined) {
      headers.set('Content-Type', 'application/json');
      fetchOptions.body = JSON.stringify(options.body);
    }

    if (options.auth !== false) {
      const session = await Vyntra.getSession();
      if (session?.access_token) headers.set('Authorization', `Bearer ${session.access_token}`);
    }

    const response = await fetch(path, fetchOptions);
    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json') ? await response.json() : await response.text();

    if (!response.ok) {
      const message = typeof payload === 'string' ? payload : payload.message;
      throw new Error(message || 'Network error');
    }

    return payload;
  };

  Vyntra.copyText = async function copyText(text) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
  };

  Vyntra.safeRedirect = function safeRedirect(value, fallback = '/') {
    if (!value) return fallback;

    try {
      const url = new URL(value, window.location.origin);
      if (url.origin !== window.location.origin) return fallback;
      return `${url.pathname}${url.search}${url.hash}`;
    } catch (error) {
      return fallback;
    }
  };

  Vyntra.currentPath = function currentPath() {
    return `${window.location.pathname}${window.location.search}${window.location.hash}` || '/';
  };

  Vyntra.loginUrl = function loginUrl(action = 'continue', redirect = Vyntra.currentPath()) {
    const params = new URLSearchParams({
      redirect: Vyntra.safeRedirect(redirect, '/'),
      action
    });
    return `/login?${params.toString()}`;
  };

  Vyntra.requireAuth = async function requireAuth(action = 'continue', redirect = Vyntra.currentPath()) {
    const session = await Vyntra.getSession();
    if (session) return true;

    Vyntra.showToast('Please login to continue.', 'info');
    window.setTimeout(() => {
      window.location.href = Vyntra.loginUrl(action, redirect);
    }, 300);
    return false;
  };

  window.Vyntra = Vyntra;
})();
