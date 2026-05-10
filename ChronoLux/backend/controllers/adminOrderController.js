const { getDB } = require('../config/db');

const mapOrderRow = (row) => ({
  id: row.id,
  total: Number(row.total),
  status: row.status,
  paymentMethod: row.payment_method,
  createdAt: row.created_at,
  customerName: row.customerName,
  customerEmail: row.customerEmail
});

// Get all orders with pagination
const getAllOrders = async (req, res) => {
  try {
    const db = getDB();
    const page = Number.parseInt(req.query.page, 10) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    const [orders] = await db.query(`
      SELECT 
        o.id, 
        o.total, 
        o.status, 
        o.payment_method,
        o.created_at,
        u.name as customerName,
        u.email as customerEmail
      FROM orders o
      JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    const [countResult] = await db.query('SELECT COUNT(*) as total FROM orders');
    const total = countResult[0].total;

    res.json({
      orders: orders.map(mapOrderRow),
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ message: 'Error fetching orders' });
  }
};

// Get single order details
const getOrderById = async (req, res) => {
  try {
    const db = getDB();
    const [orders] = await db.query(`
      SELECT 
        o.id,
        o.total,
        o.status,
        o.payment_method,
        o.subtotal,
        o.delivery_fee,
        o.created_at,
        o.full_name,
        o.email,
        o.phone,
        o.address,
        o.city,
        o.postal_code,
        u.name as customerName,
        u.email as customerEmail
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE o.id = ?
    `, [req.params.id]);

    if (!orders.length) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const order = orders[0];

    // Get order items
    const [items] = await db.query(`
      SELECT 
        oi.id,
        oi.name,
        oi.price,
        oi.quantity,
        oi.image,
        p.id as productId
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `, [req.params.id]);

    order.paymentMethod = order.payment_method;
    order.createdAt = order.created_at;
    order.subtotal = Number(order.subtotal);
    order.deliveryFee = Number(order.delivery_fee);
    order.shippingAddress = {
      fullName: order.full_name,
      email: order.email,
      phone: order.phone,
      address: order.address,
      city: order.city,
      postalCode: order.postal_code
    };
    order.items = items.map((item) => ({
      id: item.id,
      name: item.name,
      price: Number(item.price),
      quantity: item.quantity,
      image: item.image,
      productId: item.productId
    }));

    res.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ message: 'Error fetching order' });
  }
};

// Update order status
const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid order status' });
    }

    const db = getDB();
    await db.query('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);

    res.json({ message: 'Order status updated successfully' });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ message: 'Error updating order status' });
  }
};

// Update payment status
const updatePaymentStatus = async (req, res) => {
  try {
    const { paymentStatus } = req.body;
    const validStatuses = ['Unpaid', 'Paid', 'Failed', 'Refunded'];

    if (!validStatuses.includes(paymentStatus)) {
      return res.status(400).json({ message: 'Invalid payment status' });
    }

    const db = getDB();
    await db.query('UPDATE orders SET payment_status = ? WHERE id = ?', [paymentStatus, req.params.id]);

    res.json({ message: 'Payment status updated successfully' });
  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(500).json({ message: 'Error updating payment status' });
  }
};

// Add order note
const addOrderNote = async (req, res) => {
  try {
    const { note } = req.body;

    if (!note) {
      return res.status(400).json({ message: 'Note is required' });
    }

    const db = getDB();
    const timestamp = new Date().toISOString();
    
    await db.query(
      'CREATE TABLE IF NOT EXISTS order_notes (id INT AUTO_INCREMENT PRIMARY KEY, order_id INT NOT NULL, note TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)'
    );

    await db.query(
      'INSERT INTO order_notes (order_id, note, created_at) VALUES (?, ?, ?)',
      [req.params.id, note, timestamp]
    );

    res.status(201).json({ message: 'Note added successfully' });
  } catch (error) {
    console.error('Error adding order note:', error);
    res.status(500).json({ message: 'Error adding order note' });
  }
};

module.exports = {
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  updatePaymentStatus,
  addOrderNote
};
