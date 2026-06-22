/**
 * middleware/uploadMiddleware.js
 * -----------------------------------------
 * Secure Multer memory storage and Cloudinary integration.
 *
 * Implements:
 *  - Memory storage to avoid writing raw files to disk.
 *  - File content spoofing validation (verifying magic bytes, not just extensions).
 *  - Automatic filename randomisation to UUIDs.
 *  - Virus scan integration placeholders (ClamAV comments).
 *  - Direct buffer streaming to Cloudinary via upload_stream.
 * -----------------------------------------
 */

const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const { cloudinary } = require("../config/cloudinary");
const logger = require("../utils/logger");

// ---- Allowed image MIME types ----
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

// Multer storage engine in memory
const memoryStorage = multer.memoryStorage();

// Reusable file filter based on MIME type
const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error("Only JPG, JPEG, PNG, and WEBP image files are allowed."),
      false
    );
  }
};

/**
 * validateMagicBytes — Inspects the binary header (first 4 bytes) of a buffer
 * to check if the file is actually a valid JPEG, PNG, or WebP.
 *
 * @param {Buffer} buffer - File buffer
 * @returns {string|null} The verified format, or null if spoofed/invalid
 */
const validateMagicBytes = (buffer) => {
  if (!buffer || buffer.length < 4) return null;
  
  const hex = buffer.toString("hex", 0, 4).toLowerCase();
  
  // PNG: 89 50 4E 47
  if (hex === "89504e47") return "png";
  
  // JPEG: FF D8 FF (Starts with ffd8ff)
  if (hex.startsWith("ffd8ff")) return "jpeg";
  
  // WebP: RIFF .... WEBP (Starts with 52494646 "RIFF", and bytes 8-12 are 57454250 "WEBP")
  if (hex === "52494646") {
    if (buffer.length >= 12) {
      const webpHex = buffer.toString("hex", 8, 12).toLowerCase();
      if (webpHex === "57454250") return "webp";
    }
  }

  return null;
};

/**
 * streamUpload — Helper that pipes an in-memory buffer to Cloudinary.
 *
 * @param {Buffer} buffer - File buffer
 * @param {object} options - Cloudinary upload stream options
 * @returns {Promise<object>} Cloudinary upload result
 */
const streamUpload = (buffer, options) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) {
        logger.error("Cloudinary upload_stream failed: " + error.message);
        return reject(error);
      }
      resolve(result);
    });
    stream.end(buffer);
  });
};

/**
 * handleSecureUpload — Common middleware logic to validate files, check magic
 * bytes, run a virus scanner, and upload to Cloudinary.
 *
 * @param {string} multerFieldType - 'single' or 'array'
 * @param {string} fieldName - Name of form-data field
 * @param {object} multerInstance - Configured Multer upload instance
 * @param {string} folderName - Cloudinary target folder
 * @param {object} [transformation] - Cloudinary transformation options
 */
const handleSecureUpload = (multerFieldType, fieldName, multerInstance, folderName, transformation = []) => {
  return (req, res, next) => {
    multerInstance(req, res, async (err) => {
      if (err) {
        let message = err.message;
        if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_FILE_SIZE") message = "File is too large. Size limits apply.";
          if (err.code === "LIMIT_FILE_COUNT") message = "Too many files uploaded.";
        }
        return res.status(400).json({ success: false, message });
      }

      // Collect files to validate
      const filesToProcess = [];
      if (multerFieldType === "single" && req.file) {
        filesToProcess.push(req.file);
      } else if (multerFieldType === "array" && req.files && req.files.length > 0) {
        filesToProcess.push(...req.files);
      }

      if (filesToProcess.length === 0) {
        return next();
      }

      try {
        // Validate Magic Bytes for all files (anti-spoofing)
        for (const file of filesToProcess) {
          const verifiedFormat = validateMagicBytes(file.buffer);
          if (!verifiedFormat) {
            logger.warn(`Security Alert: Blocked spoofed upload attempt for filename="${file.originalname}" from IP="${req.ip}"`);
            return res.status(400).json({
              success: false,
              message: `Security validation failed. "${file.originalname}" is not a valid JPEG/PNG/WebP image.`,
            });
          }

          // ----------------------------------------------------
          // VIRUS SCAN PLACEHOLDER (e.g. ClamAV integration)
          // In a production server:
          // const clamScanner = await clamav.connect();
          // const result = await clamScanner.scanBuffer(file.buffer);
          // if (result.isInfected) {
          //    logger.error(`Malware Detected: filename="${file.originalname}" is infected!`);
          //    return res.status(400).json({ success: false, message: "File contains virus/malware." });
          // }
          // ----------------------------------------------------
        }

        // Upload to Cloudinary using UUID filename
        if (multerFieldType === "single" && req.file) {
          const file = req.file;
          const uuidName = uuidv4();
          
          const result = await streamUpload(file.buffer, {
            folder: `local-store/${folderName}`,
            public_id: uuidName,
            transformation,
          });

          // Mutate req.file to match format expected by controllers
          req.file = {
            path: result.secure_url,
            filename: result.public_id,
            originalname: file.originalname,
          };
        } else if (multerFieldType === "array" && req.files) {
          const uploadedResults = [];
          for (const file of req.files) {
            const uuidName = uuidv4();
            const result = await streamUpload(file.buffer, {
              folder: `local-store/${folderName}`,
              public_id: uuidName,
              transformation,
            });

            uploadedResults.push({
              path: result.secure_url,
              filename: result.public_id,
              originalname: file.originalname,
            });
          }
          // Mutate req.files
          req.files = uploadedResults;
        }

        next();
      } catch (uploadErr) {
        logger.error("Cloudinary upload failed: " + uploadErr.message);
        return res.status(500).json({
          success: false,
          message: "Failed to upload file(s) to cloud storage.",
        });
      }
    });
  };
};

// =============================================
// SECURE UPLOAD MIDDLEWARE INSTANCES
// =============================================

const multerProducts = multer({
  storage: memoryStorage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
}).array("images", 5);

const multerProfile = multer({
  storage: memoryStorage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
}).single("profilePhoto");

const multerReviews = multer({
  storage: memoryStorage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024, files: 3 },
}).array("images", 3);

const multerSupport = multer({
  storage: memoryStorage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 3 },
}).array("attachments", 3);

const multerCategory = multer({
  storage: memoryStorage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
}).single("image");

module.exports = {
  uploadProductImages: handleSecureUpload("array", "images", multerProducts, "products", [
    { width: 800, height: 800, crop: "limit", quality: "auto" },
  ]),
  uploadProfilePhoto: handleSecureUpload("single", "profilePhoto", multerProfile, "profiles", [
    { width: 400, height: 400, crop: "fill", gravity: "face", quality: "auto" },
  ]),
  uploadReviewImages: handleSecureUpload("array", "images", multerReviews, "reviews", [
    { width: 600, height: 600, crop: "limit", quality: "auto" },
  ]),
  uploadSupportAttachments: handleSecureUpload("array", "attachments", multerSupport, "support"),
  uploadCategoryImage: handleSecureUpload("single", "image", multerCategory, "categories", [
    { width: 600, height: 400, crop: "fill", quality: "auto" },
  ]),
};
