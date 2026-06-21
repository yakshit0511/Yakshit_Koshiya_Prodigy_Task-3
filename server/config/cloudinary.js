/**
 * config/cloudinary.js
 * -----------------------------------------
 * Cloudinary configuration and helper setup.
 * Exports the configured cloudinary instance
 * for use in upload middleware and controllers.
 * -----------------------------------------
 */

const cloudinary = require("cloudinary").v2;

/**
 * Configure Cloudinary with credentials from .env
 * These environment variables must be set before calling this.
 */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true, // Always use HTTPS URLs
});

/**
 * deleteFromCloudinary — Helper to delete an image by its publicId.
 * Called when a product image or profile photo is replaced / removed.
 *
 * @param {string} publicId - The Cloudinary public_id of the asset
 * @returns {Promise<object>} Cloudinary API response
 */
const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error(`❌ Cloudinary delete error for ${publicId}:`, error.message);
    throw error;
  }
};

/**
 * getCloudinaryUrl — Build an optimized URL with transformations.
 *
 * @param {string} publicId - The Cloudinary public_id
 * @param {object} options  - Transformation options (width, height, crop, etc.)
 * @returns {string} Optimized Cloudinary URL
 */
const getCloudinaryUrl = (publicId, options = {}) => {
  return cloudinary.url(publicId, {
    fetch_format: "auto",
    quality: "auto",
    ...options,
  });
};

module.exports = { cloudinary, deleteFromCloudinary, getCloudinaryUrl };
