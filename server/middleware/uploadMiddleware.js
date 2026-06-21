/**
 * middleware/uploadMiddleware.js
 * -----------------------------------------
 * Multer + Cloudinary upload configurations.
 * Uses multer-storage-cloudinary to stream
 * files directly to Cloudinary (no local disk).
 *
 * Separate upload configs for:
 *  - productImages   : max 5, 5MB each
 *  - profilePhoto    : max 1, 2MB
 *  - reviewImages    : max 3, 2MB each
 *  - supportAttach   : max 3, 5MB each
 * -----------------------------------------
 */

const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const { cloudinary } = require("../config/cloudinary");

// ---- Allowed image MIME types ----
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

/**
 * fileFilter — Reject non-image files with a clear error message.
 */
const fileFilter = (req, file, cb) => {
  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error("Only JPG, JPEG, PNG and WEBP image files are allowed."),
      false
    );
  }
};

// =============================================
// CLOUDINARY STORAGE FACTORIES
// =============================================

/**
 * createCloudinaryStorage — Creates a Cloudinary storage engine
 * for a given folder and optional transformation.
 *
 * @param {string} folder - Cloudinary folder name
 * @param {object} transformation - Optional Cloudinary transformations
 */
const createCloudinaryStorage = (folder, transformation = []) => {
  return new CloudinaryStorage({
    cloudinary,
    params: {
      folder: `local-store/${folder}`,
      allowed_formats: ["jpg", "jpeg", "png", "webp"],
      transformation,
      // Unique filename using timestamp + original name
      public_id: (req, file) => {
        const name = file.originalname.split(".")[0].replace(/\s+/g, "-");
        return `${name}-${Date.now()}`;
      },
    },
  });
};

// =============================================
// UPLOAD INSTANCES
// =============================================

/**
 * uploadProductImages
 * - Up to 5 images per product
 * - Max 5MB each
 * - Resize to 800x800 on Cloudinary side
 */
const uploadProductImages = multer({
  storage: createCloudinaryStorage("products", [
    { width: 800, height: 800, crop: "limit", quality: "auto" },
  ]),
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 5,
  },
}).array("images", 5);

/**
 * uploadProfilePhoto
 * - Single file only
 * - Max 2MB
 * - Crop to square avatar
 */
const uploadProfilePhoto = multer({
  storage: createCloudinaryStorage("profiles", [
    { width: 400, height: 400, crop: "fill", gravity: "face", quality: "auto" },
  ]),
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB
    files: 1,
  },
}).single("profilePhoto");

/**
 * uploadReviewImages
 * - Up to 3 images per review
 * - Max 2MB each
 */
const uploadReviewImages = multer({
  storage: createCloudinaryStorage("reviews", [
    { width: 600, height: 600, crop: "limit", quality: "auto" },
  ]),
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB
    files: 3,
  },
}).array("images", 3);

/**
 * uploadSupportAttachments
 * - Up to 3 attachments per support message
 * - Max 5MB each
 * - Accepts images only (could be extended for PDFs)
 */
const uploadSupportAttachments = multer({
  storage: createCloudinaryStorage("support"),
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 3,
  },
}).array("attachments", 3);

/**
 * uploadCategoryImage
 * - Single image for category banner/icon
 * - Max 2MB
 */
const uploadCategoryImage = multer({
  storage: createCloudinaryStorage("categories", [
    { width: 600, height: 400, crop: "fill", quality: "auto" },
  ]),
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB
    files: 1,
  },
}).single("image");

/**
 * handleUploadError — Wraps multer middleware to convert multer errors
 * into the standard API error format.
 *
 * @param {Function} uploadMiddleware - A multer upload middleware
 * @returns {Function} Express middleware
 */
const handleUploadError = (uploadMiddleware) => {
  return (req, res, next) => {
    uploadMiddleware(req, res, (err) => {
      if (!err) return next();

      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            success: false,
            message: "File too large. Check the size limits.",
          });
        }
        if (err.code === "LIMIT_FILE_COUNT") {
          return res.status(400).json({
            success: false,
            message: "Too many files uploaded.",
          });
        }
        return res.status(400).json({ success: false, message: err.message });
      }

      // Custom fileFilter error
      return res.status(400).json({ success: false, message: err.message });
    });
  };
};

module.exports = {
  uploadProductImages: handleUploadError(uploadProductImages),
  uploadProfilePhoto: handleUploadError(uploadProfilePhoto),
  uploadReviewImages: handleUploadError(uploadReviewImages),
  uploadSupportAttachments: handleUploadError(uploadSupportAttachments),
  uploadCategoryImage: handleUploadError(uploadCategoryImage),
};
