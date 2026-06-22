/**
 * middleware/validate.js
 * -----------------------------------------
 * Input validation middleware using express-validator.
 *
 * Defines reusable validation schemas for auth, products,
 * orders, reviews and coupons.
 *
 * Stops execution and returns formatted error arrays (400 Bad Request)
 * if schema criteria are violated.
 * -----------------------------------------
 */

const { body, validationResult } = require("express-validator");

/**
 * validate — Wrapper function that runs a list of validations
 * and checks for errors. Returns 400 with errors if validation fails.
 *
 * @param {Array} validations - Array of express-validator rules
 * @returns {Function} Express middleware function
 */
const validate = (validations) => {
  return async (req, res, next) => {
    // Run all validations
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    // Format errors for consumer
    const formattedErrors = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg,
    }));

    return res.status(400).json({
      success: false,
      message: "Validation failed.",
      errors: formattedErrors,
    });
  };
};

// =============================================
// VALIDATION SCHEMAS
// =============================================

const registerSchema = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters"),
  body("email")
    .trim()
    .isEmail()
    .withMessage("Please enter a valid email address")
    .normalizeEmail(),
  body("phone")
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^[6-9]\d{9}$/)
    .withMessage("Please enter a valid 10-digit Indian phone number starting with 6-9"),
  body("password")
    .trim()
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
];

const loginSchema = [
  body("email")
    .trim()
    .isEmail()
    .withMessage("Please enter a valid email address")
    .normalizeEmail(),
  body("password")
    .notEmpty()
    .withMessage("Password is required"),
];

const productSchema = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Product name is required")
    .isLength({ max: 100 })
    .withMessage("Product name cannot exceed 100 characters"),
  body("shortDescription")
    .trim()
    .notEmpty()
    .withMessage("Short description is required")
    .isLength({ max: 250 })
    .withMessage("Short description cannot exceed 250 characters"),
  body("description")
    .trim()
    .notEmpty()
    .withMessage("Full description is required")
    .isLength({ max: 2000 })
    .withMessage("Full description cannot exceed 2000 characters"),
  body("category")
    .trim()
    .notEmpty()
    .withMessage("Category is required")
    .isMongoId()
    .withMessage("Invalid Category ID format"),
  body("brand")
    .trim()
    .notEmpty()
    .withMessage("Brand name is required"),
  body("price")
    .isFloat({ min: 0.01 })
    .withMessage("Price must be a number greater than 0"),
  body("discountPrice")
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage("Discount price must be 0 or more")
    .custom((val, { req }) => {
      if (Number(val) >= Number(req.body.price)) {
        throw new Error("Discount price must be strictly less than original price");
      }
      return true;
    }),
  body("stock")
    .isInt({ min: 0 })
    .withMessage("Stock quantity must be an integer, 0 or more"),
  body("unit")
    .trim()
    .notEmpty()
    .withMessage("Unit label is required (e.g., kg, pieces)"),
];

const orderSchema = [
  body("shippingAddress.name")
    .trim()
    .notEmpty()
    .withMessage("Shipping recipient name is required"),
  body("shippingAddress.phone")
    .trim()
    .matches(/^[6-9]\d{9}$/)
    .withMessage("Please enter a valid 10-digit shipping contact number"),
  body("shippingAddress.street")
    .trim()
    .notEmpty()
    .withMessage("Street address is required"),
  body("shippingAddress.city")
    .trim()
    .notEmpty()
    .withMessage("City is required"),
  body("shippingAddress.state")
    .trim()
    .notEmpty()
    .withMessage("State is required"),
  body("shippingAddress.pincode")
    .trim()
    .matches(/^\d{6}$/)
    .withMessage("Pincode must be a 6-digit number"),
  body("paymentMethod")
    .trim()
    .isIn(["COD", "Online"])
    .withMessage("Payment method must be either 'COD' or 'Online'"),
];

const reviewSchema = [
  body("rating")
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating must be an integer score between 1 and 5"),
  body("title")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage("Review title cannot exceed 100 characters"),
  body("comment")
    .trim()
    .notEmpty()
    .withMessage("Comment text is required")
    .isLength({ max: 2000 })
    .withMessage("Comment cannot exceed 2000 characters"),
];

const couponSchema = [
  body("code")
    .trim()
    .notEmpty()
    .withMessage("Coupon code is required")
    .matches(/^[A-Z0-9_-]+$/)
    .withMessage("Coupon code can only contain capital letters, numbers, hyphens, and underscores"),
  body("discountType")
    .trim()
    .isIn(["percentage", "fixed"])
    .withMessage("Discount type must be either 'percentage' or 'fixed'"),
  body("discountValue")
    .isFloat({ min: 1 })
    .withMessage("Discount value must be at least 1"),
  body("minOrderAmount")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Minimum order amount must be 0 or more"),
  body("maxDiscountAmount")
    .optional({ nullable: true, checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage("Max discount amount must be 0 or more"),
  body("usageLimit")
    .optional({ nullable: true, checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage("Usage limit must be a positive integer"),
  body("validFrom")
    .isISO8601()
    .withMessage("Valid From must be a valid ISO 8601 date (YYYY-MM-DD)"),
  body("validUntil")
    .isISO8601()
    .withMessage("Valid Until must be a valid ISO 8601 date (YYYY-MM-DD)")
    .custom((val, { req }) => {
      if (new Date(val) <= new Date(req.body.validFrom)) {
        throw new Error("Valid Until date must be after Valid From date");
      }
      return true;
    }),
];

module.exports = {
  validate,
  registerSchema,
  loginSchema,
  productSchema,
  orderSchema,
  reviewSchema,
  couponSchema,
};
