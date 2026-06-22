/**
 * config/indexes.js
 * -----------------------------------------
 * Database Index Initialiser.
 *
 * Configures optimal indices for MongoDB Atlas:
 *  - Uniqueness constraints (email, slug, sku, orderNumber)
 *  - Compound indices (isActive/isFeatured, user/createdAt)
 *  - Range query support (price, stock)
 *  - Compound text index for full-text search (name, description, tags)
 * -----------------------------------------
 */

const User = require("../models/User");
const Product = require("../models/Product");
const Order = require("../models/Order");
const Review = require("../models/Review");
const logger = require("../utils/logger");

/**
 * initIndexes — Ensures all schemas have defined indices and
 * synchronises them with the remote MongoDB collections.
 */
const initIndexes = async () => {
  try {
    logger.info("Configuring MongoDB indexes...");

    // 1. User Indices
    User.schema.index({ email: 1 }, { unique: true });
    User.schema.index({ createdAt: -1 });

    // 2. Product Indices
    Product.schema.index({ slug: 1 }, { unique: true });
    Product.schema.index({ sku: 1 }, { unique: true });
    Product.schema.index({ category: 1 });
    Product.schema.index({ isActive: 1, isFeatured: 1 });
    Product.schema.index({ price: 1 });
    Product.schema.index({ ratings: -1 });
    Product.schema.index({ stock: 1 });
    
    // Full-Text Search: Combined compound text index (Max 1 text index per collection)
    Product.schema.index(
      { name: "text", description: "text", tags: "text" },
      { 
        weights: { name: 10, tags: 5, description: 1 },
        name: "ProductTextSearchIndex"
      }
    );

    // 3. Order Indices
    Order.schema.index({ orderNumber: 1 }, { unique: true });
    Order.schema.index({ user: 1 });
    Order.schema.index({ orderStatus: 1 });
    Order.schema.index({ createdAt: -1 });
    Order.schema.index({ user: 1, createdAt: -1 });

    // 4. Review Indices
    Review.schema.index({ product: 1, user: 1 }, { unique: true });
    Review.schema.index({ product: 1, isApproved: 1 });
    Review.schema.index({ createdAt: -1 });

    // Sync all indexes with the live database collections
    await Promise.all([
      User.syncIndexes(),
      Product.syncIndexes(),
      Order.syncIndexes(),
      Review.syncIndexes()
    ]);

    logger.info("⚡ MongoDB Database indexes synchronized successfully!");
  } catch (error) {
    logger.error("❌ Failed to synchronize MongoDB indexes: " + error.message);
  }
};

module.exports = initIndexes;
