// controllers/adminUserController.js

const User = require("../models/userSchme");
const Trip = require("../models/Trip");
const { asyncHandler } = require("../middleware/errorMiddleware");

const getAdminStats = asyncHandler(async (req, res) => {
  const organizerFilter = {
    $or: [
      { organizerVerified: true },
      { "organizer.isOrganizer": true, "organizer.status": "Approved" },
      { "organizer.status": "Approved" },
    ],
  };
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCMonth(monthStart.getUTCMonth() - 5);
  monthStart.setUTCHours(0, 0, 0, 0);
  const [
    totalUsers,
    totalOrganizers,
    totalAdmins,
    activeUsers,
    inactiveUsers,
    totalTrips,
    pendingTrips,
    approvedTrips,
    rejectedTrips,
    activeTrips,
    pendingJoinRequests,
    monthlyUsers,
    monthlyTrips,
    popularDestinations,
    activeOrganizers,
    joinedTrips,
    recentUsers,
    recentTrips,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments(organizerFilter),
    User.countDocuments({ role: "Admin" }),
    User.countDocuments({ isActive: true }),
    User.countDocuments({ isActive: false }),
    Trip.countDocuments(),
    Trip.countDocuments({ approvalStatus: "Pending" }),
    Trip.countDocuments({ approvalStatus: "Approved" }),
    Trip.countDocuments({ approvalStatus: "Rejected" }),
    Trip.countDocuments({ approvalStatus: "Approved", status: { $in: ["Open", "Ongoing"] } }),
    Trip.aggregate([
      { $unwind: "$joinRequests" },
      { $match: { "joinRequests.status": "Pending" } },
      { $count: "count" },
    ]),
    User.aggregate([
      { $match: { createdAt: { $gte: monthStart } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$createdAt", timezone: "UTC" } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Trip.aggregate([
      { $match: { createdAt: { $gte: monthStart } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$createdAt", timezone: "UTC" } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Trip.aggregate([
      { $match: { approvalStatus: "Approved" } },
      { $group: { _id: { $ifNull: ["$city", "$destination"] }, trips: { $sum: 1 } } },
      { $sort: { trips: -1, _id: 1 } },
      { $limit: 5 },
    ]),
    Trip.aggregate([
      { $group: { _id: "$organizer", trips: { $sum: 1 } } },
      { $sort: { trips: -1 } },
      { $limit: 5 },
      { $lookup: { from: User.collection.name, localField: "_id", foreignField: "_id", as: "organizer" } },
      { $unwind: "$organizer" },
      { $project: { _id: "$organizer._id", name: "$organizer.fullName", trips: 1 } },
    ]),
    Trip.aggregate([
      { $match: { approvalStatus: "Approved" } },
      { $project: { title: 1, destination: 1, city: 1, members: { $size: { $filter: { input: { $ifNull: ["$members", []] }, as: "member", cond: { $eq: ["$$member.role", "TripMate"] } } } } } },
      { $sort: { members: -1, title: 1 } },
      { $limit: 5 },
    ]),
    User.find().select("fullName createdAt").sort({ createdAt: -1 }).limit(5).lean(),
    Trip.find().select("title createdAt approvalStatus").sort({ createdAt: -1 }).limit(5).lean(),
  ]);

  res.status(200).json({
    success: true,
    stats: {
      totalUsers,
      totalOrganizers,
      totalAdmins,
      activeUsers,
      inactiveUsers,
      totalTrips,
      pendingTrips,
      approvedTrips,
      rejectedTrips,
      activeTrips,
      pendingJoinRequests: pendingJoinRequests[0]?.count || 0,
      monthlyUsers,
      monthlyTrips,
      popularDestinations,
      activeOrganizers,
      mostJoinedTrips: joinedTrips,
      recentActivity: [
        ...recentUsers.map((user) => ({
          type: "user",
          title: `${user.fullName || "A user"} joined NexTour`,
          createdAt: user.createdAt,
        })),
        ...recentTrips.map((trip) => ({
          type: "trip",
          title: `${trip.title || "A trip"} was created`,
          status: trip.approvalStatus,
          createdAt: trip.createdAt,
        })),
      ].sort((first, second) => new Date(second.createdAt) - new Date(first.createdAt)).slice(0, 8),
    },
  });
});


const getAllUsers = asyncHandler(async (req, res) => {
  const { search, role, status } = req.query;

  const query = {};
  const filters = [];

  if (search) {
    const normalizedSearch = String(search).slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const searchRegex = new RegExp(normalizedSearch, "i");
    filters.push({ $or: [{ fullName: searchRegex }, { email: searchRegex }] });
  }

  if (role && !["User", "Admin", "Organizer"].includes(role)) {
    return res.status(400).json({
      success: false,
      message: "Role must be User, Organizer, or Admin.",
    });
  }

  if (role === "Organizer") {
    filters.push({
      $or: [
        { organizerVerified: true },
        { "organizer.isOrganizer": true, "organizer.status": "Approved" },
        { "organizer.status": "Approved" },
      ],
    });
  } else if (role) {
    query.role = role;
  }

  if (filters.length) query.$and = filters;

  if (status === "active") {
    query.isActive = true;
  } else if (status === "inactive") {
    query.isActive = false;
  }

  const users = await User.find(query)
    .select("-password")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: users.length,
    users,
  });
});


const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id).select("-password");

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found.",
    });
  }

  res.status(200).json({
    success: true,
    user,
  });
});


