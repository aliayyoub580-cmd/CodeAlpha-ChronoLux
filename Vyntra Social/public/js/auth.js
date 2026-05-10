(function () {
  async function setSupabaseSession(session) {
    if (!session?.access_token || !window.Vyntra.supabase) return;
    await window.Vyntra.supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token
    });
  }

  function postAuthRedirect() {
    const params = new URLSearchParams(window.location.search);
    return window.Vyntra.safeRedirect(params.get('redirect'), '/');
  }

  function preserveAuthRedirectLinks() {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get('redirect');
    if (!redirect) return;

    document.querySelectorAll('a[href="/login"], a[href="/register"]').forEach((link) => {
      const next = new URL(link.getAttribute('href'), window.location.origin);
      next.searchParams.set('redirect', window.Vyntra.safeRedirect(redirect, '/'));
      if (params.get('action')) next.searchParams.set('action', params.get('action'));
      link.href = `${next.pathname}${next.search}`;
    });
  }

  window.getCurrentUser = async function getCurrentUser() {
    const session = await window.Vyntra.getSession();
    if (!session) return null;

    const payload = await window.Vyntra.apiFetch('/api/auth/session');
    window.Vyntra.currentUser = payload.user;
    window.Vyntra.currentProfile = payload.profile;
    return payload;
  };

  window.registerUser = async function registerUser(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('[type="submit"]');

    const body = {
      full_name: form.full_name.value,
      username: form.username.value,
      email: form.email.value,
      password: form.password.value,
      confirm_password: form.confirm_password.value
    };

    try {
      window.Vyntra.setButtonLoading(button, true, 'Creating account');
      const payload = await window.Vyntra.apiFetch('/api/auth/register', {
        method: 'POST',
        auth: false,
        body
      });

      if (payload.session) {
        await setSupabaseSession(payload.session);
        window.Vyntra.showToast(payload.message || 'Registration successful');
        window.location.href = postAuthRedirect();
      } else {
        window.Vyntra.showToast('Registration successful. Check your email if confirmation is enabled.');
        window.location.href = window.Vyntra.loginUrl('continue', postAuthRedirect());
      }
    } catch (error) {
      window.Vyntra.showToast(error.message || 'Invalid form input', 'danger');
    } finally {
      window.Vyntra.setButtonLoading(button, false);
    }
  };

  window.loginUser = async function loginUser(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('[type="submit"]');

    try {
      window.Vyntra.setButtonLoading(button, true, 'Signing in');
      const payload = await window.Vyntra.apiFetch('/api/auth/login', {
        method: 'POST',
        auth: false,
        body: {
          email: form.email.value,
          password: form.password.value
        }
      });

      await setSupabaseSession(payload.session);
      window.Vyntra.currentUser = payload.user;
      window.Vyntra.currentProfile = payload.profile;
      window.Vyntra.showToast(payload.message || 'Login successful');
      window.location.href = postAuthRedirect();
    } catch (error) {
      window.Vyntra.showToast(error.message || 'Invalid email or password', 'danger');
    } finally {
      window.Vyntra.setButtonLoading(button, false);
    }
  };

  window.loginWithGoogle = async function loginWithGoogle() {
    await window.Vyntra.ready;
    if (!window.Vyntra.supabase) {
      window.Vyntra.showToast('Supabase is not configured yet.', 'warning');
      return;
    }

    const { error } = await window.Vyntra.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}${postAuthRedirect()}`
      }
    });

    if (error) window.Vyntra.showToast(error.message, 'danger');
  };

  window.logoutUser = async function logoutUser() {
    try {
      await window.Vyntra.apiFetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      // Local sign-out still matters if the server token has already expired.
    }

    if (window.Vyntra.supabase) {
      await window.Vyntra.supabase.auth.signOut();
    }

    window.Vyntra.currentUser = null;
    window.Vyntra.currentProfile = null;
    window.Vyntra.showToast('Logout successful');
    window.location.href = '/';
  };

  function initAuthForms() {
    const registerForm = document.getElementById('registerForm');
    const loginForm = document.getElementById('loginForm');
    const googleButtons = document.querySelectorAll('[data-google-login]');

    if (registerForm) registerForm.addEventListener('submit', window.registerUser);
    if (loginForm) loginForm.addEventListener('submit', window.loginUser);
    googleButtons.forEach((button) => button.addEventListener('click', window.loginWithGoogle));
    preserveAuthRedirectLinks();
  }

  document.addEventListener('DOMContentLoaded', initAuthForms);
})();
