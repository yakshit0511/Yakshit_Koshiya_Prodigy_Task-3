/**
 * controllers/authController.js
 * -----------------------------------------
 * Handles all authentication operations:
 * Register, Login, Logout, Refresh Token,
 * Forgot/Reset Password, Profile management,
 * Address CRUD.
 * -----------------------------------------
 */

const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const BlacklistedToken = require("../models/BlacklistedToken");
const { asyncHandler } = require("../middleware/errorHandler");
const { sendEmail } = require("../utils/sendEmail");
const { deleteFromCloudinary } = require("../config/cloudinary");

// =============================================
// TOKEN HELPERS
// =============================================

/**
 * generateAccessToken — Signs a short-lived JWT access token.
 * @param {string} userId - MongoDB user _id
 * @returns {string} JWT access token
 */
const generateAccessToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRE || "15m",
  });
};

/**
 * generateRefreshToken — Signs a long-lived refresh token.
 * @param {string} userId
 * @returns {string} JWT refresh token
 */
const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || "7d",
  });
};

/**
 * sendRefreshTokenCookie — Sets httpOnly refresh token cookie.
 * @param {object} res - Express response
 * @param {string} token - Refresh token string
 */
const sendRefreshTokenCookie = (res, token) => {
  res.cookie("refreshToken", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  });
};

// =============================================
// @route   POST /api/auth/register
// @access  Public
// =============================================
const register = asyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body;

  // ---- Validate required fields ----
  if (!name || !email || !password) {
    res.status(400);
    throw new Error("Name, email and password are required.");
  }

  // ---- Check for existing user ----
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    res.status(409);
    throw new Error("An account with this email already exists.");
  }

  // ---- Create user (password hashed in pre-save hook) ----
  const user = await User.create({ name, email, phone, password });

  // ---- Generate tokens ----
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  // ---- Save refresh token in DB for later invalidation ----
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  // ---- Set refresh token as httpOnly cookie ----
  sendRefreshTokenCookie(res, refreshToken);

  // ---- Send welcome email (non-blocking) ----
  sendEmail({
    to: user.email,
    template: "welcome",
    data: { user: { name: user.name, email: user.email, role: user.role } },
  }).catch((err) => console.error("Welcome email failed:", err.message));

  res.status(201).json({
    success: true,
    message: "Account created successfully. Welcome!",
    accessToken,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      profilePhoto: user.profilePhoto,
      isVerified: user.isVerified,
    },
  });
});

// =============================================
// @route   POST /api/auth/login
// @access  Public
// =============================================
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error("Email and password are required.");
  }

  // ---- Find user and explicitly select password and locking/tracking fields ----
  const user = await User.findOne({ email: email.toLowerCase() }).select(
    "+password +refreshToken failedLoginAttempts lockUntil lastLoginIP lastLoginAt"
  );

  if (!user) {
    res.status(401);
    throw new Error("Invalid email or password.");
  }

  // ---- Check if blocked ----
  if (user.isBlocked) {
    res.status(403);
    throw new Error(
      "Your account has been blocked. Please contact support."
    );
  }

  // ---- Check if account is locked ----
  const now = new Date();
  if (user.lockUntil && user.lockUntil > now) {
    res.status(403);
    throw new Error(
      `Your account is temporarily locked due to multiple failed login attempts. Please try again later.`
    );
  }

  // ---- Compare password ----
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    // If account was locked previously but lock duration passed, reset attempts
    if (user.lockUntil && user.lockUntil <= now) {
      user.failedLoginAttempts = 1;
      user.lockUntil = null;
    } else {
      user.failedLoginAttempts += 1;
    }

    // Set lock if attempts reach 5
    if (user.failedLoginAttempts >= 5) {
      user.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // Lock for 30 minutes
    }

    await user.save({ validateBeforeSave: false });
    res.status(401);
    throw new Error("Invalid email or password.");
  }

  // ---- Success: Reset attempts and locks ----
  const currentIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || req.ip;

  // Send security email if login IP changed
  if (user.lastLoginIP && user.lastLoginIP !== currentIp) {
    sendEmail({
      to: user.email,
      template: "securityAlert",
      data: {
        user,
        alertDetails: {
          title: "New Login IP Detected",
          description: `A new login was detected from IP address: ${currentIp}. If this was you, no action is needed.`,
        },
      },
    }).catch((err) => console.error("IP change login security alert email failed:", err.message));
  }

  // Update tracking fields
  user.failedLoginAttempts = 0;
  user.lockUntil = null;
  user.lastLoginIP = currentIp;
  user.lastLoginAt = now;

  // ---- Generate new tokens ----
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  // ---- Update refresh token in DB ----
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  sendRefreshTokenCookie(res, refreshToken);

  res.status(200).json({
    success: true,
    message: "Logged in successfully.",
    accessToken,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      profilePhoto: user.profilePhoto,
      isVerified: user.isVerified,
      wishlist: user.wishlist,
    },
  });
});

