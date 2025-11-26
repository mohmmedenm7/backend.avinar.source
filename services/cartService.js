const asyncHandler = require('express-async-handler');
const ApiError = require('../utils/apiError');

const Product = require('../models/productModel');
const Coupon = require('../models/couponModel');
const Cart = require('../models/cartModel');

const calcTotalCartPrice = (cart) => {
  let totalPrice = 0;
  cart.cartItems.forEach((item) => {
    totalPrice += item.quantity * item.price;
  });
  cart.totalCartPrice = totalPrice;
  cart.totalPriceAfterDiscount = undefined;
  return totalPrice;
};

// @desc    Add product to  cart
// @route   POST /api/v1/cart
// @access  Private/User
// @desc    Add product to cart
// @route   POST /api/v1/cart
// @access  Private/User
exports.addProductToCart = asyncHandler(async (req, res, next) => {
  const { productId, color } = req.body;

  // Validate that productId exists
  if (!productId) {
    return next(new ApiError("Product ID is required", 400));
  }

  // Find product by ID
  const product = await Product.findById(productId);

  // Check if product exists
  if (!product) {
    return next(new ApiError("Product not found", 404));
  }

  // 1) Get Cart for logged user
  let cart = await Cart.findOne({ user: req.user._id });

  if (!cart) {
    // Create new cart if it doesn't exist
    cart = await Cart.create({
      user: req.user._id,
      cartItems: [{
        product: productId,
        color,
        price: product.price,
        quantity: 1
      }],
    });
  } else {
    // Check if item with same product and color already exists
    const productIndex = cart.cartItems.findIndex(
      (item) => item.product.toString() === productId && item.color === color
    );

    if (productIndex > -1) {
      // Item exists, increment quantity
      cart.cartItems[productIndex].quantity += 1;
    } else {
      // New item, add to cart
      cart.cartItems.push({
        product: productId,
        color,
        price: product.price,
        quantity: 1
      });
    }
  }

  calcTotalCartPrice(cart);
  await cart.save();

  res.status(200).json({
    status: 'success',
    message: 'Product added to cart successfully',
    numOfCartItems: cart.cartItems.length,
    data: cart,
  });
});

// @desc    Get logged user cart
// @route   GET /api/v1/cart
// @access  Private/User
exports.getLoggedUserCart = asyncHandler(async (req, res, next) => {
  const cart = await Cart.findOne({ user: req.user._id });

  if (!cart) {
    return next(
      new ApiError(`There is no cart for this user id : ${req.user._id}`, 404)
    );
  }

  res.status(200).json({
    status: 'success',
    numOfCartItems: cart.cartItems.length,
    data: cart,
  });
});

// @desc    Remove specific cart item
// @route   DELETE /api/v1/cart/:itemId
// @access  Private/User
exports.removeSpecificCartItem = asyncHandler(async (req, res, next) => {
  const cart = await Cart.findOneAndUpdate(
    { user: req.user._id },
    {
      $pull: { cartItems: { _id: req.params.itemId } },
    },
    { new: true }
  );

  calcTotalCartPrice(cart);
  cart.save();

  res.status(200).json({
    status: 'success',
    numOfCartItems: cart.cartItems.length,
    data: cart,
  });
});

// @desc    clear logged user cart
// @route   DELETE /api/v1/cart
// @access  Private/User
exports.clearCart = asyncHandler(async (req, res, next) => {
  await Cart.findOneAndDelete({ user: req.user._id });
  res.status(204).send();
});

// @desc    Update specific cart item quantity
// @route   PUT /api/v1/cart/:itemId
// @access  Private/User
exports.updateCartItemQuantity = asyncHandler(async (req, res, next) => {
  const { quantity } = req.body;

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    return next(new ApiError(`there is no cart for user ${req.user._id}`, 404));
  }

  const itemIndex = cart.cartItems.findIndex(
    (item) => item._id.toString() === req.params.itemId
  );
  if (itemIndex > -1) {
    const cartItem = cart.cartItems[itemIndex];
    cartItem.quantity = quantity;
    cart.cartItems[itemIndex] = cartItem;
  } else {
    return next(
      new ApiError(`there is no item for this id :${req.params.itemId}`, 404)
    );
  }

  calcTotalCartPrice(cart);

  await cart.save();

  res.status(200).json({
    status: 'success',
    numOfCartItems: cart.cartItems.length,
    data: cart,
  });
});

