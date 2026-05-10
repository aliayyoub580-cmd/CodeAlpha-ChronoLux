// Admin Categories Management
let categories = [
  { id: 1, name: 'Luxury Watches', slug: 'luxury-watches', visible: true },
  { id: 2, name: 'Sports Watches', slug: 'sports-watches', visible: true },
  { id: 3, name: 'Smart Watches', slug: 'smart-watches', visible: true },
  { id: 4, name: 'Classic Watches', slug: 'classic-watches', visible: true },
  { id: 5, name: "Men's Watches", slug: 'mens-watches', visible: true },
  { id: 6, name: "Women's Watches", slug: 'womens-watches', visible: true },
  { id: 7, name: 'Kids Watches', slug: 'kids-watches', visible: true }
];

window.addEventListener('DOMContentLoaded', () => {
  renderCategories();
  document.getElementById('addCategoryBtn').addEventListener('click', addCategory);
});

function renderCategories() {
  const container = document.getElementById('categoriesContainer');
  
  container.innerHTML = `
    <div style="display: grid; gap: 16px;">
      ${categories.map(category => `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 20px; border-radius: 16px; background: rgba(212, 169, 60, 0.05); transition: all 0.3s ease;" onmouseover="this.style.background='rgba(212, 169, 60, 0.08)'; this.style.transform='translateX(4px)';" onmouseout="this.style.background='rgba(212, 169, 60, 0.05)'; this.style.transform='translateX(0)';">
          <div>
            <div style="font-weight: 800; font-size: 16px; color: var(--admin-text); margin-bottom: 4px;">${category.name}</div>
            <div style="font-size: 13px; color: var(--admin-muted);">${category.slug}</div>
          </div>
          <div style="display: flex; gap: 12px; align-items: center;">
            <span class="admin-badge ${category.visible ? 'badge-success' : 'badge-muted'}">${category.visible ? 'Visible' : 'Hidden'}</span>
            <button class="admin-btn admin-btn-sm admin-btn-secondary" onclick="editCategory(${category.id})" title="Edit">
              <i class="fas fa-edit"></i>
            </button>
            <button class="admin-btn admin-btn-sm admin-btn-danger" onclick="deleteCategory(${category.id})" title="Delete">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function addCategory() {
  Admin.showConfirmDialog(
    'Coming Soon',
    'Category management is under development. This feature will allow you to create, edit, and manage product categories.',
    () => {
      Admin.showToast('Feature coming soon!', 'warning');
    }
  );
}

function editCategory(id) {
  Admin.showToast('Edit feature coming soon!', 'warning');
}

function deleteCategory(id) {
  Admin.showConfirmDialog(
    'Delete Category',
    'Are you sure you want to delete this category?',
    () => {
      categories = categories.filter(c => c.id !== id);
      renderCategories();
      Admin.showToast('Category deleted successfully', 'success');
    }
  );
}
