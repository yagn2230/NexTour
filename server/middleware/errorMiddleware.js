// middleware/errorMiddleware.js

// Wrapper for async routes to catch errors automatically
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Centralized Express Error Handler
const errorHandler = (err, req, res, next) => {
  console.error("Error Log:", err);

  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";

  // Mongoose Bad ObjectId (CastError)
  if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid resource ID format: ${err.value}`;
  }

  if (err.code === 11000) {
    statusCode = 409;
    message = "A record with this value already exists.";
  }

  // Mongoose Validation Error
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((val) => val.message)
      .join(", ");
  }

  if (err.name === "MulterError") {
    statusCode = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    message = err.code === "LIMIT_FILE_SIZE"
      ? "Uploaded file exceeds the allowed size."
      : err.message;
  } else if (err.message?.startsWith("Only JPEG")
    || err.message?.startsWith("Verification files must")
    || err.message?.startsWith("Appeal evidence must")) {
    statusCode = 400;
  }

  if (statusCode >= 500 && process.env.NODE_ENV !== "development") {
    message = "Internal Server Error";
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

module.exports = {
  asyncHandler,
  errorHandler,
};
