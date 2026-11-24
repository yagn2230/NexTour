// models/Trip.js

const mongoose = require("mongoose");



const imageSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: [true, "Image URL is required"],
      trim: true,
    },

    publicId: {
      type: String,
      default: "",
      trim: true,
    },

    alt: {
      type: String,
      default: "Trip image",
      trim: true,
    },
  },
  { _id: false }
);


/* =========================================================
   MEMBER SCHEMA
   ========================================================= */

const memberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Member user is required"],
    },

    role: {
      type: String,
      enum: ["Organizer", "TripMate"],
      default: "TripMate",
    },

    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const joinRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: {
      type: String,
      trim: true,
      maxlength: [500, "Request message cannot exceed 500 characters"],
      default: "",
    },
    status: {
      type: String,
      enum: ["Pending", "Accepted", "Declined", "Cancelled"],
      default: "Pending",
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    respondedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);


/* =========================================================
   ACTIVITY SCHEMA
   ========================================================= */

const activitySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Activity title is required"],
      trim: true,
      maxlength: [150, "Activity title cannot exceed 150 characters"],
    },

    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: [
        1000,
        "Activity description cannot exceed 1000 characters",
      ],
    },

    location: {
      type: String,
      default: "",
      trim: true,
    },

    date: {
      type: Date,
    },

    startTime: {
      type: String,
      default: "",
      trim: true,
      match: [
        /^([01]\d|2[0-3]):([0-5]\d)$/,
        "Start time must be in HH:MM format",
      ],
    },

    endTime: {
      type: String,
      default: "",
      trim: true,
      match: [
        /^([01]\d|2[0-3]):([0-5]\d)$/,
        "End time must be in HH:MM format",
      ],
    },

    estimatedCost: {
      type: Number,
      default: 0,
      min: [0, "Estimated cost cannot be negative"],
    },

    category: {
      type: String,
      trim: true,
      maxlength: [50, "Activity category cannot exceed 50 characters"],
      default: "Other",
    },

    notes: {
      type: String,
      default: "",
      trim: true,
      maxlength: [1000, "Notes cannot exceed 1000 characters"],
    },
  },
  {
    _id: true,
  }
);


/* =========================================================
   ITINERARY DAY SCHEMA
   ========================================================= */

const itineraryDaySchema = new mongoose.Schema(
  {
    dayNumber: {
      type: Number,
      required: [true, "Day number is required"],
      min: [1, "Day number must be at least 1"],
    },

    date: {
      type: Date,
    },

    title: {
      type: String,
      default: "",
      trim: true,
      maxlength: [150, "Day title cannot exceed 150 characters"],
    },

    activities: {
      type: [activitySchema],
      default: [],
    },
  },
  {
    _id: true,
  }
);


/* =========================================================
   TRIP SCHEMA
   ========================================================= */

