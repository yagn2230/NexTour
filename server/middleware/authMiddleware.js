const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/userSchme");
const { asyncHandler } = require("./errorMiddleware");

const authMiddleware = asyncHandler(async (req, res, next) => {
  const authorization = req.get("authorization") || "";
  const [scheme, token] = authorization.trim().split(/\s+/);

  if (scheme === "Bearer" && token) {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: "JWT authentication is not configured.",
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: error.name === "TokenExpiredError" ? "Authentication token has expired." : "Invalid authentication token.",
      });
    }
    if (
      typeof decoded !== "object"
      || typeof decoded.id !== "string"
      || !mongoose.isObjectIdOrHexString(decoded.id)
    ) {
      return res.status(401).json({ success: false, message: "Invalid authentication token." });
    }

    const tokenUser = await User.findById(decoded.id).select("fullName email role isActive");
    if (!tokenUser || !tokenUser.isActive) {
      return res.status(401).json({ success: false, message: "Authentication account is unavailable." });
    }
    req.authUser = { id: tokenUser._id.toString(), role: tokenUser.role };
    if (req.session) {
      req.session.user = {
        id: tokenUser._id.toString(),
        fullName: tokenUser.fullName,
        email: tokenUser.email,
        role: tokenUser.role,
      };
    }
    return next();
  }

  if (req.session?.user?.id) {
    if (!mongoose.isObjectIdOrHexString(req.session.user.id)) {
      return res.status(401).json({ success: false, message: "Invalid login session." });
    }
    const sessionUser = await User.findById(req.session.user.id).select("fullName email role isActive");
    if (!sessionUser || !sessionUser.isActive) {
      return res.status(401).json({ success: false, message: "Authentication account is unavailable." });
    }
    req.authUser = { id: sessionUser._id.toString(), role: sessionUser.role };
    req.session.user = {
      id: sessionUser._id.toString(),
      fullName: sessionUser.fullName,
      email: sessionUser.email,
      role: sessionUser.role,
    };
    return next();
  }

  return res.status(401).json({
    success: false,
    message: "Unauthorized. Please login first.",
  });
});

authMiddleware.isAuthenticated = authMiddleware;

module.exports = authMiddleware;
module.exports.isAuthenticated = authMiddleware;
