const organizerMiddleware = require("./organizerMiddleware");

const organizerAccessMiddleware = (req, res, next) => {
  if (req.authUser?.role === "Admin") return next();
  return organizerMiddleware(req, res, next);
};

module.exports = organizerAccessMiddleware;
