const express = require('express');
const {
  createCashOrder,
  getAllOrders,
  getOrder,
  getUserOrders,
  updateOrderStatus,
  deleteOrder,
  payOrder   // ← أضف هذا
} = require('../services/orderService');


const authService = require('../services/authService');

const router = express.Router();

router.use(authService.protect);

// Get all orders (admin/manager)
router.get(
  '/',
  authService.allowedTo('user', 'admin', 'manager'),
  (req, res, next) => {
    if (req.user.role === 'user') {
      getUserOrders(req, res, next);
    } else {
      getAllOrders(req, res, next);
    }
  }
);

// Create cash order
router.post(
  '/:cartId',
  authService.allowedTo('user'),
  createCashOrder
);

// Get specific order
router.get('/:id', getOrder);

// Update order status
router.put(
  '/:id/status',
  authService.allowedTo('admin', 'manager'),
  updateOrderStatus
);

// Delete order
router.delete(
  '/:id',
  authService.allowedTo('admin'),
  deleteOrder
);

// Pay order (set order as paid)
router.put('/:id/pay', authService.allowedTo('user', 'admin'), payOrder);



module.exports = router;