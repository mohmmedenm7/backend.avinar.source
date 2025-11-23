const multer = require('multer');
const ApiError = require('../utils/apiError');

const multerOptions = () => {

  const multerStorage = multer.memoryStorage();

  const multerFilter = function (req, file, cb) {
    // السماح بالصور
    if (file.mimetype.startsWith('image')) {
      cb(null, true);
    }
    // السماح بالفيديو
    else if (file.mimetype.startsWith('video')) {
      cb(null, true);
    }
    // رفض أي نوع آخر
    else {
      cb(new ApiError('Only Images or Videos allowed', 400), false);
    }
  };

  const upload = multer({ storage: multerStorage, fileFilter: multerFilter });

  return upload;
};

exports.uploadSingleImage = (fieldName) => multerOptions().single(fieldName);

// الآن يدعم صور + فيديو بكل أنواعها
exports.uploadMixOfImages = (arrayOfFields) =>
  multerOptions().fields(arrayOfFields);
