require("dotenv").config();

const dns = require("node:dns");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("node:path");
const session = require("express-session");
const MongoStore = require("connect-mongo").default;

const userRoutes = require("./routes/userRoutes");
const tripRoutes = require("./routes/tripRoutes");
const adminRoutes = require("./routes/adminRoutes");
const destinationRoutes = require("./routes/destinationRoutes");
const profileRoutes = require("./routes/profileRoutes");
const organizerRoutes = require("./routes/organizerRoutes");
const verificationRoutes = require("./routes/verificationRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const chatRoutes = require("./routes/chatRoutes");
const reportRoutes = require("./routes/reportRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const appealRoutes = require("./routes/appealRoutes");
const { errorHandler } = require("./middleware/errorMiddleware");
const seedDestinations = require("./services/seedDestinations");

if (!process.env.MONGODB_URI) {
  throw new Error("MONGODB_URI must be configured before starting the server.");
}
if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET must be configured before starting the server.");
}

dns.setServers(
  (process.env.DNS_SERVERS || "1.1.1.1,8.8.8.8")
    .split(",")
    .map((server) => server.trim())
    .filter(Boolean)
);

const app = express();

app.set("trust proxy", 1);

const allowedOrigins = [
  ...(process.env.NODE_ENV === "production"
    ? []
    : [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:4173",
      "http://127.0.0.1:4173",
    ]),
  ...(process.env.CORS_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
];

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      if (
        allowedOrigins.includes(origin)
      ) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Cookie"],
  })
);

app.use(express.json({
  limit: "10mb",
  verify: (req, res, buffer) => {
    if (req.originalUrl.startsWith("/payments/razorpay/webhook")) {
      req.rawBody = Buffer.from(buffer);
    }
  },
}));
app.use(express.urlencoded({ extended: true }));
app.use(
  "/uploads/profiles",
  express.static(path.join(__dirname, "uploads", "profiles"), {
    maxAge: "7d",
    immutable: true,
    fallthrough: false,
    setHeaders: (res) => res.setHeader("X-Content-Type-Options", "nosniff"),
  })
);

// Session
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 1 day
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
  })
);

// Routes
app.use("/auth", userRoutes);
app.use("/users", userRoutes);
app.use("/trips", tripRoutes);
app.use("/admin", adminRoutes);
app.use("/destinations", destinationRoutes);
app.use("/profile", profileRoutes);
app.use("/organizer", organizerRoutes);
app.use("/verification", verificationRoutes);
app.use("/reviews", reviewRoutes);
app.use("/payments", paymentRoutes);
app.use("/chat", chatRoutes);
app.use("/reports", reportRoutes);
app.use("/settings", settingsRoutes);
app.use("/appeals", appealRoutes);

// Test route
app.get("/", (req, res) => {
  res.json({
    message: "NexTour API is running",
  });
});

// Centralized Error Handling Middleware
app.use(errorHandler);

// MongoDB Connection & Server Start
const port = process.env.PORT || 5000;
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("MongoDB Connected Successfully");
    return seedDestinations().then(() => {
      app.listen(port, () => {
        console.log(`Server running on port ${port}`);
      });
    });
  })
  .catch((error) => {
    console.log("MongoDB connection error:", error);
  });