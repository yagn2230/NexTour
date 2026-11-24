const User = require("../models/userSchme");
const { asyncHandler } = require("./errorMiddleware");

const organizerMiddleware = asyncHandler(async (req, res, next) => {
  const userId = req.session?.user?.id || req.authUser?.id;
  const user = userId ? await User.findById(userId).select("organizerVerified organizer") : null;
  const status = user?.organizer?.status;
  const verified = status === "Approved"
    || (user?.organizerVerified && status !== "Pending" && status !== "Rejected");

  if (!verified) {
    return res.status(403).json({
      success: false,
      message: "Organizer verification required.",
    });
  }

  next();
});

module.exports = organizerMiddleware;
