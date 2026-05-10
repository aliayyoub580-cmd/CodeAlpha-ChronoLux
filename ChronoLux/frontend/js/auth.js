const authForms = () => {
  const registerForm = document.querySelector('[data-register-form]');
  const loginForm = document.querySelector('[data-login-form]');
  const dashboard = document.querySelector('[data-dashboard]');

  const showMessage = (form, message, isError = false) => {
    const node = form?.querySelector('[data-form-message]');
    if (!node) return;
    node.textContent = message;
    node.classList.toggle('is-error', isError);
    node.classList.toggle('is-success', !isError);
  };

  if (registerForm) {
    registerForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(registerForm);
      const payload = Object.fromEntries(formData.entries());

      if (payload.password !== payload.confirmPassword) {
        return showMessage(registerForm, 'Passwords do not match.', true);
      }

      try {
        const response = await fetch(`${globalThis.ChronoLux.API_BASE}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Registration failed');

        localStorage.setItem(globalThis.ChronoLux.TOKEN_KEY, data.token);
        localStorage.setItem('chronolux_user', JSON.stringify(data.user));
        showMessage(registerForm, 'Registration complete. Redirecting...', false);
        setTimeout(() => { globalThis.location.href = 'dashboard.html'; }, 900);
      } catch (error) {
        showMessage(registerForm, error.message, true);
      }
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(loginForm);
      const payload = Object.fromEntries(formData.entries());

      try {
        const response = await fetch(`${globalThis.ChronoLux.API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Login failed');

        localStorage.setItem(globalThis.ChronoLux.TOKEN_KEY, data.token);
        localStorage.setItem('chronolux_user', JSON.stringify(data.user));
        showMessage(loginForm, 'Login successful. Redirecting...', false);
        const redirectTarget = data.user?.role === 'admin' ? 'admin.html' : 'dashboard.html';
        setTimeout(() => { globalThis.location.href = redirectTarget; }, 900);
      } catch (error) {
        showMessage(loginForm, error.message, true);
      }
    });
  }

  if (dashboard) {
    if (!globalThis.ChronoLux.isLoggedIn()) {
      globalThis.location.href = 'login.html';
      return;
    }

    const token = globalThis.ChronoLux.getToken();

    fetch(`${globalThis.ChronoLux.API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((response) => response.json())
      .then((data) => {
        const profile = dashboard.querySelector('[data-user-profile]');
        if (profile) {
          profile.innerHTML = `
            <div class="profile-card">
              <h3>${data.user.name}</h3>
              <p>${data.user.email}</p>
              <span class="chip">${data.user.role}</span>
            </div>
          `;
        }
      })
      .catch(() => null);

    fetch(`${globalThis.ChronoLux.API_BASE}/orders/my-orders`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((response) => response.json())
      .then((orders) => {
        const list = dashboard.querySelector('[data-order-history]');
        if (!list) return;
        list.innerHTML = orders.length
          ? orders.map((order) => `
            <article class="order-card">
              <div>
                <h4>Order ${order._id}</h4>
                <p>${order.items.length} item(s)</p>
              </div>
              <strong>${globalThis.ChronoLux.currency(order.total)}</strong>
              <span class="chip">${order.status}</span>
            </article>
          `).join('')
          : '<div class="empty-state"><h3>No orders yet.</h3></div>';
      })
      .catch(() => null);
  }
};

const bindAuthActions = () => {
  document.querySelectorAll('[data-logout]').forEach((button) => {
    button.addEventListener('click', () => {
      localStorage.removeItem(globalThis.ChronoLux.TOKEN_KEY);
      globalThis.location.href = 'index.html';
    });
  });
};

document.addEventListener('DOMContentLoaded', () => {
  authForms();
  bindAuthActions();
});
