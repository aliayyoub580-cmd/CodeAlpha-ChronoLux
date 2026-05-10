const { getDB } = require('../config/db');

// Get all users with pagination
const getAllUsers = async (req, res) => {
  try {
    const db = getDB();
    const page = Number.parseInt(req.query.page, 10) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    const [users] = await db.query(`
      SELECT 
        id,
        name,
        email,
        role,
        created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    const [countResult] = await db.query('SELECT COUNT(*) as total FROM users');
    const total = countResult[0].total;

    res.json({
      users,
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Error fetching users' });
  }
};

// Get user by ID
const getUserById = async (req, res) => {
  try {
    const db = getDB();
    const [users] = await db.query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = ?',
      [req.params.id]
    );

    if (!users.length) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = users[0];

    // Get user orders
    const [orders] = await db.query(
      'SELECT id, total, status, created_at FROM orders WHERE user_id = ? ORDER BY created_at DESC',
      [req.params.id]
    );

    user.orders = orders;
    user.totalOrders = orders.length;
    user.totalSpent = orders.reduce((sum, order) => sum + order.total, 0);

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Error fetching user' });
  }
};

// Update user role
const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const validRoles = ['customer', 'admin'];

    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    // Prevent demoting self
    if (req.user.id === Number.parseInt(req.params.id, 10) && role === 'customer') {
      return res.status(400).json({ message: 'Cannot demote yourself' });
    }

    const db = getDB();
    await db.query('UPDATE users SET role = ? WHERE id = ?', [role, req.params.id]);

    res.json({ message: 'User role updated successfully' });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ message: 'Error updating user role' });
  }
};

// Disable/Enable user account
const updateUserStatus = async (req, res) => {
  try {
    const { isActive } = req.body;

    if (req.user.id === Number.parseInt(req.params.id, 10)) {
      return res.status(400).json({ message: 'Cannot disable your own account' });
    }

    const db = getDB();
    await db.query('UPDATE users SET isActive = ? WHERE id = ?', [isActive, req.params.id]);

    res.json({ message: 'User status updated successfully' });
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({ message: 'Error updating user status' });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUserRole,
  updateUserStatus
};
