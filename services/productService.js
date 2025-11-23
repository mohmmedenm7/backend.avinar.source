const multer = require('multer');
const ApiError = require('../utils/apiError');
const sharp = require('sharp');
const Product = require('../models/productModel');

// 1) disk storage (or memory storage for processing with sharp)
const multerStorage = multer.memoryStorage();

// 2) filter to allow images + videos
const multerFilter = function (req, file, cb) {
  if (
    file.mimetype.startsWith('image') ||
    file.mimetype.startsWith('video')
  ) {
    cb(null, true);
  } else {
    cb(new ApiError('Only images and videos are allowed', 400), false);
  }
};

const upload = multer({ storage: multerStorage, fileFilter: multerFilter });

// ⬅ IMPORTANT: match names with frontend
exports.uploadProductMedia = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'videos', maxCount: 2 },
]);

// Save uploaded files
exports.saveProductMedia = async (req, res, next) => {
  // إذا في imageCover
  if (req.files.imageCover) {
    req.body.imageCover = `product-${Date.now()}-cover.jpeg`;
    await sharp(req.files.imageCover[0].buffer)
      .jpeg({ quality: 90 })
      .toFile(`uploads/products/${req.body.imageCover}`);
  }

  // إذا في images
  if (req.files.images) {
    req.body.images = [];
    await Promise.all(
      req.files.images.map(async (file, index) => {
        const filename = `product-${Date.now()}-${index + 1}.jpeg`;
        await sharp(file.buffer)
          .jpeg({ quality: 90 })
          .toFile(`uploads/products/${filename}`);
        req.body.images.push(filename);
      })
    );
  }

  // Videos (no sharp)
  if (req.files.videos) {
    req.body.videos = [];
    req.files.videos.forEach((file) => {
      const filename = `product-video-${Date.now()}-${file.originalname}`;
      require('fs').writeFileSync(
        `uploads/products/${filename}`,
        file.buffer
      );
      req.body.videos.push(filename);
    });
  }

  next();
};

// Get all products
exports.getProducts = async (req, res, next) => {
  try {
    const products = await Product.find();
    res.status(200).json({ data: products });
  } catch (err) {
    next(err);
  }
};

// Get single product
exports.getProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return next(new ApiError('Product not found', 404));
    }
    res.status(200).json({ data: product });
  } catch (err) {
    next(err);
  }
};

// Create product
exports.createProduct = async (req, res, next) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json({ data: product });
  } catch (err) {
    next(err);
  }
};

// Update product
exports.updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!product) {
      return next(new ApiError('Product not found', 404));
    }
    res.status(200).json({ data: product });
  } catch (err) {
    next(err);
  }
};

// Delete product
exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return next(new ApiError('Product not found', 404));
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};