// ============================================================
// ChronoLux Admin Panel - Main JavaScript
// ============================================================

// Configuration
const API_BASE = '/api';
const TOKEN_KEY = 'chronolux_token';

// ============================================================
// AUTHENTICATION & INITIALIZATION
// ============================================================

// Check admin access on page load
window.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem(TOKEN_KEY);
  
  if (!token) {
    redirectToLogin();
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      redirectToLogin();
      return;
    }

    const data = await response.json();
    const user = data.user;

    if (!user) {
      redirectToLogin();
      return;
    }

    // Check if user is admin
    if (user.role !== 'admin') {
      redirectToDenied();
      return;
    }

    // Update profile
    updateAdminProfile(user);
    
    // Load dashboard data if on dashboard page
    if (window.location.pathname.includes('admin.html') || window.location.pathname.endsWith('/admin/')) {
      loadDashboardData();
    }

    // Set up logout
    setupLogout();
    setActiveNavLink();
  } catch (error) {
    console.error('Auth check failed:', error);
    redirectToLogin();
  }
});

function redirectToLogin() {
  window.location.href = 'login.html';
}

function redirectToDenied() {
  window.location.href = 'index.html';
}

function updateAdminProfile(user) {
  const adminName = document.getElementById('adminName');
  const adminAvatar = document.getElementById('adminAvatar');
  
  if (adminName) adminName.textContent = user.name;
  if (adminAvatar) adminAvatar.textContent = user.name.charAt(0).toUpperCase();
}

function setupLogout() {
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem(TOKEN_KEY);
      window.location.href = 'login.html';
    });
  }
}

function setActiveNavLink() {
  const currentPage = window.location.pathname.split('/').pop() || 'admin.html';
  const navLinks = document.querySelectorAll('.admin-nav-link');
  
  navLinks.forEach(link => {
    link.classList.remove('active');
    const href = link.getAttribute('href');
    if (href && href.includes(currentPage)) {
      link.classList.add('active');
    }
  });
}

// ============================================================
// DASHBOARD DATA LOADING
// ============================================================

async function loadDashboardData() {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    
    // Fetch all dashboard data in parallel
    const [statsRes, ordersRes, productsRes, lowStockRes] = await Promise.all([
      fetch(`${API_BASE}/admin/stats`, { 
        headers: { Authorization: `Bearer ${token}` } 
      }),
      fetch(`${API_BASE}/admin/recent-orders`, { 
        headers: { Authorization: `Bearer ${token}` } 
      }),
      fetch(`${API_BASE}/admin/top-products`, { 
        headers: { Authorization: `Bearer ${token}` } 
      }),
      fetch(`${API_BASE}/admin/low-stock`, { 
        headers: { Authorization: `Bearer ${token}` } 
      })
    ]);

    const stats = await statsRes.json();
    const orders = await ordersRes.json();
    const products = await productsRes.json();
    const lowStock = await lowStockRes.json();

    renderMetrics(stats);
    renderRecentOrders(orders);
    renderTopProducts(products);
    renderLowStockProducts(lowStock);
  } catch (error) {
    console.error('Error loading dashboard data:', error);
    showToast('Error loading dashboard data', 'danger');
  }
}

function renderMetrics(stats) {
  const container = document.getElementById('statsContainer');
  if (!container) return;

  const metrics = [
    { label: 'Total Revenue', value: `$${(stats.totalRevenue || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`, icon: 'fa-dollar-sign', color: '#d4a93c' },
    { label: 'Total Orders', value: stats.totalOrders || 0, icon: 'fa-shopping-bag', color: '#f2c94c' },
    { label: 'Total Products', value: stats.totalProducts || 0, icon: 'fa-watch', color: '#d4a93c' },
    { label: 'Total Customers', value: stats.totalCustomers || 0, icon: 'fa-users', color: '#f2c94c' },
    { label: 'Pending Orders', value: stats.pendingOrders || 0, icon: 'fa-hourglass', color: '#fca5a5' },
    { label: 'Low Stock', value: stats.lowStockProducts || 0, icon: 'fa-exclamation-triangle', color: '#fcd34d' }
  ];

  container.innerHTML = metrics.map(metric => `
    <div class="admin-metric-card">
      <div class="admin-metric-label">
        <i class="fas ${metric.icon}" style="color: ${metric.color}; margin-right: 8px;"></i>
        ${metric.label}
      </div>
      <div class="admin-metric-value">${metric.value}</div>
      <div class="admin-metric-change">↑ 12% from last month</div>
    </div>
  `).join('');
}