const tripSchema = new mongoose.Schema(
  {
    /* =====================================================
       BASIC INFORMATION
       ===================================================== */

    title: {
      type: String,
      required: [true, "Trip title is required"],
      trim: true,
      minlength: [3, "Trip title must be at least 3 characters"],
      maxlength: [150, "Trip title cannot exceed 150 characters"],
    },

    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: [3000, "Description cannot exceed 3000 characters"],
    },

    destination: {
      type: String,
      required: [true, "Destination is required"],
      trim: true,
      maxlength: [200, "Destination cannot exceed 200 characters"],
    },
    country: {
      type: String,
      trim: true,
      default: "",
    },
    state: {
      type: String,
      trim: true,
      default: "",
    },
    city: {
      type: String,
      trim: true,
      default: "",
    },
    famousPlaces: {
      type: [String],
      default: [],
    },


    /* =====================================================
       TRIP CATEGORY
       ===================================================== */

    category: {
      type: String,
      trim: true,
      required: [true, "Trip category is required"],
      maxlength: [50, "Trip category cannot exceed 50 characters"],
      default: "Other",
    },


    /* =====================================================
       TRIP IMAGES
       ===================================================== */

    // Main image of the trip
    coverImage: {
      type: imageSchema,
      required: [true, "Trip cover image is required"],
    },

    // Additional trip images
    images: {
      type: [imageSchema],
      default: [],
    },


    /* =====================================================
       TRIP DATES
       ===================================================== */

    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },

    endDate: {
      type: Date,
      required: [true, "End date is required"],
    },


    /* =====================================================
       BUDGET
       ===================================================== */

    totalBudget: {
      type: Number,
      required: [true, "Total budget is required"],
      min: [0, "Total budget cannot be negative"],
    },
    pricePerPerson: {
      type: Number,
      min: [0, "Price per person cannot be negative"],
      default: null,
    },


    /* =====================================================
       MEMBERS
       ===================================================== */

    currentMembers: {
      type: Number,
      default: 1,
      min: [1, "Current members must be at least 1"],
    },

    maxMembers: {
      type: Number,
      required: [true, "Maximum members is required"],
      min: [1, "Maximum members must be at least 1"],
    },


    /* =====================================================
       ORGANIZER
       ===================================================== */

    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Trip organizer is required"],
    },


    /* =====================================================
       TRIP MEMBERS
       ===================================================== */

    members: {
      type: [memberSchema],
      default: [],
    },

    joinRequests: {
      type: [joinRequestSchema],
      default: [],
    },


    /* =====================================================
       ITINERARY
       ===================================================== */

    itinerary: {
      type: [itineraryDaySchema],
      default: [],
    },


    /* =====================================================
       TRANSPORTATION
       ===================================================== */

    transportation: {
      type: String,
      enum: [
        "Car",
        "Bus",
        "Train",
        "Flight",
        "Bike",
        "Other",
      ],
      default: "Other",
    },


    /* =====================================================
       HOTEL PREFERENCE
       ===================================================== */

    hotelPreference: {
      type: String,
      enum: [
        "Budget",
        "Standard",
        "Luxury",
      ],
      default: "Budget",
    },


    /* =====================================================
       FOOD PREFERENCE
       ===================================================== */

    foodPreference: {
      type: String,
      enum: [
        "Veg",
        "Non-Veg",
        "Both",
      ],
      default: "Both",
    },


    /* =====================================================
       ACTIVITY PREFERENCE
       ===================================================== */

    activityPreference: {
      type: String,
      default: "",
      trim: true,
      maxlength: [
        500,
        "Activity preference cannot exceed 500 characters",
      ],
    },


    /* =====================================================
       APPROVAL STATUS
       ===================================================== */

    approvalStatus: {
      type: String,
      enum: [
        "Pending",
        "Approved",
        "Rejected",
      ],
      default: "Pending",
    },


    /* =====================================================
       TRIP STATUS
       ===================================================== */

    status: {
      type: String,
      enum: [
        "Open",
        "Full",
        "Ongoing",
        "Completed",
        "Cancelled",
      ],
      default: "Open",
    },


    /* =====================================================
       PUBLIC / PRIVATE
       ===================================================== */

    isPublic: {
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
  },

  /* =======================================================
     TIMESTAMPS
     ======================================================= */

  {
    timestamps: true,
  }
);


/* =========================================================
   VALIDATION
   ========================================================= */

// Validate dates and members
tripSchema.pre("validate", function () {
  // End date cannot be before start date
  if (
    this.startDate &&
    this.endDate &&
    this.endDate < this.startDate
  ) {
    throw new Error("End date must be greater than or equal to start date");
  }

  // Max members cannot be smaller than current members
  if (
    this.maxMembers &&
    this.currentMembers &&
    this.maxMembers < this.currentMembers
  ) {
    throw new Error("Maximum members cannot be less than current members");
  }
});


/* =========================================================
   AUTOMATIC MEMBER COUNT
   ========================================================= */

tripSchema.pre("save", function () {
  if (this.members) {
    this.currentMembers = this.members.length;
  }
});


/* =========================================================
   AUTOMATIC FULL STATUS
   ========================================================= */

tripSchema.pre("save", function () {
  if (["Ongoing", "Completed", "Cancelled"].includes(this.status)) {
    return;
  }

  if (this.currentMembers >= this.maxMembers) {
    this.status = "Full";
  } else if (this.status === "Full") {
    this.status = "Open";
  }
});


/* =========================================================
   DATABASE INDEXES
   ========================================================= */

// Destination search
tripSchema.index({
  destination: 1,
});

// Category filtering
tripSchema.index({
  category: 1,
});

// Date filtering
tripSchema.index({
  startDate: 1,
  endDate: 1,
});

// Budget filtering
tripSchema.index({
  totalBudget: 1,
});

// Approval filtering
tripSchema.index({
  approvalStatus: 1,
});

// Status filtering
tripSchema.index({
  status: 1,
});

// Public trips
tripSchema.index({
  isPublic: 1,
});

// Organizer trips
tripSchema.index({
  organizer: 1,
});

// Common NexTour search combination
tripSchema.index({
  destination: 1,
  category: 1,
  startDate: 1,
});


/* =========================================================
   MODEL
   ========================================================= */

const Trip = mongoose.model("Trip", tripSchema);

module.exports = Trip;