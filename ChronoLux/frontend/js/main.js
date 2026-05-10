// Dynamically determine API_BASE based on current location
const getAPIBase = () => {
  // If running on a file:// URL or no protocol, use localhost:5000
  if (!globalThis.location.protocol.startsWith('http')) {
    return 'http://localhost:5000/api';
  }
  
  // If backend is on a different port (like 5000), but frontend is served from elsewhere
  const protocol = globalThis.location.protocol; // http: or https:
  const hostname = globalThis.location.hostname; // localhost, 127.0.0.1, or domain name
  
  // Check if we're running on a dev server (common ports: 3000, 5500, 8080, 8000)
  const devServerPorts = [3000, 5500, 8080, 8000, 3001, 3002, 5173, 5174];
  
  if (devServerPorts.includes(globalThis.location.port)) {
    // Frontend is on a dev server, backend should be on 5000
    return `${protocol}//localhost:5000/api`;
  }
  
  // Same origin as frontend
  return `${protocol}//${hostname}:${globalThis.location.port}/api`;
};

const API_BASE = getAPIBase();
const CART_KEY = 'chronolux_cart';
const TOKEN_KEY = 'chronolux_token';

const getCart = () => JSON.parse(localStorage.getItem(CART_KEY) || '[]');
const saveCart = (cart) => localStorage.setItem(CART_KEY, JSON.stringify(cart));
const getToken = () => localStorage.getItem(TOKEN_KEY);

const currency = (value) => `Rs ${Number(value).toFixed(0)}`;

const updateCartBadge = () => {
  const badge = document.querySelector('[data-cart-count]');
  if (!badge) return;
  const count = getCart().reduce((sum, item) => sum + item.quantity, 0);
  badge.textContent = count;
  badge.classList.toggle('is-visible', count > 0);
};

const animateCartIcon = () => {
  const cartButton = document.querySelector('[data-cart-button]');
  if (!cartButton) return;
  cartButton.classList.add('bounce');
  setTimeout(() => cartButton.classList.remove('bounce'), 500);
};

const addToCart = (product, quantity = 1) => {
  const cart = getCart();
  const productId = String(product._id ?? product.id);
  const existing = cart.find((item) => String(item._id) === productId);
  const normalizedProduct = { ...product, _id: productId };

  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({ ...normalizedProduct, quantity });
  }

  saveCart(cart);
  updateCartBadge();
  animateCartIcon();
  document.dispatchEvent(new CustomEvent('chronolux:cart-updated'));
};

const removeFromCart = (productId) => {
  const cart = getCart().filter((item) => String(item._id) !== String(productId));
  saveCart(cart);
  updateCartBadge();
  document.dispatchEvent(new CustomEvent('chronolux:cart-updated'));
};

const increaseQuantity = (productId) => {
  const cart = getCart();
  const item = cart.find((entry) => String(entry._id) === String(productId));
  if (item) item.quantity += 1;
  saveCart(cart);
  updateCartBadge();
  document.dispatchEvent(new CustomEvent('chronolux:cart-updated'));
};

const decreaseQuantity = (productId) => {
  const cart = getCart();
  const item = cart.find((entry) => String(entry._id) === String(productId));

  if (!item) return;

  if (item.quantity > 1) {
    item.quantity -= 1;
    saveCart(cart);
  } else {
    saveCart(cart.filter((entry) => entry._id !== productId));
  }

  updateCartBadge();
  document.dispatchEvent(new CustomEvent('chronolux:cart-updated'));
};

const calculateCartTotal = () => {
  const subtotal = getCart().reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = subtotal > 0 ? 10 : 0;
  return { subtotal, deliveryFee, total: subtotal + deliveryFee };
};

const clearCart = () => {
  saveCart([]);
  updateCartBadge();
  document.dispatchEvent(new CustomEvent('chronolux:cart-updated'));
};

const isLoggedIn = () => Boolean(getToken());

const protectPage = (redirect = 'login.html') => {
  if (!isLoggedIn()) {
    globalThis.location.href = redirect;
  }
};

const setAuthUI = () => {
  document.querySelectorAll('[data-auth-link]').forEach((link) => {
    link.textContent = isLoggedIn() ? 'Dashboard' : 'Login';
    link.href = isLoggedIn() ? 'dashboard.html' : 'login.html';
  });
};

const renderStars = (rating) => {
  const rounded = Math.round(rating);
  return Array.from({ length: 5 }, (_, index) => `<span class="star ${index < rounded ? 'filled' : ''}">★</span>`).join('');
};

const revealOnScroll = () => {
  const targets = document.querySelectorAll('[data-reveal]');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  targets.forEach((target) => observer.observe(target));
};

const toggleMobileMenu = () => {
  const button = document.querySelector('[data-menu-toggle]');
  const nav = document.querySelector('[data-nav-menu]');
  if (!button || !nav) return;

  button.addEventListener('click', () => {
    nav.classList.toggle('is-open');
    button.classList.toggle('is-active');
  });
};

const renderLayout = () => {
  updateCartBadge();
  setAuthUI();
  toggleMobileMenu();
  revealOnScroll();
};

document.addEventListener('DOMContentLoaded', renderLayout);

globalThis.ChronoLux = {
  API_BASE,
  CART_KEY,
  TOKEN_KEY,
  currency,
  getCart,
  saveCart,
  getToken,
  addToCart,
  removeFromCart,
  increaseQuantity,
  decreaseQuantity,
  calculateCartTotal,
  clearCart,
  isLoggedIn,
  protectPage,
  renderStars,
  updateCartBadge
};
