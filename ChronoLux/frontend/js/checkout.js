const checkoutPage = () => {
  const form = document.querySelector('[data-checkout-form]');
  const summary = document.querySelector('[data-checkout-summary]');
  if (!form || !summary) return;

  const cart = globalThis.ChronoLux.getCart();
  if (cart.length === 0) {
    summary.innerHTML = '<div class="empty-state"><h3>Your cart is empty.</h3></div>';
  } else {
    const totals = globalThis.ChronoLux.calculateCartTotal();
    summary.innerHTML = `
      <div class="order-summary-list">
        ${cart.map((item) => `<div class="summary-item"><span>${item.name} x ${item.quantity}</span><strong>${globalThis.ChronoLux.currency(item.price * item.quantity)}</strong></div>`).join('')}
      </div>
      <div class="summary-row"><span>Subtotal</span><strong>${globalThis.ChronoLux.currency(totals.subtotal)}</strong></div>
      <div class="summary-row"><span>Delivery Fee</span><strong>${globalThis.ChronoLux.currency(totals.deliveryFee)}</strong></div>
      <div class="summary-row total"><span>Total</span><strong>${globalThis.ChronoLux.currency(totals.total)}</strong></div>
    `;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    const { subtotal, deliveryFee, total } = globalThis.ChronoLux.calculateCartTotal();

    const payload = {
      items: cart.map((item) => ({
        product: item._id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.image
      })),
      shippingAddress: {
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        postalCode: data.postalCode
      },
      paymentMethod: data.paymentMethod,
      subtotal,
      deliveryFee,
      total
    };

    try {
      const token = globalThis.ChronoLux.getToken();
      const response = await fetch(`${globalThis.ChronoLux.API_BASE}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Order failed');

      globalThis.ChronoLux.clearCart();
      localStorage.setItem('chronolux_last_order', JSON.stringify({ id: result.order._id, total }));
      globalThis.location.href = 'success.html';
    } catch (error) {
      const message = form.querySelector('[data-checkout-message]');
      if (message) {
        message.textContent = error.message;
        message.classList.add('is-error');
      }
    }
  });
};

document.addEventListener('DOMContentLoaded', () => {
  globalThis.ChronoLux.protectPage('login.html');
  checkoutPage();
});
