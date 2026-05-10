const { getDB } = require('../config/db');

const mapRecentOrder = (row) => ({
  id: row.id,
  total: Number(row.total),
  status: row.status,
  paymentMethod: row.payment_method,
  createdAt: row.created_at,
  customerName: row.customerName,
  customerEmail: row.customerEmail
});

// Dashboard Statistics
const getAdminStats = async (req, res) => {
  try {
    const db = getDB();

    // Total Revenue
    const [revenueResult] = await db.query(
      'SELECT COALESCE(SUM(total), 0) as totalRevenue FROM orders WHERE status != "Cancelled"'
    );
    const totalRevenue = revenueResult[0]?.totalRevenue || 0;

    // Total Orders
    const [ordersResult] = await db.query(
      'SELECT COUNT(*) as totalOrders FROM orders WHERE status != "Cancelled"'
    );
    const totalOrders = ordersResult[0]?.totalOrders || 0;

    // Total Products
    const [productsResult] = await db.query(
      'SELECT COUNT(*) as totalProducts FROM products'
    );
    const totalProducts = productsResult[0]?.totalProducts || 0;

    // Total Customers
    const [customersResult] = await db.query(
      'SELECT COUNT(*) as totalCustomers FROM users WHERE role = "user"'
    );
    const totalCustomers = customersResult[0]?.totalCustomers || 0;

    // Pending Orders
    const [pendingResult] = await db.query(
      'SELECT COUNT(*) as pendingOrders FROM orders WHERE status = "Pending"'
    );
    const pendingOrders = pendingResult[0]?.pendingOrders || 0;

    // Low Stock Products (< 10)
    const [lowStockResult] = await db.query(
      'SELECT COUNT(*) as lowStockCount FROM products WHERE stock < 10'
    );
    const lowStockProducts = lowStockResult[0]?.lowStockCount || 0;

    res.json({
      totalRevenue,
      totalOrders,
      totalProducts,
      totalCustomers,
      pendingOrders,
      lowStockProducts
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ message: 'Error fetching statistics' });
  }
};

// Recent Orders
const getRecentOrders = async (req, res) => {
  try {
    const db = getDB();
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
      WHERE o.status != 'Cancelled'
      ORDER BY o.created_at DESC
      LIMIT 10
    `);

    res.json(orders.map(mapRecentOrder));
  } catch (error) {
    console.error('Error fetching recent orders:', error);
    res.status(500).json({ message: 'Error fetching recent orders' });
  }
};

// Top Selling Products
const getTopProducts = async (req, res) => {
  try {
    const db = getDB();
    const [products] = await db.query(`
      SELECT 
        p.id,
        p.name,
        p.image,
        p.category,
        p.price,
        COUNT(o.id) as sales,
        SUM(o.total) as revenue
      FROM products p
      LEFT JOIN order_items oi ON p.id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.id
      WHERE o.status != 'Cancelled' OR o.id IS NULL
      GROUP BY p.id
      ORDER BY sales DESC
      LIMIT 5
    `);

    res.json(products);
  } catch (error) {
    console.error('Error fetching top products:', error);
    res.status(500).json({ message: 'Error fetching top products' });
  }
};

// Low Stock Products
const getLowStockProducts = async (req, res) => {
  try {
    const db = getDB();
    const [products] = await db.query(
      'SELECT id, name, image, stock, price FROM products WHERE stock < 10 ORDER BY stock ASC'
    );

    res.json(products);
  } catch (error) {
    console.error('Error fetching low stock products:', error);
    res.status(500).json({ message: 'Error fetching low stock products' });
  }
};

module.exports = {
  getAdminStats,
  getRecentOrders,
  getTopProducts,
  getLowStockProducts
};
