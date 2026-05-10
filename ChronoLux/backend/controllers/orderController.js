const { getDB } = require('../config/db');

const createOrder = async (req, res) => {
  try {
    const { items, shippingAddress, paymentMethod, subtotal, deliveryFee, total } = req.body;
    const db = getDB();

    if (!items?.length) {
      return res.status(400).json({ message: 'Order must contain at least one item' });
    }

    const [result] = await db.query(
      'INSERT INTO orders (user_id, full_name, email, phone, address, city, postal_code, payment_method, subtotal, delivery_fee, total, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        req.user.id,
        shippingAddress.fullName,
        shippingAddress.email,
        shippingAddress.phone,
        shippingAddress.address,
        shippingAddress.city,
        shippingAddress.postalCode,
        paymentMethod,
        subtotal,
        deliveryFee,
        total,
        'Pending'
      ]
    );

    const orderId = result.insertId;

    for (const item of items) {
      await db.query(
        'INSERT INTO order_items (order_id, product_id, name, price, quantity, image) VALUES (?, ?, ?, ?, ?, ?)',
        [orderId, item.product || null, item.name, item.price, item.quantity, item.image]
      );
    }

    return res.status(201).json({
      message: 'Order created successfully',
      order: { id: orderId }
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getMyOrders = async (req, res) => {
  try {
    const db = getDB();
    const [rows] = await db.query('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
    const orders = [];

    for (const row of rows) {
      const [itemRows] = await db.query('SELECT * FROM order_items WHERE order_id = ?', [row.id]);
      orders.push({
        id: row.id,
        items: itemRows.map((item) => ({
          product: item.product_id,
          name: item.name,
          price: Number(item.price),
          quantity: item.quantity,
          image: item.image
        })),
        shippingAddress: {
          fullName: row.full_name,
          email: row.email,
          phone: row.phone,
          address: row.address,
          city: row.city,
          postalCode: row.postal_code
        },
        paymentMethod: row.payment_method,
        subtotal: Number(row.subtotal),
        deliveryFee: Number(row.delivery_fee),
        total: Number(row.total),
        status: row.status,
        createdAt: row.created_at
      });
    }

    return res.json(orders);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getOrderById = async (req, res) => {
  try {
    const db = getDB();
    const [rows] = await db.query('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    const orderRow = rows[0];

    if (!orderRow) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (orderRow.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to view this order' });
    }

    const [itemRows] = await db.query('SELECT * FROM order_items WHERE order_id = ?', [orderRow.id]);
    return res.json({
      id: orderRow.id,
      items: itemRows.map((item) => ({
        product: item.product_id,
        name: item.name,
        price: Number(item.price),
        quantity: item.quantity,
        image: item.image
      })),
      shippingAddress: {
        fullName: orderRow.full_name,
        email: orderRow.email,
        phone: orderRow.phone,
        address: orderRow.address,
        city: orderRow.city,
        postalCode: orderRow.postal_code
      },
      paymentMethod: orderRow.payment_method,
      subtotal: Number(orderRow.subtotal),
      deliveryFee: Number(orderRow.delivery_fee),
      total: Number(orderRow.total),
      status: orderRow.status,
      createdAt: orderRow.created_at
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = { createOrder, getMyOrders, getOrderById };