// =============================================
// @route   POST /api/auth/logout
// @access  Private
// =============================================
const logout = asyncHandler(async (req, res) => {
  const token = req.cookies.refreshToken;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
      const expiresAt = decoded.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await BlacklistedToken.create({ token, expiresAt });
    } catch (err) {
      // Ignore token verification errors during logout, but still delete from DB
    }
  }

  // Clear the refresh token from DB to invalidate it
  await User.findByIdAndUpdate(req.user._id, {
    $unset: { refreshToken: "" },
  });

  // Clear the cookie
  res.cookie("refreshToken", "", {
    httpOnly: true,
    expires: new Date(0),
  });

  res.status(200).json({ success: true, message: "Logged out successfully." });
});

// =============================================
// @route   POST /api/auth/refresh-token
// @access  Public (uses httpOnly cookie)
// =============================================
const refreshToken = asyncHandler(async (req, res) => {
  const token = req.cookies.refreshToken;

  if (!token) {
    res.status(401);
    throw new Error("No refresh token found. Please log in.");
  }

  // ---- 1. Check if token is blacklisted (Token reuse detection) ----
  const isBlacklisted = await BlacklistedToken.findOne({ token });
  if (isBlacklisted) {
    // Clear cookie
    res.cookie("refreshToken", "", {
      httpOnly: true,
      expires: new Date(0),
    });

    // Revoke all sessions for this user
    try {
      const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
      const user = await User.findById(decoded.id);
      if (user) {
        user.refreshToken = undefined;
        await user.save({ validateBeforeSave: false });

        // Send alert email
        await sendEmail({
          to: user.email,
          template: "securityAlert",
          data: {
            user,
            alertDetails: {
              title: "Compromised Session Detected",
              description: "A refresh token from a previously rotated session was reused. For your security, we have terminated all active sessions on your account. If you did not perform this action, please reset your password immediately.",
            },
          },
        }).catch((err) => console.error("RTR security email warning failed:", err.message));
      }
    } catch (err) {
      console.error("Token reuse handling error:", err.message);
    }

    res.status(401);
    throw new Error("Security Alert: Session has expired or has been compromised. Please log in again.");
  }

  // ---- 2. Verify refresh token ----
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (err) {
    res.status(401);
    throw new Error("Invalid or expired refresh token. Please log in.");
  }

  // ---- 3. Find user and check stored refresh token matches ----
  const user = await User.findById(decoded.id).select("+refreshToken");
  if (!user || user.refreshToken !== token) {
    res.status(401);
    throw new Error("Refresh token mismatch. Please log in.");
  }

  if (user.isBlocked) {
    res.status(403);
    throw new Error("Account blocked. Contact support.");
  }

  // ---- 4. Rotate refresh token (RTR) ----
  const newAccessToken = generateAccessToken(user._id);
  const newRefreshToken = generateRefreshToken(user._id);

  // Blacklist the old refresh token
  const expiresAt = decoded.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await BlacklistedToken.create({
    token,
    expiresAt,
  });

  // Update refresh token in DB
  user.refreshToken = newRefreshToken;
  await user.save({ validateBeforeSave: false });

  sendRefreshTokenCookie(res, newRefreshToken);

  res.status(200).json({
    success: true,
    accessToken: newAccessToken,
  });
});

