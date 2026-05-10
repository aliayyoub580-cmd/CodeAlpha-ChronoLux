// ============================================================
// Admin Orders Management
// ============================================================

let currentPage = 1;
let totalPages = 1;
let allOrders = [];

window.addEventListener('DOMContentLoaded', async () => {
  await loadOrders();
  setupEventListeners();
});

async function loadOrders(page = 1) {
  try {
    const response = await Admin.apiCall(`/admin/orders?page=${page}`);
    
    if (!response || !response.ok) {
      Admin.showToast('Error loading orders', 'danger');
      return;
    }

    const data = await response.json();
    allOrders = data.orders;
    currentPage = data.page;
    totalPages = data.pages;

    renderOrders(allOrders);
    renderPagination();
  } catch (error) {
    console.error('Error loading orders:', error);
    Admin.showToast('Error loading orders', 'danger');
  }
}

function renderOrders(orders) {
  const container = document.getElementById('ordersContainer');
  
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
            <th>Email</th>
            <th>Amount</th>
            <th>Payment</th>
            <th>Status</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${orders.map(order => `
            <tr>
              <td><strong>#${order.id}</strong></td>
              <td>${order.customerName}</td>
              <td style="font-size: 13px; color: var(--admin-muted);">${order.customerEmail}</td>
              <td style="font-weight: 700; color: var(--admin-gold-light);">$${order.total.toFixed(2)}</td>
              <td>${getPaymentBadge(order.paymentMethod)}</td>
              <td>${Admin.getStatusBadge(order.status)}</td>
              <td style="font-size: 13px; color: var(--admin-muted);">${new Date(order.createdAt).toLocaleDateString()}</td>
              <td>
                <button class="admin-btn admin-btn-sm admin-btn-secondary" onclick="viewOrderDetail(${order.id})" title="View Details">
                  <i class="fas fa-eye"></i>
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  container.innerHTML = tableHTML;
}

function renderPagination() {
  const container = document.getElementById('paginationContainer');
  
  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  let paginationHTML = '<div class="admin-flex-center" style="gap: 12px; margin-top: 24px;">';

  paginationHTML += `
    <button class="admin-btn admin-btn-secondary" ${currentPage === 1 ? 'disabled' : ''} onclick="loadOrders(${currentPage - 1})">
      <i class="fas fa-chevron-left"></i>
    </button>
  `;

  for (let i = 1; i <= totalPages; i++) {
    if (i === currentPage) {
      paginationHTML += `<button class="admin-btn admin-btn-primary" disabled>${i}</button>`;
    } else {
      paginationHTML += `<button class="admin-btn admin-btn-secondary" onclick="loadOrders(${i})">${i}</button>`;
    }
  }

  paginationHTML += `
    <button class="admin-btn admin-btn-secondary" ${currentPage === totalPages ? 'disabled' : ''} onclick="loadOrders(${currentPage + 1})">
      <i class="fas fa-chevron-right"></i>
    </button>
  `;

  paginationHTML += '</div>';
  container.innerHTML = paginationHTML;
}

function setupEventListeners() {
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();
      const filtered = allOrders.filter(order => 
        order.id.toString().includes(query) ||
        order.customerName.toLowerCase().includes(query)
      );
      renderOrders(filtered);
    });
  }

  const statusFilter = document.getElementById('statusFilter');
  if (statusFilter) {
    statusFilter.addEventListener('change', (e) => {
      const status = e.target.value;
      const filtered = status 
        ? allOrders.filter(order => order.status === status)
        : allOrders;
      renderOrders(filtered);
    });
  }
}

function getPaymentBadge(method) {
  const badges = {
    'Card': '<span class="admin-badge badge-success"><i class="fas fa-credit-card"></i> Card</span>',
    'PayPal': '<span class="admin-badge badge-success"><i class="fab fa-paypal"></i> PayPal</span>',
    'Bank Transfer': '<span class="admin-badge badge-warning"><i class="fas fa-university"></i> Bank</span>',
    'Cash': '<span class="admin-badge badge-muted"><i class="fas fa-money-bill"></i> Cash</span>'
  };

  return badges[method] || `<span class="admin-badge badge-muted">${method}</span>`;
}

function viewOrderDetail(orderId) {
  window.location.href = `admin-order-detail.html?id=${orderId}`;
}