function renderRecentOrders(orders) {
  const container = document.getElementById('recentOrdersContainer');
  if (!container) return;

  if (!orders || orders.length === 0) {
    container.innerHTML = `
      <div class="admin-empty-state">
        <div class="admin-empty-state-icon">📦</div>
        <div class="admin-empty-state-title">No Orders</div>
        <div class="admin-empty-state-description">New customer orders will appear here once checkout activity begins.</div>
      </div>
    `;
    return;
  }

  const tableHTML = `
    <div class="admin-table-wrapper">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Customer</th>
            <th>Date</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${orders.slice(0, 5).map(order => `
            <tr>
              <td>#${order.id}</td>
              <td>${order.customerName}</td>
              <td>${new Date(order.createdAt).toLocaleDateString()}</td>
              <td>$${order.total.toFixed(2)}</td>
              <td>${getStatusBadge(order.status)}</td>
              <td>
                <a href="admin-order-detail.html?id=${order.id}" class="admin-btn admin-btn-sm admin-btn-secondary">
                  View
                </a>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  container.innerHTML = tableHTML;
}

function renderTopProducts(products) {
  const container = document.getElementById('topProductsContainer');
  if (!container) return;

  if (!products || products.length === 0) {
    container.innerHTML = `
      <div class="admin-empty-state">
        <div class="admin-empty-state-icon">📊</div>
        <div class="admin-empty-state-title">No Data</div>
        <div class="admin-empty-state-description">Top products will appear here once orders are made.</div>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 16px;">
      ${products.slice(0, 5).map((product, index) => `
        <div style="display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 12px; background: rgba(212, 169, 60, 0.05); transition: all 0.3s ease;" onmouseover="this.style.background='rgba(212, 169, 60, 0.1)'; this.style.transform='translateX(4px)';" onmouseout="this.style.background='rgba(212, 169, 60, 0.05)'; this.style.transform='translateX(0)';">
          <div style="width: 48px; height: 48px; border-radius: 8px; background: linear-gradient(135deg, #d4a93c, #f2c94c); display: flex; align-items: center; justify-content: center; font-weight: 900; color: #080d18; font-size: 14px;">
            #${index + 1}
          </div>
          <div style="flex: 1;">
            <div style="font-weight: 700; color: var(--admin-text); margin-bottom: 4px;">${product.name}</div>
            <div style="font-size: 12px; color: var(--admin-muted);">Sales: ${product.sales || 0}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-weight: 800; color: var(--admin-gold-light);">$${product.price}</div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderLowStockProducts(products) {
  const container = document.getElementById('lowStockContainer');
  if (!container) return;

  if (!products || products.length === 0) {
    container.innerHTML = `
      <div class="admin-empty-state" style="padding: 32px 0;">
        <div class="admin-empty-state-icon">✓</div>
        <div class="admin-empty-state-title">All Good</div>
        <div class="admin-empty-state-description">All products have healthy stock levels.</div>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 12px;">
      ${products.slice(0, 5).map(product => `
        <div style="display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 12px; background: rgba(239, 68, 68, 0.05); transition: all 0.3s ease;" onmouseover="this.style.background='rgba(239, 68, 68, 0.1)'; this.style.transform='translateX(4px)';" onmouseout="this.style.background='rgba(239, 68, 68, 0.05)'; this.style.transform='translateX(0)';">
          <img src="${product.image}" alt="${product.name}" style="width: 40px; height: 40px; border-radius: 8px; object-fit: cover;">
          <div style="flex: 1;">
            <div style="font-weight: 700; color: var(--admin-text); margin-bottom: 4px;">${product.name}</div>
            <div style="font-size: 12px; color: #fca5a5;">Stock: ${product.stock}</div>
          </div>
          <button class="admin-btn admin-btn-sm admin-btn-danger" onclick="window.location.href='admin-product-form.html?id=${product.id}'">
            Restock
          </button>
        </div>
      `).join('')}
    </div>
  `;
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function getStatusBadge(status) {
  const badges = {
    'Pending': 'badge-warning',
    'Confirmed': 'badge-warning',
    'Shipped': 'badge-warning',
    'Delivered': 'badge-success',
    'Cancelled': 'badge-danger'
  };

  const badgeClass = badges[status] || 'badge-muted';
  return `<span class="admin-badge ${badgeClass}">${status}</span>`;
}

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `admin-toast ${type}`;
  
  const icons = {
    success: 'fa-check-circle',
    danger: 'fa-exclamation-circle',
    warning: 'fa-info-circle'
  };

  toast.innerHTML = `
    <i class="fas ${icons[type]}"></i>
    <span>${message}</span>
  `;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideOutRight 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards';
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

function showConfirmDialog(title, message, onConfirm, onCancel) {
  const overlay = document.createElement('div');
  overlay.className = 'admin-modal-overlay';

  overlay.innerHTML = `
    <div class="admin-modal">
      <div class="admin-modal-header">
        <h3 class="admin-modal-title">${title}</h3>
      </div>
      <div class="admin-modal-body">
        <p class="admin-body-text">${message}</p>
      </div>
      <div class="admin-modal-footer">
        <button class="admin-btn admin-btn-secondary" id="cancelBtn">Cancel</button>
        <button class="admin-btn admin-btn-danger" id="confirmBtn">Confirm</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelector('#confirmBtn').addEventListener('click', () => {
    overlay.remove();
    onConfirm();
  });

  overlay.querySelector('#cancelBtn').addEventListener('click', () => {
    overlay.remove();
    if (onCancel) onCancel();
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.remove();
      if (onCancel) onCancel();
    }
  });
}

// ============================================================
// API HELPERS
// ============================================================

async function getAuthHeaders() {
  const token = localStorage.getItem(TOKEN_KEY);
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

async function apiCall(endpoint, method = 'GET', data = null) {
  const options = {
    method,
    headers: await getAuthHeaders()
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, options);

  if (response.status === 401) {
    redirectToLogin();
    return null;
  }

  return response;
}

// ============================================================
// FORM UTILITIES
// ============================================================

function getFormData(formElement) {
  const formData = new FormData(formElement);
  const data = {};

  formData.forEach((value, key) => {
    if (data[key]) {
      if (Array.isArray(data[key])) {
        data[key].push(value);
      } else {
        data[key] = [data[key], value];
      }
    } else {
      data[key] = value;
    }
  });

  return data;
}

function validateFormData(data, rules) {
  const errors = {};

  for (const [field, fieldRules] of Object.entries(rules)) {
    const value = data[field];

    if (fieldRules.required && !value) {
      errors[field] = `${field} is required`;
    }

    if (fieldRules.minLength && value && value.length < fieldRules.minLength) {
      errors[field] = `${field} must be at least ${fieldRules.minLength} characters`;
    }

    if (fieldRules.maxLength && value && value.length > fieldRules.maxLength) {
      errors[field] = `${field} must not exceed ${fieldRules.maxLength} characters`;
    }

    if (fieldRules.pattern && value && !fieldRules.pattern.test(value)) {
      errors[field] = fieldRules.patternMessage || `${field} format is invalid`;
    }

    if (fieldRules.custom && value) {
      const customError = fieldRules.custom(value);
      if (customError) {
        errors[field] = customError;
      }
    }
  }

  return errors;
}

function displayFormErrors(errors, formElement) {
  // Clear previous errors
  formElement.querySelectorAll('.admin-error-message').forEach(el => el.remove());
  formElement.querySelectorAll('.admin-input-error').forEach(el => el.classList.remove('admin-input-error'));

  // Display new errors
  for (const [field, message] of Object.entries(errors)) {
    const input = formElement.querySelector(`[name="${field}"]`);
    if (input) {
      input.classList.add('admin-input-error');
      const errorEl = document.createElement('div');
      errorEl.className = 'admin-error-message';
      errorEl.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
      input.parentElement.appendChild(errorEl);
    }
  }
}

// ============================================================
// TABLE UTILITIES
// ============================================================

function createTableRow(data, columns) {
  return `<tr>
    ${columns.map(col => `<td>${col.render ? col.render(data[col.key]) : data[col.key]}</td>`).join('')}
  </tr>`;
}

// Export admin utilities globally
window.Admin = {
  apiCall,
  getFormData,
  validateFormData,
  displayFormErrors,
  showToast,
  showConfirmDialog,
  getStatusBadge,
  redirectToLogin,
  setActiveNavLink
};
