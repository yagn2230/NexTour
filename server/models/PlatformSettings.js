const mongoose = require("mongoose");
const defaultTripCategories = require("../config/defaultTripCategories");

const platformSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, enum: ["main"], default: "main", unique: true },
    termsAndConditions: { type: String, trim: true, default: "", maxlength: 50000 },
    privacyPolicy: { type: String, trim: true, default: "", maxlength: 50000 },
    contactEmail: { type: String, trim: true, lowercase: true, default: "", maxlength: 254 },
    contactPhone: { type: String, trim: true, default: "", maxlength: 30 },
    supportUrl: { type: String, trim: true, default: "", maxlength: 500 },
    tripCategories: {
      type: [{ type: String, trim: true, maxlength: 50 }],
      default: () => [...defaultTripCategories],
      validate: {
        validator: (categories) => categories.length > 0
          && categories.length <= 50
          && new Set(categories.map((category) => category.toLowerCase())).size === categories.length,
        message: "Trip categories must contain between 1 and 50 unique values.",
      },
    },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PlatformSettings", platformSettingsSchema);
