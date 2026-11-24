const adminMiddleware = (req, res, next) => {
  const user = req.authUser || req.session?.user;
  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized. Please login first.",
    });
  }

  if (user.role !== "Admin") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Admin rights required.",
    });
  }

  next();
};

module.exports = adminMiddleware;