// =============================================
// @route   POST /api/auth/forgot-password
// @access  Public
// =============================================
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    res.status(400);
    throw new Error("Email address is required.");
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  // Always return 200 to prevent email enumeration attacks
  if (!user) {
    return res.status(200).json({
      success: true,
      message: "If an account exists with this email, a reset link has been sent.",
    });
  }

  // ---- Generate reset token and save hashed version ----
  const resetToken = user.getResetPasswordToken();
  await user.save({ validateBeforeSave: false });

  // ---- Build reset URL ----
  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

  // ---- Send reset email ----
  try {
    await sendEmail({
      to: user.email,
      template: "passwordReset",
      data: {
        user: { name: user.name },
        resetUrl,
      },
    });
  } catch (emailErr) {
    // If email fails, clear the reset token so user can try again
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });

    res.status(500);
    throw new Error("Failed to send reset email. Please try again later.");
  }

  res.status(200).json({
    success: true,
    message: "Password reset link sent to your email.",
  });
});

// =============================================
// @route   PUT /api/auth/reset-password/:token
// @access  Public
// =============================================
const resetPassword = asyncHandler(async (req, res) => {
  const { password } = req.body;

  if (!password || password.length < 6) {
    res.status(400);
    throw new Error("Password must be at least 6 characters.");
  }

  // ---- Hash the token from URL to compare with stored hash ----
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  // ---- Find user with valid (non-expired) token ----
  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    res.status(400);
    throw new Error("Invalid or expired password reset token.");
  }

  // ---- Update password and clear reset fields ----
  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  user.refreshToken = undefined; // Invalidate all sessions
  await user.save();

  res.status(200).json({
    success: true,
    message: "Password reset successfully. Please log in with your new password.",
  });
});

// =============================================
// @route   GET /api/auth/me
// @access  Private
// =============================================
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate("wishlist", "name slug images price discountPrice ratings")
    .select("-password -resetPasswordToken -resetPasswordExpire -refreshToken");

  if (!user) {
    res.status(404);
    throw new Error("User not found.");
  }

  res.status(200).json({ success: true, user });
});

// =============================================
// @route   PUT /api/auth/update-profile
// @access  Private
// =============================================
const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone } = req.body;

  const updateData = {};
  if (name) updateData.name = name;
  if (phone) updateData.phone = phone;

  // ---- Handle profile photo upload ----
  if (req.file) {
    // If user already has a photo, delete old one from Cloudinary
    const currentUser = await User.findById(req.user._id).select("profilePhoto");
    if (currentUser.profilePhoto?.publicId) {
      await deleteFromCloudinary(currentUser.profilePhoto.publicId).catch(
        (err) => console.error("Failed to delete old profile photo:", err)
      );
    }
    updateData.profilePhoto = {
      url: req.file.path,
      publicId: req.file.filename,
    };
  }

  const user = await User.findByIdAndUpdate(req.user._id, updateData, {
    new: true,
    runValidators: true,
  }).select("-password -resetPasswordToken -resetPasswordExpire -refreshToken");

  res.status(200).json({
    success: true,
    message: "Profile updated successfully.",
    user,
  });
});