const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { fullName, email, profileImage, role, isActive } = req.body;

  const user = await User.findById(id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found.",
    });
  }

  // Check unique email if email is being changed
  if (email && email.toLowerCase() !== user.email.toLowerCase()) {
    const existingUser = await User.findOne({
      email: email.toLowerCase(),
      _id: { $ne: id },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email address is already in use by another account.",
      });
    }
    user.email = email.toLowerCase();
  }

  if (fullName) user.fullName = fullName;
  if (profileImage !== undefined) user.profileImage = profileImage;

  if (role && ["User", "Admin"].includes(role)) {
    user.role = role;
  }

  if (isActive !== undefined) {
    // Admin self-deactivation check
    if (req.session.user.id === id && isActive === false) {
      return res.status(400).json({
        success: false,
        message: "Admin cannot deactivate their own account.",
      });
    }
    user.isActive = Boolean(isActive);
  }

  const updatedUser = await user.save();
  const userResponse = updatedUser.toObject();
  delete userResponse.password;

  res.status(200).json({
    success: true,
    message: "User information updated successfully.",
    user: userResponse,
  });
});


const changeUserRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!role || !["User", "Admin"].includes(role)) {
    return res.status(400).json({
      success: false,
      message: "Invalid role. Role must be 'User' or 'Admin'.",
    });
  }

  const user = await User.findById(id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found.",
    });
  }

  user.role = role;
  await user.save();

  res.status(200).json({
    success: true,
    message: `User role changed to ${role} successfully.`,
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
    },
  });
});


const changeUserStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;

  if (isActive === undefined) {
    return res.status(400).json({
      success: false,
      message: "isActive field is required.",
    });
  }

  // Constraint: Admin cannot deactivate their own account
  if (req.session.user.id === id && (isActive === false || isActive === "false")) {
    return res.status(400).json({
      success: false,
      message: "Admin cannot deactivate their own account.",
    });
  }

  const user = await User.findById(id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found.",
    });
  }

  user.isActive = Boolean(isActive);
  await user.save();

  res.status(200).json({
    success: true,
    message: `User account has been ${user.isActive ? "activated" : "deactivated"} successfully.`,
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      isActive: user.isActive,
    },
  });
});

const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Constraint: Admin cannot delete their own account
  if (req.session.user.id === id) {
    return res.status(400).json({
      success: false,
      message: "Admin cannot delete their own account.",
    });
  }

  const user = await User.findById(id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found.",
    });
  }

  await User.findByIdAndDelete(id);

  res.status(200).json({
    success: true,
    message: "User account deleted successfully.",
  });
});


const getUserTrips = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id).select("fullName email profileImage role");

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found.",
    });
  }

  // Trips created by user
  const createdTrips = await Trip.find({ organizer: id })
    .populate("members.user", "fullName email profileImage")
    .sort({ createdAt: -1 });

  // Trips joined by user (where user is member but not organizer)
  const joinedTrips = await Trip.find({
    organizer: { $ne: id },
    "members.user": id,
  })
    .populate("organizer", "fullName email profileImage")
    .populate("members.user", "fullName email profileImage")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    user,
    createdTripsCount: createdTrips.length,
    createdTrips,
    joinedTripsCount: joinedTrips.length,
    joinedTrips,
  });
});

module.exports = {
  getAdminStats,
  getAllUsers,
  getUserById,
  updateUser,
  changeUserRole,
  changeUserStatus,
  deleteUser,
  getUserTrips,
};
