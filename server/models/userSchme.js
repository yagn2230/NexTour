// models/User.js

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const organizerDocumentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    mimeType: { type: String, required: true, trim: true },
    url: { type: String, required: true },
  },
  { _id: false }
);

const organizerSchema = new mongoose.Schema(
  {
    isOrganizer: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["Not Applied", "Pending", "Approved", "Rejected"],
      default: "Not Applied",
    },
    experience: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000,
    },
    reason: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000,
    },
    documents: {
      type: [organizerDocumentSchema],
      default: [],
    },
    appliedAt: {
      type: Date,
      default: null,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

const notificationSchema = new mongoose.Schema(
  {
    type: { type: String, required: true, trim: true, maxlength: 50 },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    detail: { type: String, required: true, trim: true, maxlength: 500 },
    relatedTrip: { type: mongoose.Schema.Types.ObjectId, ref: "Trip", default: null },
    readAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    username: {
      type: String,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 30,
      match: [/^[a-z0-9_]+$/, "Username can contain only letters, numbers, and underscores"],
      sparse: true,
      unique: true,
    },

    password: {
      type: String,
      required: true,
    },

    profileImage: {
      type: String,
      default: "",
    },

    phone: { type: String, trim: true, default: "", maxlength: 30 },
    bio: { type: String, trim: true, default: "", maxlength: 1000 },
    coverImage: { type: String, default: "" },
    location: { type: String, trim: true, default: "", maxlength: 200 },
    city: { type: String, trim: true, default: "", maxlength: 100 },
    country: { type: String, trim: true, default: "", maxlength: 100 },
    gender: { type: String, trim: true, default: "", maxlength: 50 },
    dob: { type: Date, default: null },
    languages: { type: [String], default: [] },
    travelPreferences: { type: [String], default: [] },
    gallery: {
      type: [{ type: String, trim: true, maxlength: 1000 }],
      default: [],
      validate: [(images) => images.length <= 30, "Gallery cannot contain more than 30 images."],
    },
    socialLinks: {
      website: { type: String, trim: true, default: "" },
      instagram: { type: String, trim: true, default: "" },
      facebook: { type: String, trim: true, default: "" },
      linkedin: { type: String, trim: true, default: "" },
    },
    emergencyContact: {
      name: { type: String, trim: true, default: "" },
      phone: { type: String, trim: true, default: "" },
      relationship: { type: String, trim: true, default: "" },
    },
    badges: { type: [String], default: [] },
    achievements: { type: [String], default: [] },
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: "Trip" }],
    joinedTrips: [{ type: mongoose.Schema.Types.ObjectId, ref: "Trip" }],
    createdTrips: [{ type: mongoose.Schema.Types.ObjectId, ref: "Trip" }],
    reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: "Review" }],
    notifications: {
      type: [notificationSchema],
      default: [],
    },
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalTripsJoined: { type: Number, default: 0, min: 0 },
    noShowCount: { type: Number, default: 0, min: 0 },
    noShowRestrictedUntil: { type: Date, default: null },
    totalTripsCreated: { type: Number, default: 0, min: 0 },
    countriesVisited: { type: [String], default: [] },
    citiesVisited: { type: [String], default: [] },
    totalDistance: { type: Number, default: 0, min: 0 },
    travelPoints: { type: Number, default: 0, min: 0 },
    isOrganizer: { type: Boolean, default: false },
    organizerVerified: { type: Boolean, default: false },
    organizerVerificationStatus: {
      type: String,
      enum: ["Not Applied", "Pending", "Approved", "Rejected"],
      default: "Not Applied",
    },
    memberSince: { type: Date, default: Date.now },

    role: {
      type: String,
      enum: ["User", "Admin"],
      default: "User",
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    organizer: {
      type: organizerSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);
module.exports = User;