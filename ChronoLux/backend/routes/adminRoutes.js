const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const {
  getAdminStats,
  getRecentOrders,
  getTopProducts,
  getLowStockProducts
} = require('../controllers/adminController');
const {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  updateProductStock
} = require('../controllers/adminProductController');
const {
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  updatePaymentStatus,
  addOrderNote
} = require('../controllers/adminOrderController');
const {
  getAllUsers,
  getUserById,
  updateUserRole,
  updateUserStatus
} = require('../controllers/adminUserController');

// Dashboard routes
router.get('/stats', protect, adminMiddleware, getAdminStats);
router.get('/recent-orders', protect, adminMiddleware, getRecentOrders);
router.get('/top-products', protect, adminMiddleware, getTopProducts);
router.get('/low-stock', protect, adminMiddleware, getLowStockProducts);

// Product management routes
router.get('/products', protect, adminMiddleware, getAllProducts);
router.get('/products/:id', protect, adminMiddleware, getProductById);
router.post('/products', protect, adminMiddleware, createProduct);
router.put('/products/:id', protect, adminMiddleware, updateProduct);
router.delete('/products/:id', protect, adminMiddleware, deleteProduct);
router.patch('/products/:id/stock', protect, adminMiddleware, updateProductStock);

// Order management routes
router.get('/orders', protect, adminMiddleware, getAllOrders);
router.get('/orders/:id', protect, adminMiddleware, getOrderById);
router.patch('/orders/:id/status', protect, adminMiddleware, updateOrderStatus);
router.patch('/orders/:id/payment-status', protect, adminMiddleware, updatePaymentStatus);
router.post('/orders/:id/notes', protect, adminMiddleware, addOrderNote);

// User management routes
router.get('/users', protect, adminMiddleware, getAllUsers);
router.get('/users/:id', protect, adminMiddleware, getUserById);
router.patch('/users/:id/role', protect, adminMiddleware, updateUserRole);
router.patch('/users/:id/status', protect, adminMiddleware, updateUserStatus);

module.exports = router;
