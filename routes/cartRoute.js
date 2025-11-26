const express = require('express');

const {
  addProductToCart,
  getLoggedUserCart,
  removeSpecificCartItem,
  clearCart,
  updateCartItemQuantity,
  applyCoupon,
  getCartPaymentStatusByEmail,
  getProductPaymentStatusByEmail,
} = require('../services/cartService');
const authService = require('../services/authService');

const router = express.Router();

// Logging middleware to debug routing issues
router.use((req, res, next) => {
  console.log('\n🚀 ========== CART ROUTE REQUEST ==========');
  console.log('📍 Method:', req.method);
  console.log('🌐 Original URL:', req.originalUrl);
  console.log('🔗 Base URL:', req.baseUrl);
  console.log('📂 Path:', req.path);
  console.log('📋 Params:', req.params);
  console.log('🔍 Query:', req.query);
  console.log('==========================================\n');
  next();
});

// Public routes - check payment status by email
// Note: More specific routes must come first
router.get('/status/:email/product/:productId', getProductPaymentStatusByEmail);
router.get('/status/:email', getCartPaymentStatusByEmail);

router.use(authService.protect, authService.allowedTo('user'));
router
  .route('/')
  .post(addProductToCart)
  .get(getLoggedUserCart)
  .delete(clearCart);

router.put('/applyCoupon', applyCoupon);

router
  .route('/:itemId')
  .put(updateCartItemQuantity)
  .delete(removeSpecificCartItem);

module.exports = router;
