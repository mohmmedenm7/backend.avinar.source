const asyncHandler = require('../middlewares/asyncHandler');
const ApiError = require('../utils/apiError');
const Cart = require('../models/cartModel');
const Order = require('../models/orderModel');
const Product = require('../models/productModel');

// Webhook checkout for Stripe
exports.webhookCheckout = asyncHandler(async (req, res, next) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = require('stripe')(process.env.STRIPE_SECRET_KEY).webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'charge.succeeded') {
    const charge = event.data.object;
    const cartId = charge.metadata.cartId;
    const userId = charge.metadata.userId;

    const cart = await Cart.findById(cartId);
    if (cart) {
      const order = await Order.create({
        user: userId,
        cartItems: cart.cartItems,
        totalOrderPrice: charge.amount / 100,
        paymentMethodType: 'card',
        isPaid: true,
        paidAt: new Date(),
      });

      await Cart.findByIdAndDelete(cartId);
    }
  }

  res.status(200).json({ received: true });
});

// Create Cash Order
exports.createCashOrder = asyncHandler(async (req, res, next) => {
  const taxPrice = 0;
  const shippingPrice = 0;

  // 1) Get cart depend on cartId
  const cart = await Cart.findById(req.params.cartId);
  if (!cart) {
    return next(
      new ApiError(`There is no such cart with id ${req.params.cartId}`, 404)
    );
  }

  // 2) Get order price
  const cartPrice = cart.totalPriceAfterDiscount
    ? cart.totalPriceAfterDiscount
    : cart.totalCartPrice;

  const totalOrderPrice = cartPrice + taxPrice + shippingPrice;

  // 3) Create order
  const order = await Order.create({
    user: req.user._id,
    cartItems: cart.cartItems,
    shippingAddress: req.body.shippingAddress,
    totalOrderPrice,
  });

  // 4) Validate products + update quantities
  const bulkOption = [];

  for (const item of cart.cartItems) {
    const product = await Product.findById(item.product);

    if (!product) {
      return next(
        new ApiError(
          `Product not found with id: ${item.product} (Cart contains invalid product).`,
          400
        )
      );
    }

    bulkOption.push({
      updateOne: {
        filter: { _id: item.product },
        update: { $inc: { quantity: -item.quantity, sold: +item.quantity } },
      },
    });
  }

  await Product.bulkWrite(bulkOption);

  // 5) Clear cart
  await Cart.findByIdAndDelete(req.params.cartId);

  res.status(201).json({ status: 'success', data: order });
});

// Get all orders
exports.getAllOrders = asyncHandler(async (req, res, next) => {
  const orders = await Order.find().populate('user', 'name email phone');
  res.status(200).json({ results: orders.length, data: orders });
});

// Get single order
exports.getOrder = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id).populate(
    'user',
    'name email phone'
  );
  if (!order) {
    return next(new ApiError(`No order found with id ${req.params.id}`, 404));
  }
  res.status(200).json({ data: order });
});

// Update order status
exports.updateOrderStatus = asyncHandler(async (req, res, next) => {
  const { status } = req.body;

  const order = await Order.findByIdAndUpdate(
    req.params.id,
    { orderStatus: status },
    { new: true, runValidators: true }
  );

  if (!order) {
    return next(new ApiError(`No order found with id ${req.params.id}`, 404));
  }

  res.status(200).json({ data: order });
});

// Delete order
exports.deleteOrder = asyncHandler(async (req, res, next) => {
  const order = await Order.findByIdAndDelete(req.params.id);

  if (!order) {
    return next(new ApiError(`No order found with id ${req.params.id}`, 404));
  }

  res.status(204).send();
});

// Get user orders
exports.getUserOrders = asyncHandler(async (req, res, next) => {
  const orders = await Order.find({ user: req.user._id });
  res.status(200).json({ results: orders.length, data: orders });
});

exports.payOrder = async (req, res, next) => {
  try {
    const orderId = req.params.id;

    // استخدم المتغير Order الموجود مسبقًا
    let order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ status: 'fail', message: 'Order not found' });
    }

    // تحديث حالة الدفع
    order.isPaid = true;
    order.paidAt = Date.now();

    await order.save();

    res.status(200).json({
      status: 'success',
      message: 'Order paid successfully',
      data: order,
    });
  } catch (err) {
    next(err);
  }
};
