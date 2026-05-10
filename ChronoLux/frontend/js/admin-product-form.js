// ============================================================
// Admin Product Form Handler
// ============================================================

let productId = null;

window.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  productId = params.get('id');

  if (productId) {
    await loadProduct(productId);
    document.getElementById('formTitle').textContent = 'Edit Product';
    document.getElementById('pageTitle').textContent = 'Edit Product';
  }

  setupImageUpload();
  setupFormSubmit();
});

async function loadProduct(id) {
  try {
    const response = await Admin.apiCall(`/admin/products/${id}`);
    
    if (!response || !response.ok) {
      Admin.showToast('Error loading product', 'danger');
      return;
    }

    const product = await response.json();
    populateForm(product);
  } catch (error) {
    console.error('Error loading product:', error);
    Admin.showToast('Error loading product', 'danger');
  }
}

function populateForm(product) {
  const form = document.getElementById('productForm');
  
  form.elements['name'].value = product.name;
  form.elements['category'].value = product.category;
  form.elements['brand'].value = product.brand;
  form.elements['price'].value = product.price;
  form.elements['description'].value = product.description;
  form.elements['stock'].value = product.stock;
  form.elements['sku'].value = product.sku || '';

  // Specifications
  if (product.specifications) {
    form.elements['movementType'].value = product.specifications.movement || '';
    form.elements['strapType'].value = product.specifications.strapMaterial || '';
    form.elements['waterResistance'].value = product.specifications.waterResistance || '';
    form.elements['warranty'].value = product.specifications.warranty || '';
  }

  // Image preview
  if (product.image) {
    document.getElementById('imageUrl').value = product.image;
    showImagePreview(product.image);
  }
}

function setupImageUpload() {
  const uploadArea = document.getElementById('uploadArea');
  const imageInput = document.getElementById('imageInput');

  // Click to browse
  uploadArea.addEventListener('click', () => imageInput.click());

  // Drag and drop
  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.style.background = 'rgba(212, 169, 60, 0.1)';
    uploadArea.style.borderColor = 'var(--admin-gold)';
  });

  uploadArea.addEventListener('dragleave', () => {
    uploadArea.style.background = 'transparent';
    uploadArea.style.borderColor = 'var(--admin-border)';
  });

  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.style.background = 'transparent';
    uploadArea.style.borderColor = 'var(--admin-border)';
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleImageSelect(files[0]);
    }
  });

  // File input change
  imageInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleImageSelect(e.target.files[0]);
    }
  });
}

function handleImageSelect(file) {
  // Validate file
  if (!file.type.startsWith('image/')) {
    Admin.showToast('Please select an image file', 'warning');
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    Admin.showToast('Image must be less than 5MB', 'warning');
    return;
  }

  // Convert to base64
  const reader = new FileReader();
  reader.onload = (e) => {
    const imageData = e.target.result;
    document.getElementById('imageUrl').value = imageData;
    showImagePreview(imageData);
    Admin.showToast('Image uploaded successfully', 'success');
  };
  reader.readAsDataURL(file);
}

function showImagePreview(imageUrl) {
  const preview = document.getElementById('imagePreview');
  preview.innerHTML = `
    <div style="position: relative; display: inline-block;">
      <img src="${imageUrl}" alt="Preview" style="max-width: 200px; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.3);">
      <button type="button" class="admin-btn admin-btn-sm admin-btn-danger" style="position: absolute; top: 8px; right: 8px;" onclick="document.getElementById('imageUrl').value=''; document.getElementById('imagePreview').innerHTML=''; document.getElementById('imageInput').value=''; Admin.showToast('Image removed', 'success');">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `;
}

function setupFormSubmit() {
  const form = document.getElementById('productForm');
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await submitForm();
  });
}

async function submitForm() {
  const form = document.getElementById('productForm');
  const submitBtn = document.getElementById('submitBtn');

  // Validate required fields
  const formData = Admin.getFormData(form);
  
  // Validate image
  if (!formData.imageUrl) {
    Admin.showToast('Product image is required', 'warning');
    return;
  }

  // Prepare submission data
  const submitData = {
    name: formData.name,
    category: formData.category,
    brand: formData.brand,
    price: parseFloat(formData.price),
    description: formData.description,
    stock: parseInt(formData.stock),
    image: formData.imageUrl,
    specifications: {
      movement: formData.movementType || '',
      strapMaterial: formData.strapType || '',
      waterResistance: formData.waterResistance || '',
      warranty: formData.warranty || ''
    }
  };

  // Disable submit button
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="admin-spinner"></i> Saving...';

  try {
    let response;

    if (productId) {
      // Update existing product
      response = await Admin.apiCall(`/admin/products/${productId}`, 'PUT', submitData);
    } else {
      // Create new product
      response = await Admin.apiCall('/admin/products', 'POST', submitData);
    }

    if (!response || !response.ok) {
      const error = await response.json();
      Admin.showToast(error.message || 'Error saving product', 'danger');
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-check"></i> Save Product';
      return;
    }

    Admin.showToast(productId ? 'Product updated successfully' : 'Product created successfully', 'success');
    
    // Redirect to products list
    setTimeout(() => {
      window.location.href = 'admin-products.html';
    }, 1000);
  } catch (error) {
    console.error('Error saving product:', error);
    Admin.showToast('Error saving product', 'danger');
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-check"></i> Save Product';
  }
}
