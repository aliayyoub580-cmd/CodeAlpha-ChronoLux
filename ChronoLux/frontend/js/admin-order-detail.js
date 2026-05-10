// ============================================================
// Admin Order Detail Handler
// ============================================================

let orderId = null;
let orderData = null;

window.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  orderId = params.get('id');

  if (!orderId) {
    window.location.href = 'admin-orders.html';
    return;
  }

  await loadOrderDetail(orderId);
});

async function loadOrderDetail(id) {
  try {
    const response = await Admin.apiCall(`/admin/orders/${id}`);
    
    if (!response || !response.ok) {
      Admin.showToast('Error loading order', 'danger');
      window.location.href = 'admin-orders.html';
      return;
    }

    orderData = await response.json();
    renderOrderDetail(orderData);
  } catch (error) {
    console.error('Error loading order:', error);
    Admin.showToast('Error loading order', 'danger');
    window.location.href = 'admin-orders.html';
  }
}

function renderOrderDetail(order) {
  // Order ID
  document.getElementById('orderIdDisplay').textContent = `#${order.id}`;
  document.getElementById('orderId').textContent = `#${order.id}`;

  // Order date
  const orderDate = new Date(order.createdAt);
  document.getElementById('orderDate').textContent = orderDate.toLocaleDateString();
  
  // Customer info
  document.getElementById('customerName').textContent = order.customerName;
  document.getElementById('customerEmail').textContent = order.customerEmail;

  // Order total
  document.getElementById('orderTotal').textContent = `$${order.total.toFixed(2)}`;
  document.getElementById('totalAmount').textContent = `$${order.total.toFixed(2)}`;
  document.getElementById('subtotal').textContent = `$${order.subtotal.toFixed(2)}`;
  document.getElementById('deliveryFee').textContent = `$${order.deliveryFee.toFixed(2)}`;

  // Order status
  document.getElementById('orderStatus').innerHTML = Admin.getStatusBadge(order.status);
  document.getElementById('statusSelect').value = order.status;

  // Items
  renderOrderItems(order.items || []);
}

function renderOrderItems(items) {
  const tableBody = document.getElementById('itemsTable');
  
  if (!items || items.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--admin-muted);">No items</td></tr>';
    return;
  }

  tableBody.innerHTML = items.map(item => `
    <tr>
      <td>
        <div style="display: flex; align-items: center; gap: 12px;">
          <img src="${item.image}" alt="${item.name}" style="width: 40px; height: 40px; border-radius: 8px; object-fit: cover;">
          <strong>${item.name}</strong>
        </div>
      </td>
      <td>${item.quantity}</td>
      <td>$${item.price.toFixed(2)}</td>
      <td style="font-weight: 700; color: var(--admin-gold-light);">$${(item.price * item.quantity).toFixed(2)}</td>
    </tr>
  `).join('');
}

async function updateOrderStatus() {
  const statusSelect = document.getElementById('statusSelect');
  const newStatus = statusSelect.value;

  if (!newStatus) {
    Admin.showToast('Please select a status', 'warning');
    return;
  }

  Admin.showConfirmDialog(
    'Update Order Status',
    `Are you sure you want to change the order status to ${newStatus}?`,
    async () => {
      try {
        const response = await Admin.apiCall(`/admin/orders/${orderId}/status`, 'PATCH', { status: newStatus });
        
        if (!response || !response.ok) {
          Admin.showToast('Error updating order status', 'danger');
          return;
        }

        Admin.showToast('Order status updated successfully', 'success');
        await loadOrderDetail(orderId);
      } catch (error) {
        console.error('Error updating order status:', error);
        Admin.showToast('Error updating order status', 'danger');
      }
    }
  );
}

function cancelOrder() {
  Admin.showConfirmDialog(
    'Cancel Order',
    'Are you sure you want to cancel this order? The customer order status will be updated immediately.',
    async () => {
      try {
        const response = await Admin.apiCall(`/admin/orders/${orderId}/status`, 'PATCH', { status: 'Cancelled' });
        
        if (!response || !response.ok) {
          Admin.showToast('Error cancelling order', 'danger');
          return;
        }

        Admin.showToast('Order cancelled successfully', 'success');
        setTimeout(() => {
          window.location.href = 'admin-orders.html';
        }, 1500);
      } catch (error) {
        console.error('Error cancelling order:', error);
        Admin.showToast('Error cancelling order', 'danger');
      }
    }
  );
}
