const mongoose = require("mongoose");

const destinationSchema = new mongoose.Schema(
  {
    country: {
      type: String,
      required: true,
      trim: true,
    },
    state: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    famousPlaces: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

destinationSchema.index({ country: 1, state: 1, city: 1 }, { unique: true });

module.exports = mongoose.model("Destination", destinationSchema);
