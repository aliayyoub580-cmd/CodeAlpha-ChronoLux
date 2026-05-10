// ============================================================
// Admin Products Management
// ============================================================

let currentPage = 1;
let totalPages = 1;
let allProducts = [];
let filteredProducts = [];

// Initialize on page load
window.addEventListener('DOMContentLoaded', async () => {
  await loadProducts();
  setupEventListeners();
});

async function loadProducts(page = 1) {
  try {
    const response = await Admin.apiCall(`/admin/products?page=${page}`);
    
    if (!response || !response.ok) {
      Admin.showToast('Error loading products', 'danger');
      return;
    }

    const data = await response.json();
    allProducts = data.products;
    currentPage = data.page;
    totalPages = data.pages;

    renderProducts(allProducts);
    renderPagination();
  } catch (error) {
    console.error('Error loading products:', error);
    Admin.showToast('Error loading products', 'danger');
  }
}

function renderProducts(products) {
  const container = document.getElementById('productsContainer');
  
  if (!products || products.length === 0) {
    container.innerHTML = `
      <div class="admin-empty-state">
        <div class="admin-empty-state-icon">📦</div>
        <div class="admin-empty-state-title">No Products</div>
        <div class="admin-empty-state-description">Start building your ChronoLux catalog by adding your first premium watch.</div>
        <a href="admin-product-form.html" class="admin-btn admin-btn-primary" style="margin-top: 20px;">
          <i class="fas fa-plus"></i> Add First Product
        </a>
      </div>
    `;
    return;
  }

  const tableHTML = `
    <div class="admin-table-wrapper">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Category</th>
            <th>Price</th>
            <th>Stock</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${products.map(product => `
            <tr>
              <td>
                <div style="display: flex; align-items: center; gap: 12px;">
                  <img src="${product.image}" alt="${product.name}" style="width: 48px; height: 48px; border-radius: 8px; object-fit: cover;">
                  <div>
                    <div style="font-weight: 700; color: var(--admin-text);">${product.name}</div>
                  </div>
                </div>
              </td>
              <td>${product.category}</td>
              <td style="font-weight: 700; color: var(--admin-gold-light);">$${product.price.toFixed(2)}</td>
              <td>
                <span style="font-weight: 700; color: ${product.stock > 10 ? 'var(--admin-success)' : product.stock > 0 ? 'var(--admin-warning)' : 'var(--admin-danger)'};">
                  ${product.stock}
                </span>
              </td>
              <td>${getStockBadge(product.stock)}</td>
              <td>
                <div style="display: flex; gap: 8px;">
                  <a href="admin-product-form.html?id=${product.id}" class="admin-btn admin-btn-sm admin-btn-secondary" title="Edit">
                    <i class="fas fa-edit"></i>
                  </a>
                  <button class="admin-btn admin-btn-sm admin-btn-danger" onclick="deleteProduct(${product.id})" title="Delete">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
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

  // Previous button
  paginationHTML += `
    <button class="admin-btn admin-btn-secondary" ${currentPage === 1 ? 'disabled' : ''} onclick="loadProducts(${currentPage - 1})">
      <i class="fas fa-chevron-left"></i>
    </button>
  `;

  // Page numbers
  for (let i = 1; i <= totalPages; i++) {
    if (i === currentPage) {
      paginationHTML += `<button class="admin-btn admin-btn-primary" disabled>${i}</button>`;
    } else {
      paginationHTML += `<button class="admin-btn admin-btn-secondary" onclick="loadProducts(${i})">${i}</button>`;
    }
  }

  // Next button
  paginationHTML += `
    <button class="admin-btn admin-btn-secondary" ${currentPage === totalPages ? 'disabled' : ''} onclick="loadProducts(${currentPage + 1})">
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
      const filtered = allProducts.filter(p => 
        p.name.toLowerCase().includes(query)
      );
      renderProducts(filtered);
    });
  }

  const categoryFilter = document.getElementById('categoryFilter');
  if (categoryFilter) {
    categoryFilter.addEventListener('change', (e) => {
      const category = e.target.value;
      const filtered = category 
        ? allProducts.filter(p => p.category === category)
        : allProducts;
      renderProducts(filtered);
    });
  }
}

async function deleteProduct(productId) {
  Admin.showConfirmDialog(
    'Delete Product',
    'Are you sure you want to delete this product? This action cannot be undone.',
    async () => {
      try {
        const response = await Admin.apiCall(`/admin/products/${productId}`, 'DELETE');
        
        if (!response || !response.ok) {
          Admin.showToast('Error deleting product', 'danger');
          return;
        }

        Admin.showToast('Product deleted successfully', 'success');
        loadProducts(currentPage);
      } catch (error) {
        console.error('Error deleting product:', error);
        Admin.showToast('Error deleting product', 'danger');
      }
    }
  );
}

function getStockBadge(stock) {
  if (stock > 10) {
    return '<span class="admin-badge badge-success">In Stock</span>';
  } else if (stock > 0) {
    return '<span class="admin-badge badge-warning">Low Stock</span>';
  } else {
    return '<span class="admin-badge badge-danger">Out of Stock</span>';
  }
}
