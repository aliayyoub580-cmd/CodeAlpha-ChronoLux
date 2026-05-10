const jwt = require('jsonwebtoken');
const { getDB } = require('../config/db');

const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, token missing' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const db = getDB();
    const [rows] = await db.query('SELECT id, name, email, role FROM users WHERE id = ?', [decoded.id]);
    req.user = rows[0] || null;

    if (!req.user) {
      return res.status(401).json({ message: 'User not found' });
    }

    next();
  } catch (error) {
    console.warn(`Auth token validation failed: ${error.message}`);
    return res.status(401).json({ message: 'Not authorized, token invalid' });
  }
};

const admin = (req, res, next) => {
  if (req.user?.role === 'admin') {
    return next();
  }

  return res.status(403).json({ message: 'Admin access only' });
};

module.exports = { protect, admin };
