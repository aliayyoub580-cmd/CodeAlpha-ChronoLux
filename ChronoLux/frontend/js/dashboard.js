// Dashboard Module - Premium User Dashboard
const DashboardModule = (() => {
  const DEBUG = true;

  const log = (label, data) => {
    if (DEBUG) {
      console.log(`[Dashboard] ${label}:`, data);
    }
  };

  // Initialize dashboard
  const init = async () => {
    log('Initializing dashboard', { 
      loggedIn: ChronoLux.isLoggedIn(),
      hasUser: !!localStorage.getItem('chronolux_user'),
      hasToken: !!ChronoLux.getToken()
    });

    // Render content first (with skeletons)
    await renderUserProfile();
    await renderOrderStats();
    await renderOrderHistory();
    setupLogout();

    // Then check page protection (user can see content while deciding to redirect)
    if (!ChronoLux.isLoggedIn()) {
      log('User not logged in', 'Redirecting to login.html');
      setTimeout(() => {
        globalThis.location.href = 'login.html';
      }, 3000); // 3 second delay so user sees the empty dashboard before redirect
    }
  };

  // Render user profile information
  const renderUserProfile = async () => {
    const profileContainer = document.querySelector('[data-user-profile]');
    log('Profile container found', !!profileContainer);

    if (!profileContainer) {
      log('ERROR', 'Profile container not found');
      return;
    }

    try {
      let userData = null;
      
      // Try to fetch from API first
      try {
        const token = ChronoLux.getToken();
        if (token) {
          log('Fetching user data from API with token', !!token);
          const response = await fetch(`${ChronoLux.API_BASE}/auth/me`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });

          if (response.ok) {
            const apiData = await response.json();
            userData = apiData.user;
            log('User data from API', userData);
            // Save to localStorage for offline access
            localStorage.setItem('chronolux_user', JSON.stringify(userData));
          } else {
            log('API response not ok', response.status);
          }
        }
      } catch (apiError) {
        log('API fetch failed, trying localStorage', apiError.message);
      }
      
      // Fallback to localStorage if API fails
      if (!userData) {
        const userDataStr = localStorage.getItem('chronolux_user');
        userData = userDataStr ? JSON.parse(userDataStr) : null;
        log('User data from localStorage', userData);
      }

      // Show content if user data exists
      if (userData && userData.name && userData.email) {
        const roleDisplay = userData.role 
          ? `<span class="role-badge">● ${userData.role.toUpperCase()}</span>` 
          : '<span class="role-badge">● USER</span>';

        profileContainer.innerHTML = `
          <div class="profile-display">
            <div class="profile-field">
              <span class="profile-label">Full Name</span>
              <span class="profile-value">${userData.name}</span>
            </div>
            <div class="profile-field">
              <span class="profile-label">Email Address</span>
              <span class="profile-value">${userData.email}</span>
            </div>
            <div class="profile-field">
              <span class="profile-label">Account Status</span>
              <div>${roleDisplay}</div>
            </div>
          </div>
        `;
        log('Profile rendered', 'User data found and displayed');
      } else {
        // Show "not available" message
        profileContainer.innerHTML = `
          <div class="profile-display">
            <p class="profile-label" style="color: #cbd5e1; margin: 1rem 0;">Profile information not available. Please log in.</p>
          </div>
        `;
        log('Profile empty', 'No user data found');
      }
    } catch (error) {
      log('ERROR rendering profile', error.message);
      profileContainer.innerHTML = `
        <div class="profile-display">
          <p class="profile-label" style="color: #ef4444; margin: 1rem 0;">⚠️ Error: ${error.message}</p>
        </div>
      `;
    }
  };

  // Calculate and display order statistics
  const renderOrderStats = async () => {
    try {
      let orders = [];
      
      // Try to fetch from API first
      try {
        const token = ChronoLux.getToken();
        log('Fetching orders from API with token', !!token);
        
        const response = await fetch(`${ChronoLux.API_BASE}/orders/my-orders`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const apiOrders = await response.json();
          log('Orders from API', apiOrders);
          orders = Array.isArray(apiOrders) ? apiOrders : [];
        } else {
          log('API response not ok', response.status);
        }
      } catch (apiError) {
        log('API fetch failed, trying localStorage', apiError.message);
        const ordersStr = localStorage.getItem('chronolux_orders');
        orders = ordersStr ? JSON.parse(ordersStr) : [];
      }

      const totalOrders = orders.length;
      const totalSpent = orders.reduce((sum, order) => {
        const orderTotal = parseFloat(order.total) || 0;
        return sum + orderTotal;
      }, 0);

      log('Order stats', { totalOrders, totalSpent });

      const totalOrdersEl = document.querySelector('[data-total-orders]');
      const totalSpentEl = document.querySelector('[data-total-spent]');

      log('Stats elements found', {
        orders: !!totalOrdersEl,
        spent: !!totalSpentEl
      });

      if (totalOrdersEl) {
        totalOrdersEl.textContent = totalOrders.toString();
        log('Total orders rendered', totalOrders);
      }

      if (totalSpentEl) {
        totalSpentEl.textContent = ChronoLux.currency(totalSpent);
        log('Total spent rendered', ChronoLux.currency(totalSpent));
      }
    } catch (error) {
      log('ERROR rendering stats', error.message);
    }
  };

  // Render order history
  const renderOrderHistory = async () => {
    const orderHistoryContainer = document.querySelector('[data-order-history]');
    log('Order history container found', !!orderHistoryContainer);

    if (!orderHistoryContainer) {
      log('ERROR', 'Order history container not found');
      return;
    }

    try {
      let orders = [];

      // Try to fetch from API first
      try {
        const token = ChronoLux.getToken();
        log('Fetching order history from API with token', !!token);
        
        const response = await fetch(`${ChronoLux.API_BASE}/orders/my-orders`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const apiOrders = await response.json();
          log('Order history from API', apiOrders);
          orders = Array.isArray(apiOrders) ? apiOrders : [];
        } else {
          log('API response not ok', response.status);
        }
      } catch (apiError) {
        log('API fetch failed, trying localStorage', apiError.message);
        const ordersStr = localStorage.getItem('chronolux_orders');
        orders = ordersStr ? JSON.parse(ordersStr) : [];
      }

      if (!orders || orders.length === 0) {
        log('No orders', 'Showing empty state');
        orderHistoryContainer.innerHTML = `
          <div class="empty-orders">
            <p class="empty-orders__icon">📦</p>
            <p class="empty-orders__title">No Orders Yet</p>
            <p class="empty-orders__text">Start your collection with a premium ChronoLux timepiece</p>
            <a href="shop.html" class="btn btn--primary">Shop Now</a>
          </div>
        `;
        return;
      }

      const ordersHTML = orders
        .sort((a, b) => {
          const dateA = new Date(a.createdAt || a.created_at || 0);
          const dateB = new Date(b.createdAt || b.created_at || 0);
          return dateB - dateA;
        })
        .map((order) => {
          const dateStr = order.createdAt || order.created_at;
          const date = dateStr
            ? new Date(dateStr).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })
            : 'N/A';

          const statusClass = (order.status || 'Pending').toLowerCase().replace(/\s+/g, '-');
          const statusText = order.status || 'Pending';
          const orderId = order.id || Math.random().toString(36).substr(2, 9);
          const total = ChronoLux.currency(parseFloat(order.total) || 0);

          return `
            <div class="order-row">
              <div>
                <div class="order-id">Order #${orderId}</div>
                <div class="order-date">${date}</div>
              </div>
              <div class="order-price">${total}</div>
              <span class="order-status ${statusClass}">${statusText}</span>
            </div>
          `;
        })
        .join('');

      orderHistoryContainer.innerHTML = ordersHTML;
      log('Orders rendered', { count: orders.length });
    } catch (error) {
      log('ERROR rendering orders', error.message);
      orderHistoryContainer.innerHTML = `
        <div class="empty-orders">
          <p class="empty-orders__icon">⚠️</p>
          <p class="empty-orders__title">Error Loading Orders</p>
          <p class="empty-orders__text">Unable to fetch your order history. Error: ${error.message}</p>
        </div>
      `;
    }
  };

  // Logout functionality
  const setupLogout = () => {
    const logoutBtn = document.querySelector('[data-logout]');
    log('Logout button found', !!logoutBtn);

    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        log('Logout clicked', 'Clearing storage and redirecting');
        localStorage.removeItem('chronolux_token');
        localStorage.removeItem('chronolux_user');
        localStorage.removeItem('chronolux_orders');
        globalThis.location.href = 'index.html';
      });
    }
  };

  // Wait for both DOM and ChronoLux to be ready
  const waitForChronoLux = () => {
    if (typeof ChronoLux !== 'undefined') {
      log('ChronoLux ready', 'Starting init');
      init();
    } else {
      log('ChronoLux not ready', 'Retrying...');
      setTimeout(waitForChronoLux, 100);
    }
  };

  // Initialize on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      log('DOM loaded', 'Waiting for ChronoLux');
      waitForChronoLux();
    });
  } else {
    log('DOM already loaded', 'Waiting for ChronoLux');
    waitForChronoLux();
  }

  return {
    init,
    renderUserProfile,
    renderOrderStats,
    renderOrderHistory
  };
})();
