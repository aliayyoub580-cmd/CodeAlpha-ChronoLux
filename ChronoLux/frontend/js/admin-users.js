// ============================================================
// Admin Users Management
// ============================================================

let currentPage = 1;
let totalPages = 1;
let allUsers = [];

window.addEventListener('DOMContentLoaded', async () => {
  await loadUsers();
  setupEventListeners();
});

async function loadUsers(page = 1) {
  try {
    const response = await Admin.apiCall(`/admin/users?page=${page}`);
    
    if (!response || !response.ok) {
      Admin.showToast('Error loading users', 'danger');
      return;
    }

    const data = await response.json();
    allUsers = data.users;
    currentPage = data.page;
    totalPages = data.pages;

    renderUsers(allUsers);
    renderPagination();
  } catch (error) {
    console.error('Error loading users:', error);
    Admin.showToast('Error loading users', 'danger');
  }
}

function renderUsers(users) {
  const container = document.getElementById('usersContainer');
  
  if (!users || users.length === 0) {
    container.innerHTML = `
      <div class="admin-empty-state">
        <div class="admin-empty-state-icon">👥</div>
        <div class="admin-empty-state-title">No Customers</div>
        <div class="admin-empty-state-description">Registered customers will appear here after account creation.</div>
      </div>
    `;
    return;
  }

  const tableHTML = `
    <div class="admin-table-wrapper">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Joined</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${users.map(user => `
            <tr>
              <td><strong>${user.name}</strong></td>
              <td style="font-size: 13px; color: var(--admin-muted);">${user.email}</td>
              <td>${getRoleBadge(user.role)}</td>
              <td style="font-size: 13px; color: var(--admin-muted);">${new Date(user.createdAt).toLocaleDateString()}</td>
              <td>
                <button class="admin-btn admin-btn-sm admin-btn-secondary" onclick="viewUserDetail(${user.id})" title="View">
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
    <button class="admin-btn admin-btn-secondary" ${currentPage === 1 ? 'disabled' : ''} onclick="loadUsers(${currentPage - 1})">
      <i class="fas fa-chevron-left"></i>
    </button>
  `;

  for (let i = 1; i <= totalPages; i++) {
    if (i === currentPage) {
      paginationHTML += `<button class="admin-btn admin-btn-primary" disabled>${i}</button>`;
    } else {
      paginationHTML += `<button class="admin-btn admin-btn-secondary" onclick="loadUsers(${i})">${i}</button>`;
    }
  }

  paginationHTML += `
    <button class="admin-btn admin-btn-secondary" ${currentPage === totalPages ? 'disabled' : ''} onclick="loadUsers(${currentPage + 1})">
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
      const filtered = allUsers.filter(user => 
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)
      );
      renderUsers(filtered);
    });
  }

  const roleFilter = document.getElementById('roleFilter');
  if (roleFilter) {
    roleFilter.addEventListener('change', (e) => {
      const role = e.target.value;
      const filtered = role 
        ? allUsers.filter(user => user.role === role)
        : allUsers;
      renderUsers(filtered);
    });
  }
}

function getRoleBadge(role) {
  if (role === 'admin') {
    return '<span class="admin-badge badge-success"><i class="fas fa-shield-alt"></i> Admin</span>';
  }
  return '<span class="admin-badge badge-muted">Customer</span>';
}

function viewUserDetail(userId) {
  window.location.href = `admin-users.html?id=${userId}`;
}
