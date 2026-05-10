const productState = {
  products: []
};

const fallbackProducts = () => globalThis.CHRONOLUX_PRODUCTS || [];

const fetchProducts = async () => {
  try {
    const response = await fetch(`${globalThis.ChronoLux.API_BASE}/products`);
    if (!response.ok) throw new Error('API unavailable');
    return await response.json();
  } catch (error) {
    console.warn(error);
    return fallbackProducts();
  }
};

const filterProducts = (products, filters) => {
  const searchTerm = filters.search.toLowerCase();

  return products
    .filter((product) => !filters.category || filters.category === 'all' || product.category === filters.category)
    .filter((product) => !searchTerm || `${product.name} ${product.brand} ${product.description}`.toLowerCase().includes(searchTerm))
    .filter((product) => !filters.minPrice || product.price >= Number(filters.minPrice))
    .filter((product) => !filters.maxPrice || product.price <= Number(filters.maxPrice))
    .sort((left, right) => {
      if (filters.sort === 'price-asc') return left.price - right.price;
      if (filters.sort === 'price-desc') return right.price - left.price;
      if (filters.sort === 'rating') return right.rating - left.rating;
      return new Date(right.createdAt || 0) - new Date(left.createdAt || 0);
    });
};

const productCard = (product) => {
  const productId = String(product._id || product.id);

  return `
    <article class="product-card reveal" data-reveal>
      <div class="image-wrap">
        <span class="tag">${product.tag || 'Premium Watch'}</span>
        <a class="product-card__image-wrap" href="product.html?id=${productId}">
          <img class="product-card__image" src="${product.image}" alt="${product.name} by ${product.brand}">
        </a>
        <div class="hover-actions">
          <button class="btn btn--primary" data-add-to-cart="${productId}">Add to Cart</button>
          <a href="product.html?id=${productId}" class="view-details">View Details</a>
        </div>
      </div>
      <div class="content">
        <h3 class="product-card__title">${product.name}</h3>
        <p class="price">${globalThis.ChronoLux.currency(product.price)}</p>
      </div>
    </article>
  `;
};

const revealRenderedCards = (container) => {
  container.querySelectorAll('[data-reveal]').forEach((element) => {
    element.classList.add('is-visible');
  });
};

const bindAddToCartButtons = (container = document) => {
  container.querySelectorAll('[data-add-to-cart]').forEach((button) => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      const productId = button.dataset.addToCart;
      const product = productState.products.find((entry) => String(entry._id ?? entry.id) === productId) || fallbackProducts().find((entry) => String(entry._id ?? entry.id) === productId);
      if (!product) return;
      globalThis.ChronoLux.addToCart(product, 1);
      button.textContent = 'Added';
      button.classList.add('is-added');
      setTimeout(() => {
        button.textContent = 'Add to Cart';
        button.classList.remove('is-added');
      }, 1200);
    });
  });
};

const renderFeaturedProducts = async () => {
  const container = document.querySelector('[data-featured-products]');
  if (!container) return;

  const products = await fetchProducts();
  productState.products = products;
  container.innerHTML = products.slice(0, 4).map((product) => productCard(product)).join('');
  revealRenderedCards(container);
  bindAddToCartButtons(container);
};

const renderShopProducts = async () => {
  const container = document.querySelector('[data-shop-products]');
  if (!container) return;

  const searchInput = document.querySelector('[data-search]');
  const categorySelect = document.querySelector('[data-category]');
  const sortSelect = document.querySelector('[data-sort]');
  const minPriceInput = document.querySelector('[data-min-price]');
  const maxPriceInput = document.querySelector('[data-max-price]');

  productState.products = await fetchProducts();

  const update = () => {
    const filtered = filterProducts(productState.products, {
      search: searchInput?.value || '',
      category: categorySelect?.value || 'all',
      sort: sortSelect?.value || 'newest',
      minPrice: minPriceInput?.value || '',
      maxPrice: maxPriceInput?.value || ''
    });

    container.innerHTML = filtered.map((product) => productCard(product)).join('') || '<div class="empty-state"><h3>No watches match your filters.</h3></div>';
    revealRenderedCards(container);
    bindAddToCartButtons(container);
  };

  [searchInput, categorySelect, sortSelect, minPriceInput, maxPriceInput].forEach((element) => {
    element?.addEventListener('input', update);
    element?.addEventListener('change', update);
  });

  update();
};

const renderProductDetails = async () => {
  const container = document.querySelector('[data-product-details]');
  if (!container) return;

  const params = new URLSearchParams(globalThis.location.search);
  const productId = params.get('id');
  const products = await fetchProducts();
  const product = products.find((item) => (item._id || item.id) === productId) || fallbackProducts().find((item) => (item._id || item.id) === productId) || products[0];

  if (!product) {
    container.innerHTML = '<div class="empty-state"><h3>Product not found.</h3></div>';
    return;
  }

  const gallery = (product.images || [product.image]).map((image) => `<img class="product-gallery__image" src="${image}" alt="${product.name}">`).join('');

  container.innerHTML = `
    <div class="product-detail">
      <div class="product-detail__gallery">
        ${gallery}
      </div>
      <div class="product-detail__content">
        <span class="chip">${product.category}</span>
        <h1>${product.name}</h1>
        <p class="product-detail__price">${globalThis.ChronoLux.currency(product.price)}</p>
        <div class="rating-row">${globalThis.ChronoLux.renderStars(product.rating)} <strong>${Number(product.rating).toFixed(1)}</strong></div>
        <p>${product.description}</p>
        <div class="spec-grid">
          <div><span>Brand</span><strong>${product.brand}</strong></div>
          <div><span>Movement</span><strong>${product.specifications.movement}</strong></div>
          <div><span>Case Material</span><strong>${product.specifications.caseMaterial}</strong></div>
          <div><span>Strap Material</span><strong>${product.specifications.strapMaterial}</strong></div>
          <div><span>Water Resistance</span><strong>${product.specifications.waterResistance}</strong></div>
          <div><span>Warranty</span><strong>${product.specifications.warranty}</strong></div>
        </div>
        <div class="qty-row">
          <label for="quantity">Quantity</label>
          <input id="quantity" type="number" min="1" value="1">
        </div>
        <div class="detail-actions">
          <button class="btn btn--primary" data-detail-add-to-cart>Add to Cart</button>
          <a class="btn btn--secondary" href="checkout.html">Buy Now</a>
        </div>
      </div>
    </div>
  `;

  container.querySelector('[data-detail-add-to-cart]')?.addEventListener('click', () => {
    const quantity = Number(container.querySelector('#quantity')?.value || 1);
    globalThis.ChronoLux.addToCart(product, quantity);
  });
};

const renderRelatedProducts = async () => {
  const container = document.querySelector('[data-related-products]');
  if (!container) return;

  const products = await fetchProducts();
  container.innerHTML = products.slice(0, 4).map((product) => productCard(product)).join('');
  revealRenderedCards(container);
  bindAddToCartButtons(container);
};

document.addEventListener('DOMContentLoaded', () => {
  renderFeaturedProducts();
  renderShopProducts();
  renderProductDetails();
  renderRelatedProducts();
});