// @desc    Apply coupon on logged user cart
// @route   PUT /api/v1/cart/applyCoupon
// @access  Private/User
exports.applyCoupon = asyncHandler(async (req, res, next) => {
  // 1) Get coupon based on coupon name
  const coupon = await Coupon.findOne({
    name: req.body.coupon,
    expire: { $gt: Date.now() },
  });

  if (!coupon) {
    return next(new ApiError(`Coupon is invalid or expired`));
  }

  // 2) Get logged user cart to get total cart price
  const cart = await Cart.findOne({ user: req.user._id });

  const totalPrice = cart.totalCartPrice;

  // 3) Calculate price after priceAfterDiscount
  const totalPriceAfterDiscount = (
    totalPrice -
    (totalPrice * coupon.discount) / 100
  ).toFixed(2); // 99.23

  cart.totalPriceAfterDiscount = totalPriceAfterDiscount;
  await cart.save();

  res.status(200).json({
    status: 'success',
    numOfCartItems: cart.cartItems.length,
    data: cart,
  });
});

// @desc    Get cart payment status by email
// @route   GET /api/v1/cart/status/:email
// @access  Public
exports.getCartPaymentStatusByEmail = asyncHandler(async (req, res, next) => {
  const { email } = req.params;

  console.log('🔍 [Cart Status Route Hit] - Route: /api/v1/cart/status/:email');
  console.log('📧 Email parameter received:', email);
  console.log('🌐 Full URL:', req.originalUrl);
  console.log('📋 All params:', req.params);

  // Find user by email
  const User = require('../models/userModel');
  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    console.log('❌ User not found with email:', email);
    return next(new ApiError(`No user found with email: ${email}. Please check if the email is correct.`, 404));
  }

  console.log('✅ User found:', user.email);

  // Check if user has any paid orders
  const Order = require('../models/orderModel');
  const paidOrder = await Order.findOne({ user: user._id, isPaid: true });

  const paymentStatus = paidOrder ? 'مدفوع' : 'غير مدفوع';
  console.log('💳 Payment status:', paymentStatus);

  res.status(200).json({
    status: 'success',
    data: {
      email: user.email,
      paymentStatus: paymentStatus,
      isPaid: !!paidOrder,
    },
  });
});

// @desc    Get payment status for specific product by email
// @route   GET /api/v1/cart/status/:email/product/:productId
// @access  Public
exports.getProductPaymentStatusByEmail = asyncHandler(async (req, res, next) => {
  const { email, productId } = req.params;

  console.log('🔍 [Product Status Route Hit] - Route: /api/v1/cart/status/:email/product/:productId');
  console.log('📧 Email parameter received:', email);
  console.log('📦 Product ID parameter received:', productId);
  console.log('🌐 Full URL:', req.originalUrl);
  console.log('📋 All params:', req.params);

  // Find user by email
  const User = require('../models/userModel');
  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    console.log('❌ User not found with email:', email);
    return next(new ApiError(`No user found with email: ${email}. Please check if the email is correct.`, 404));
  }

  console.log('✅ User found:', user.email);

  // Check if product exists
  const product = await Product.findById(productId);
  if (!product) {
    console.log('❌ Product not found with ID:', productId);
    return next(new ApiError(`Product not found with ID: ${productId}. Please check if the product ID is correct.`, 404));
  }

  console.log('✅ Product found:', product.title);

  // Check if user has any paid orders containing this product
  const Order = require('../models/orderModel');
  const paidOrderWithProduct = await Order.findOne({
    user: user._id,
    isPaid: true,
    'cartItems.product': productId,
  });

  const paymentStatus = paidOrderWithProduct ? 'مدفوع' : 'غير مدفوع';
  console.log('💳 Payment status for product:', paymentStatus);

  res.status(200).json({
    status: 'success',
    data: {
      email: user.email,
      productId: productId,
      productTitle: product.title,
      paymentStatus: paymentStatus,
      isPaid: !!paidOrderWithProduct,
    },
  });
});