// =============================================
// @route   PUT /api/auth/change-password
// @access  Private
// =============================================
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    res.status(400);
    throw new Error("Current password and new password are required.");
  }

  if (newPassword.length < 6) {
    res.status(400);
    throw new Error("New password must be at least 6 characters.");
  }

  // ---- Get user with password and history ----
  const user = await User.findById(req.user._id).select("+password passwordHistory");

  // ---- Verify current password ----
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    res.status(401);
    throw new Error("Current password is incorrect.");
  }

  // ---- Prevent reusing current password ----
  const isReusedCurrent = await user.comparePassword(newPassword);
  if (isReusedCurrent) {
    res.status(400);
    throw new Error("New password cannot be the same as the current password.");
  }

  // ---- Prevent reusing any of the last 5 passwords ----
  for (const oldHash of user.passwordHistory || []) {
    const isReused = await bcrypt.compare(newPassword, oldHash);
    if (isReused) {
      res.status(400);
      throw new Error("You cannot reuse any of your last 5 passwords.");
    }
  }

  // ---- Add current password to history ----
  if (!user.passwordHistory) {
    user.passwordHistory = [];
  }
  user.passwordHistory.push(user.password);
  if (user.passwordHistory.length > 5) {
    user.passwordHistory.shift();
  }

  user.password = newPassword;
  await user.save();

  res.status(200).json({
    success: true,
    message: "Password changed successfully.",
  });
});

// =============================================
// @route   POST /api/auth/add-address
// @access  Private
// =============================================
const addAddress = asyncHandler(async (req, res) => {
  const { label, street, city, state, pincode, isDefault } = req.body;

  if (!street || !city || !state || !pincode) {
    res.status(400);
    throw new Error("Street, city, state and pincode are required.");
  }

  const user = await User.findById(req.user._id);

  // ---- If new address is default, unset all others ----
  if (isDefault) {
    user.addresses.forEach((addr) => {
      addr.isDefault = false;
    });
  }

  user.addresses.push({ label, street, city, state, pincode, isDefault: !!isDefault });
  await user.save();

  res.status(201).json({
    success: true,
    message: "Address added successfully.",
    addresses: user.addresses,
  });
});

// =============================================
// @route   PUT /api/auth/addresses/:addressId
// @access  Private
// =============================================
const updateAddress = asyncHandler(async (req, res) => {
  const { addressId } = req.params;
  const { label, street, city, state, pincode, isDefault } = req.body;

  const user = await User.findById(req.user._id);
  const address = user.addresses.id(addressId);

  if (!address) {
    res.status(404);
    throw new Error("Address not found.");
  }

  // ---- If marking as default, unset all others ----
  if (isDefault) {
    user.addresses.forEach((addr) => {
      addr.isDefault = false;
    });
  }

  if (label !== undefined) address.label = label;
  if (street !== undefined) address.street = street;
  if (city !== undefined) address.city = city;
  if (state !== undefined) address.state = state;
  if (pincode !== undefined) address.pincode = pincode;
  if (isDefault !== undefined) address.isDefault = isDefault;

  await user.save();

  res.status(200).json({
    success: true,
    message: "Address updated successfully.",
    addresses: user.addresses,
  });
});

// =============================================
// @route   DELETE /api/auth/addresses/:addressId
// @access  Private
// =============================================
const deleteAddress = asyncHandler(async (req, res) => {
  const { addressId } = req.params;

  const user = await User.findById(req.user._id);
  const addressIndex = user.addresses.findIndex(
    (addr) => addr._id.toString() === addressId
  );

  if (addressIndex === -1) {
    res.status(404);
    throw new Error("Address not found.");
  }

  user.addresses.splice(addressIndex, 1);
  await user.save();

  res.status(200).json({
    success: true,
    message: "Address deleted successfully.",
    addresses: user.addresses,
  });
});

// =============================================
// @route   POST /api/auth/wishlist/:productId
// @access  Private
// =============================================
const toggleWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const user = await User.findById(req.user._id);

  const index = user.wishlist.indexOf(productId);
  let message;

  if (index === -1) {
    user.wishlist.push(productId);
    message = "Product added to wishlist.";
  } else {
    user.wishlist.splice(index, 1);
    message = "Product removed from wishlist.";
  }

  await user.save();

  res.status(200).json({
    success: true,
    message,
    wishlist: user.wishlist,
  });
});

module.exports = {
  register,
  login,
  logout,
  refreshToken,
  forgotPassword,
  resetPassword,
  getMe,
  updateProfile,
  changePassword,
  addAddress,
  updateAddress,
  deleteAddress,
  toggleWishlist,
};
