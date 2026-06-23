/**
 * config/indexes.js
 * -----------------------------------------
 * Database Index Initialiser.
 *
 * All index DEFINITIONS live in the model schema files.
 * This file only calls syncIndexes() to ensure the live
 * MongoDB collections match the schema definitions.
 *
 * NOTE: If you change a text index (weights, name) in a model,
 * you must first manually drop the old index in MongoDB Atlas:
 *   db.products.dropIndex("name_text_description_text_tags_text")
 * Then restart the server to let Mongoose create the new one.
 * -----------------------------------------
 */

const User = require("../models/User");
const Product = require("../models/Product");
const Order = require("../models/Order");
const Review = require("../models/Review");
const logger = require("../utils/logger");

/**
 * initIndexes — Synchronises schema indexes with MongoDB.
 * Does NOT re-declare indexes here — that caused duplicate
 * index warnings because models already define their own indexes.
 */
const initIndexes = async () => {
  // Sync each model individually so one failure doesn't block others
  const models = [
    { name: "User", model: User },
    { name: "Product", model: Product },
    { name: "Order", model: Order },
    { name: "Review", model: Review },
  ];

  for (const { name, model } of models) {
    try {
      await model.syncIndexes();
      logger.info(`✅ Indexes synced: ${name}`);
    } catch (err) {
      // Text index conflicts happen when weights/names differ from existing index.
      // This is non-fatal — the old index still works for search.
      // To fix permanently: drop the old index in MongoDB Atlas, then restart.
      logger.warn(
        `⚠️  Index sync warning for ${name} (non-fatal): ${err.message}`
      );
    }
  }
};

module.exports = initIndexes;
