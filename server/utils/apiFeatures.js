/**
 * utils/apiFeatures.js
 * -----------------------------------------
 * Reusable query builder class for Mongoose.
 * Chains search, filter, sort and pagination
 * on any Mongoose query object.
 *
 * Usage:
 *   const features = new ApiFeatures(Product.find(), req.query)
 *     .search(['name', 'description', 'tags'])
 *     .filter()
 *     .sort()
 *     .paginate();
 *   const products = await features.query;
 * -----------------------------------------
 */

class ApiFeatures {
  /**
   * @param {mongoose.Query} query - Base Mongoose query (e.g. Model.find())
   * @param {object} queryString - req.query object from Express
   */
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
    this.totalCount = 0; // Will be populated after count()
  }

  // =============================================
  // SEARCH — Full-text keyword search
  // =============================================

  /**
   * search — Applies a case-insensitive regex search on given fields.
   * Falls back to MongoDB text index if keyword starts with "text:".
   *
   * @param {string[]} fields - Document fields to search in
   * @returns {ApiFeatures} this (chainable)
   */
  search(fields = ["name"]) {
    const keyword = this.queryString.search;

    if (keyword) {
      // Build $or query matching keyword across all specified fields
      const searchConditions = fields.map((field) => ({
        [field]: {
          $regex: keyword,
          $options: "i", // Case-insensitive
        },
      }));

      this.query = this.query.find({ $or: searchConditions });
    }

    return this;
  }

  // =============================================
  // FILTER — Dynamic field filtering
  // =============================================

  /**
   * filter — Removes non-filter query params (page, limit, sort, search),
   * then converts gte/gt/lte/lt operators into Mongoose format.
   *
   * Supports:
   *  - category=slug
   *  - brand=Nike
   *  - minPrice=100&maxPrice=500  (maps to price range)
   *  - rating=4                   (minimum rating)
   *  - inStock=true
   *  - isFeatured=true
   *
   * @returns {ApiFeatures} this (chainable)
   */
  filter() {
    const queryObj = { ...this.queryString };

    // Fields that are NOT filters — exclude them
    const excludedFields = ["page", "limit", "sort", "search", "fields"];
    excludedFields.forEach((field) => delete queryObj[field]);

    // ---- Price range ----
    if (queryObj.minPrice || queryObj.maxPrice) {
      const priceFilter = {};
      if (queryObj.minPrice) priceFilter["$gte"] = Number(queryObj.minPrice);
      if (queryObj.maxPrice) priceFilter["$lte"] = Number(queryObj.maxPrice);
      queryObj.price = priceFilter;
      delete queryObj.minPrice;
      delete queryObj.maxPrice;
    }

    // ---- Minimum rating ----
    if (queryObj.rating) {
      queryObj.ratings = { $gte: Number(queryObj.rating) };
      delete queryObj.rating;
    }

    // ---- Boolean conversions ----
    if (queryObj.inStock !== undefined) {
      queryObj.isInStock = queryObj.inStock === "true";
      delete queryObj.inStock;
    }

    if (queryObj.isFeatured !== undefined) {
      queryObj.isFeatured = queryObj.isFeatured === "true";
    }

    // ---- Always filter only active products (for public routes) ----
    // Admin routes should call filter({ includeInactive: true })
    if (!queryObj.includeInactive) {
      queryObj.isActive = true;
    }
    delete queryObj.includeInactive;

    // ---- Category by slug: look up category from slug ----
    // Note: category slug→id conversion happens in the controller
    // Here we pass category value as-is (controller sets category._id)

    // Convert remaining operators (gte, gt, lte, lt)
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(
      /\b(gte|gt|lte|lt)\b/g,
      (match) => `$${match}`
    );

    this.query = this.query.find(JSON.parse(queryStr));
    return this;
  }

  // =============================================
  // SORT
  // =============================================

  /**
   * sort — Applies sorting based on the sortBy query param.
   *
   * Supported values:
   *  - "price"    → ascending price
   *  - "-price"   → descending price
   *  - "rating"   → best rated first
   *  - "newest"   → most recently added
   *  - "popular"  → most reviews first
   *
   * @returns {ApiFeatures} this (chainable)
   */
  sort() {
    const sortMap = {
      price: "price",
      "-price": "-price",
      rating: "-ratings",
      newest: "-createdAt",
      popular: "-numReviews",
      oldest: "createdAt",
    };

    const sortBy = this.queryString.sortBy || "newest";
    const sortField = sortMap[sortBy] || "-createdAt";

    this.query = this.query.sort(sortField);
    return this;
  }

  // =============================================
  // PAGINATION
  // =============================================

  /**
   * paginate — Applies skip/limit for page-based pagination.
   *
   * @param {number} defaultLimit - Items per page if not specified
   * @returns {ApiFeatures} this (chainable)
   */
  paginate(defaultLimit = 12) {
    const page = Math.max(1, parseInt(this.queryString.page, 10) || 1);
    const limit = Math.min(
      100, // Max 100 items per page
      Math.max(1, parseInt(this.queryString.limit, 10) || defaultLimit)
    );
    const skip = (page - 1) * limit;

    this.page = page;
    this.limit = limit;

    this.query = this.query.skip(skip).limit(limit);
    return this;
  }

  // =============================================
  // FIELD SELECTION (Projection)
  // =============================================

  /**
   * selectFields — Returns only specified fields.
   * Useful for lightweight list responses.
   *
   * @returns {ApiFeatures} this (chainable)
   */
  selectFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(",").join(" ");
      this.query = this.query.select(fields);
    } else {
      // Exclude internal Mongoose version key by default
      this.query = this.query.select("-__v");
    }
    return this;
  }
}

module.exports = ApiFeatures;
