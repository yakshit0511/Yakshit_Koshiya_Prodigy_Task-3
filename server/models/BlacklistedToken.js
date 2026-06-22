/**
 * models/BlacklistedToken.js
 * -----------------------------------------
 * Token blacklist database schema.
 * Stores JWT signatures (access and refresh tokens)
 * that have been invalidated prior to their expiry
 * (e.g., during logout or rotation).
 *
 * Uses MongoDB TTL (Time To Live) index to
 * automatically prune expired tokens from the collection.
 * -----------------------------------------
 */

const mongoose = require("mongoose");

const blacklistedTokenSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// TTL Index: Automatically delete document when 'expiresAt' matches the current time
// expireAfterSeconds: 0 means the document expires exactly at the 'expiresAt' timestamp
blacklistedTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("BlacklistedToken", blacklistedTokenSchema);
