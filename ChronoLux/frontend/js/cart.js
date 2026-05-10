const renderCartPage = () => {
  const container = document.querySelector('[data-cart-items]');
  if (!container) return;

  const render = () => {
    const cart = globalThis.ChronoLux.getCart();
    const totals = globalThis.ChronoLux.calculateCartTotal();

    if (cart.length === 0) {
      container.innerHTML = '<div class="empty-state"><h3>Your cart is empty.</h3><a class="btn btn--primary" href="shop.html">Start Shopping</a></div>';
    } else {
      container.innerHTML = cart.map((item) => `
        <article class="cart-item">
          <img src="${item.image}" alt="${item.name}">
          <div class="cart-item__content">
            <h3>${item.name}</h3>
            <p>${item.category}</p>
            <strong>${globalThis.ChronoLux.currency(item.price)}</strong>
          </div>
          <div class="cart-item__controls">
            <button class="icon-btn" data-decrease="${item._id}">-</button>
            <span>${item.quantity}</span>
            <button class="icon-btn" data-increase="${item._id}">+</button>
          </div>
          <button class="text-btn" data-remove="${item._id}">Remove</button>
        </article>
      `).join('');
    }

    const summary = document.querySelector('[data-cart-summary]');
    if (summary) {
      summary.innerHTML = `
        <div class="summary-row"><span>Subtotal</span><strong>${globalThis.ChronoLux.currency(totals.subtotal)}</strong></div>
        <div class="summary-row"><span>Delivery Fee</span><strong>${globalThis.ChronoLux.currency(totals.deliveryFee)}</strong></div>
        <div class="summary-row total"><span>Total</span><strong>${globalThis.ChronoLux.currency(totals.total)}</strong></div>
      `;
    }

    bindControls();
  };

  const bindControls = () => {
    container.querySelectorAll('[data-increase]').forEach((button) => button.addEventListener('click', () => {
      globalThis.ChronoLux.increaseQuantity(button.dataset.increase);
    }));

    container.querySelectorAll('[data-decrease]').forEach((button) => button.addEventListener('click', () => {
      globalThis.ChronoLux.decreaseQuantity(button.dataset.decrease);
    }));

    container.querySelectorAll('[data-remove]').forEach((button) => button.addEventListener('click', () => {
      globalThis.ChronoLux.removeFromCart(button.dataset.remove);
    }));
  };

  render();
  document.addEventListener('chronolux:cart-updated', render);
};

document.addEventListener('DOMContentLoaded', renderCartPage);
